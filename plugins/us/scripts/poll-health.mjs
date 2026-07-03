#!/usr/bin/env node
/**
 * SquaredUp health watcher — the "wake" half of the Claude Code Monitors integration.
 *
 * Declared by the `squaredup-health` monitor in ../monitors/monitors.json, this script runs
 * for the lifetime of a Claude Code session and prints ONE LINE OF JSON TO STDOUT every time a
 * workspace's rolled-up health changes. Each stdout line is delivered to Claude as a
 * notification, which wakes it to run the auto-RCA playbook (see the `health-rca` skill).
 *
 * Design rules that matter here:
 *   - STDOUT is the wake channel. Print to stdout ONLY on a real change, never per poll, or
 *     you bury the human in notifications (the alert-fatigue problem we are solving).
 *   - STDERR is for diagnostics. Anything on stderr is NOT a notification, so misconfiguration
 *     and poll errors go there and never wake Claude.
 *   - First poll establishes a baseline SILENTLY — we only emit on transitions.
 *   - SAFE BY DEFAULT. With no configuration the watcher idles quietly. It NEVER invents a
 *     fake incident on a real install; the scripted demo is explicit opt-in (mode=demo).
 *   - Zero dependencies. Ships inside a plugin with no install step, so it uses only Node
 *     built-ins (global fetch + AbortSignal.timeout, available on Node 18+).
 *
 * Auth: the hosted MCP server uses browser OAuth, but a background process cannot do an
 * interactive OAuth dance, and SquaredUp's API has no machine-to-machine (client_credentials)
 * grant. The supported headless credential is a SquaredUp **API key** (Settings -> API Keys;
 * the tenant tier must include API access). It is sent as the `apikey` request header against
 * the regional public API, exactly as SquaredUp's own automation scripts do.
 *
 * Configuration (environment variables — nothing is stored in plugin config files):
 *   SQUAREDUP_HEALTH_MODE    "auto" (default) | "live" | "demo" | "off"
 *                            auto = live if an API key is set, otherwise idle quietly.
 *                            (Back-compat aliases: "rest"->live, "mock"->demo.)
 *   SQUAREDUP_API_KEY        SquaredUp API key. Required for live polling. Read from the
 *                            environment only — never pass secrets on the command line.
 *   SQUAREDUP_REGION         "eu" (default for this plugin) | "us" | "uk" | "preprod" | "dev".
 *                            Picks the API base when SQUAREDUP_API_BASE is not set. The region
 *                            is also stamped onto every event so multi-region setups route the
 *                            RCA to the matching squaredup-* MCP server. CLI --region wins.
 *   SQUAREDUP_API_BASE       Full API base override, e.g. https://eu.api.squaredup.com/api
 *   SQUAREDUP_POLL_SECONDS   Live poll interval (default 60, floor 15).
 *   SQUAREDUP_WORKSPACE_IDS  Optional comma-separated allow-list of workspace IDs to watch
 *                            (default: every workspace the API key can see).
 *
 *   demo mode only (all optional, for the "killer demo"):
 *   SQUAREDUP_DEMO_DELAY_SECONDS    seconds until the scripted incident fires (default 8)
 *   SQUAREDUP_DEMO_RECOVER_SECONDS  seconds the incident lasts before recovery (default 62)
 *   SQUAREDUP_DEMO_WORKSPACE_ID / _NAME / _NODE_ID / _NODE_NAME / _SOURCE_TYPE / _REASON
 */

/* ------------------------------------------------------------------ configuration ------- */

function argValue(flag) {
    const i = process.argv.indexOf(flag);
    return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

const RAW_MODE = (process.env.SQUAREDUP_HEALTH_MODE || 'auto').toLowerCase();
const MODE = RAW_MODE === 'rest' ? 'live' : RAW_MODE === 'mock' ? 'demo' : RAW_MODE;

const REGION = (argValue('--region') || process.env.SQUAREDUP_REGION || 'eu').toLowerCase();
const API_KEY = process.env.SQUAREDUP_API_KEY || '';
const POLL_MS = Math.max(15, Number(process.env.SQUAREDUP_POLL_SECONDS) || 60) * 1000;
const WORKSPACE_ALLOWLIST = (process.env.SQUAREDUP_WORKSPACE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Regional public API bases. The `/api` suffix is the API-key surface (not the per-tenant app path). */
const REGION_BASES = {
    eu: 'https://eu.api.squaredup.com/api',
    us: 'https://api.squaredup.com/api',
    uk: 'https://uk.api.squaredup.com/api',
    preprod: 'https://preprod.api.squaredup.com/api',
    dev: 'https://dev.api.squaredup.com/api'
};
const API_BASE = (process.env.SQUAREDUP_API_BASE || REGION_BASES[REGION] || REGION_BASES.us).replace(/\/+$/, '');

/** Health states worth waking Claude for. (Full enum: unmonitored|unknown|success|warning|error.) */
const UNHEALTHY = new Set(['error', 'warning']);

/* ------------------------------------------------------------------ io helpers ---------- */

function emit(event) {
    // The ONLY place we write to stdout. One compact JSON object per line.
    process.stdout.write(`${JSON.stringify({ v: 1, ...event })}\n`);
}

function diag(message) {
    process.stderr.write(`[squaredup-health] ${message}\n`);
}

function nowIso() {
    return new Date().toISOString();
}

/** stateReason can be a string or a HealthStateReason object; coerce to a readable line. */
function reasonText(reason) {
    if (!reason) {
        return null;
    }
    if (typeof reason === 'string') {
        return reason;
    }
    return reason.text ?? reason.message ?? reason.reason ?? null;
}

/* ------------------------------------------------------------------ change detection ---- */

/**
 * workspaceId -> last observed { state, name, workspaceNodeId }. Lets us emit only on change,
 * and remembers the name/node so we can still describe a workspace that has RECOVERED (see below).
 */
const lastStates = new Map();
/** First reconcile is a silent baseline. */
let baselineEstablished = false;

/**
 * Pick the tile that best explains a workspace being unhealthy: error before warning, then most
 * recently changed. Returns undefined when there are no unhealthy tiles (e.g. a workspace-level
 * monitor, or tile detail not returned).
 */
function primaryCause(causes) {
    return [...causes].sort((a, b) => {
        const aErr = a.state === 'error' ? 1 : 0;
        const bErr = b.state === 'error' ? 1 : 0;
        if (aErr !== bErr) {
            return bErr - aErr;
        }
        return (b.lastChanged ?? 0) - (a.lastChanged ?? 0);
    })[0];
}

/**
 * Build and emit one `health_change` wake line for a workspace transition. Works for both a
 * live/degraded snapshot entry and a synthesised recovery (state 'success', empty causes).
 * A snapshot entry looks like:
 *   { workspaceId, workspaceName, workspaceNodeId, state,
 *     causes: [{ tileId, tileName, dashId, configId, dashboardNodeId, workspaceNodeId,
 *                state, scalar, formattedScalar, stateReason, lastChanged }] }
 */
function emitChange(ws, previous) {
    const causes = ws.causes ?? [];
    const cause = primaryCause(causes);
    const transition = UNHEALTHY.has(ws.state)
        ? 'degraded'
        : previous && UNHEALTHY.has(previous)
          ? 'recovered'
          : 'changed';

    emit({
        event: 'health_change',
        region: REGION,
        detectedAt: nowIso(),
        workspaceId: ws.workspaceId,
        workspaceName: ws.workspaceName ?? ws.workspaceId,
        // The failing monitor to investigate. The health API exposes no per-tile graph node, so
        // nodeId is the closest real graph node — the dashboard, else the workspace — ready to feed
        // into graph_query. Use tileId/dashboardId to resolve the tile's monitored scope (tile_get).
        nodeId: cause?.dashboardNodeId ?? ws.workspaceNodeId ?? cause?.workspaceNodeId ?? cause?.tileId ?? ws.workspaceId,
        nodeName: cause?.tileName ?? ws.workspaceName ?? ws.workspaceId,
        workspaceNodeId: ws.workspaceNodeId ?? cause?.workspaceNodeId ?? null,
        dashboardNodeId: cause?.dashboardNodeId ?? null,
        tileId: cause?.tileId ?? null,
        dashboardId: cause?.dashId ?? null,
        previous: previous ?? 'unknown',
        current: ws.state,
        transition,
        stateReason: reasonText(cause?.stateReason),
        scalar: cause?.formattedScalar ?? cause?.scalar ?? null,
        // The failing monitor's own last state-change time (epoch ms -> ISO), so RCA pulls data
        // around when it actually broke, not just when we noticed.
        changedAt: cause?.lastChanged ? new Date(cause.lastChanged).toISOString() : null,
        // Every unhealthy tile under this workspace, so RCA can correlate a multi-tile incident.
        causes: causes.map((c) => ({
            tileId: c.tileId ?? null,
            tileName: c.tileName ?? null,
            dashboardId: c.dashId ?? null,
            dashboardNodeId: c.dashboardNodeId ?? null,
            state: c.state,
            scalar: c.formattedScalar ?? c.scalar ?? null,
            stateReason: reasonText(c.stateReason)
        }))
    });
}

/**
 * Compare a fresh snapshot against what we last saw and emit on every real change.
 *
 * The `/healthrollup/workspaces` endpoint returns ONLY currently-unhealthy workspaces — a healthy
 * one is simply absent. So a workspace that DROPS OUT of the snapshot since last poll has recovered,
 * and we synthesise the 'recovered' all-clear from the name/node we remembered.
 */
function reconcile(snapshot) {
    const remember = (ws) =>
        lastStates.set(ws.workspaceId, {
            state: ws.state,
            name: ws.workspaceName,
            workspaceNodeId: ws.workspaceNodeId ?? lastStates.get(ws.workspaceId)?.workspaceNodeId ?? null
        });

    if (!baselineEstablished) {
        for (const ws of snapshot) {
            remember(ws);
        }
        baselineEstablished = true;
        diag(`baseline established (${snapshot.length} unhealthy workspace(s)); watching for changes`);
        return;
    }

    const seen = new Set();
    for (const ws of snapshot) {
        seen.add(ws.workspaceId);
        const previous = lastStates.get(ws.workspaceId)?.state;
        remember(ws);
        if (previous !== ws.state) {
            emitChange(ws, previous);
        }
    }

    // Recovery by omission: anything we last saw unhealthy but is no longer in the snapshot.
    for (const [wsId, prev] of lastStates) {
        if (seen.has(wsId) || !UNHEALTHY.has(prev.state)) {
            continue;
        }
        lastStates.set(wsId, { ...prev, state: 'success' });
        emitChange(
            { workspaceId: wsId, workspaceName: prev.name, workspaceNodeId: prev.workspaceNodeId, state: 'success', causes: [] },
            prev.state
        );
    }
}

/* ------------------------------------------------------------------ live mode ----------- */

async function apiFetch(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            apikey: API_KEY,
            accept: 'application/json',
            ...(body ? { 'content-type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(Math.min(POLL_MS - 1000, 20000))
    });
    if (!res.ok) {
        throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}`);
    }
    return res.json();
}

/** Unwrap the common envelope shapes the API may use ({data:[...]}, {workspaces:[...]}, or a bare array). */
function asArray(body, ...keys) {
    if (Array.isArray(body)) {
        return body;
    }
    for (const k of keys) {
        if (Array.isArray(body?.[k])) {
            return body[k];
        }
    }
    return [];
}

/** GET /workspaces -> [{ id, name }], filtered to the allow-list when one is configured. */
async function listWorkspaces() {
    const body = await apiFetch('/workspaces');
    const all = asArray(body, 'workspaces', 'data').map((w) => ({
        id: w.id ?? w.workspaceId,
        name: w.displayName ?? w.name ?? w.id ?? w.workspaceId
    }));
    const filtered = WORKSPACE_ALLOWLIST.length ? all.filter((w) => WORKSPACE_ALLOWLIST.includes(w.id)) : all;
    return filtered.filter((w) => w.id);
}

/**
 * POST /healthrollup/workspaces -> snapshot in reconcile() shape. includeTileStates surfaces the
 * unhealthy tiles; includeNodeIds adds the workspace/dashboard graph node ids (the RCA anchors).
 * The endpoint returns workspace names nowhere, so we join names from the workspace list.
 */
async function fetchHealthSnapshot(workspaces) {
    const nameById = new Map(workspaces.map((w) => [w.id, w.name]));
    const body = await apiFetch('/healthrollup/workspaces?includeNodeIds=true', {
        method: 'POST',
        body: {
            workspaceIds: workspaces.map((w) => w.id),
            includeTileStates: true,
            includeDashboardNames: true
        }
    });

    const workspaceStates = asArray(body, 'workspaceStates', 'data');
    return workspaceStates.map((ws) => {
        const tiles = asArray(ws.unhealthyTileStates).filter((t) => UNHEALTHY.has(t.state));
        return {
            workspaceId: ws.workspaceId,
            workspaceName: nameById.get(ws.workspaceId) ?? ws.workspaceName ?? ws.workspaceId,
            workspaceNodeId: ws.workspaceNodeId ?? null,
            state: ws.state ?? 'unknown',
            causes: tiles.map((t) => ({
                tileId: t.tileId ?? t.id ?? null,
                tileName: t.tileName ?? null,
                dashId: t.dashId ?? t.dashboardId ?? null,
                configId: t.configId ?? null,
                dashboardNodeId: t.dashboardNodeId ?? null,
                workspaceNodeId: t.workspaceNodeId ?? null,
                state: t.state,
                scalar: t.scalar ?? null,
                formattedScalar: t.formattedScalar ?? null,
                stateReason: t.stateReason ?? null,
                lastChanged: t.lastChanged ?? null
            }))
        };
    });
}

function startLive() {
    diag(`live mode: region=${REGION}, base=${API_BASE}, every ${POLL_MS / 1000}s`);
    const tick = async () => {
        try {
            const workspaces = await listWorkspaces();
            if (workspaces.length === 0) {
                diag('no workspaces visible to this API key; nothing to watch this poll');
                return;
            }
            reconcile(await fetchHealthSnapshot(workspaces));
        } catch (err) {
            // Auth/network/shape problems are diagnostics, never wake lines.
            diag(`poll error: ${err?.message ?? err}`);
        }
    };
    void tick();
    setInterval(tick, POLL_MS);
}

/* ------------------------------------------------------------------ demo mode ----------- */
/* Explicit opt-in (SQUAREDUP_HEALTH_MODE=demo). Scripts one incident + recovery with no config
 * so the full wake -> auto-RCA chain can be shown end to end. Never runs on a default install. */
function startDemo() {
    diag('demo mode: scripting a demo incident (no live data; set SQUAREDUP_HEALTH_MODE=live for real data)');

    const ws = {
        workspaceId: process.env.SQUAREDUP_DEMO_WORKSPACE_ID || 'space-prod',
        workspaceName: process.env.SQUAREDUP_DEMO_WORKSPACE_NAME || 'Production',
        workspaceNodeId: 'node-space-prod-demo'
    };
    const cause = {
        tileId: 'tile-checkout-latency',
        tileName: process.env.SQUAREDUP_DEMO_NODE_NAME || 'checkout-api p99 latency',
        dashId: 'dash-demo',
        dashboardNodeId: process.env.SQUAREDUP_DEMO_NODE_ID || 'node-dash-checkout-demo',
        workspaceNodeId: 'node-space-prod-demo',
        formattedScalar: '1,420 ms',
        stateReason: {
            text:
                process.env.SQUAREDUP_DEMO_REASON ||
                'checkout-api p99 latency is 1,420 ms, above the error threshold (800 ms)'
        },
        lastChanged: 0
    };
    const degradeMs = Math.max(1, Number(process.env.SQUAREDUP_DEMO_DELAY_SECONDS) || 8) * 1000;
    const recoverMs = degradeMs + Math.max(1, Number(process.env.SQUAREDUP_DEMO_RECOVER_SECONDS) || 62) * 1000;

    reconcile([{ ...ws, state: 'success', causes: [] }]); // silent baseline
    setTimeout(() => reconcile([{ ...ws, state: 'error', causes: [{ ...cause, state: 'error' }] }]), degradeMs);
    setTimeout(() => reconcile([{ ...ws, state: 'success', causes: [] }]), recoverMs);

    keepAlive();
}

/* ------------------------------------------------------------------ entry point --------- */

function keepAlive() {
    // A real poller never exits; hold the event loop open for the session's lifetime.
    setInterval(() => {}, 1 << 30);
}

diag(`starting (mode=${MODE}, region=${REGION})`);

if (MODE === 'off') {
    diag('disabled (SQUAREDUP_HEALTH_MODE=off); idling');
    keepAlive();
} else if (MODE === 'demo') {
    startDemo();
} else if (MODE === 'live') {
    if (API_KEY) {
        startLive();
    } else {
        diag('live mode needs SQUAREDUP_API_KEY; idling (no events will fire)');
        keepAlive();
    }
} else {
    // auto (default): only go live when a key is present, otherwise stay silent and safe.
    if (API_KEY) {
        startLive();
    } else {
        diag(
            'not configured; idling. Set SQUAREDUP_API_KEY (+ SQUAREDUP_REGION) to watch live health, ' +
                'or SQUAREDUP_HEALTH_MODE=demo to see the auto-RCA demo.'
        );
        keepAlive();
    }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => process.exit(0));
}
