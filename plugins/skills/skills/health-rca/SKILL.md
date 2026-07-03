---
name: health-rca
description: Use when a `squaredup-health` monitor notification arrives (a JSON line with `"event":"health_change"`) - the SquaredUp health watcher has detected a workspace/monitor changing state and Claude should automatically investigate. Drives root-cause analysis: walk the entity graph for the affected node, pull the relevant data streams around the failure time, and report likely cause + blast radius. Also handles the recovery ("all clear") case. Trigger: any background notification whose text contains `health_change` from the SquaredUp health monitor.
---

> **Region:** If more than one `squaredup-*` server is connected, use the server for the region named in the notification's `region` field (e.g. `eu`). Use that same server for every SquaredUp tool call in this investigation.

# Auto-RCA on a health change

A background monitor (`squaredup-health`) watches SquaredUp workspace/monitor health and emits a JSON line **only when a state changes**. When you receive one, you are expected to investigate _proactively_ — the human has not asked yet; you are getting ahead of them.

The notification looks like:

```json
{
    "v": 1,
    "event": "health_change",
    "region": "eu",
    "detectedAt": "2026-07-01T14:02:11.000Z",
    "workspaceId": "space-x5PPpU4X4pSJE560jqlo",
    "workspaceName": "Team Rocket",
    "nodeId": "node-dash-cmY7JJs67PM1VFSqaH6H",
    "nodeName": "Requests Served (k/min)",
    "workspaceNodeId": "node-levWugK4L...-x5PPpU4X4pSJE560jqlo",
    "dashboardNodeId": "node-dash-cmY7JJs67PM1VFSqaH6H",
    "tileId": "tile-mon-throughput",
    "dashboardId": "dash-cmY7JJs67PM1VFSqaH6H",
    "previous": "success",
    "current": "error",
    "transition": "degraded",
    "stateReason": "Requests Served (k/min) top is 87, which is greater than the error threshold 50.",
    "scalar": "87",
    "changedAt": "2026-07-01T13:58:24.254Z",
    "causes": [
        { "tileId": "tile-mon-throughput", "tileName": "Requests Served (k/min)", "dashboardId": "dash-cmY7JJs67PM1VFSqaH6H", "dashboardNodeId": "node-dash-cmY7JJs67PM1VFSqaH6H", "state": "error", "scalar": "87", "stateReason": "Requests Served (k/min) top is 87, which is greater than the error threshold 50." }
    ]
}
```

Field notes:

- The watcher fires on a **workspace's rolled-up health** changing. `nodeName` / `stateReason` / `scalar` / `tileId` describe the single monitor (tile) that best explains it — your entry point.
- **`stateReason` is usually the answer already** — a threshold breach with the measured value. **Read it first;** it tells you what crossed what.
- `nodeId` is the closest **graph node** to the failing monitor: the **dashboard** node (`dashboardNodeId`), or the **workspace** node (`workspaceNodeId`) when there's no tile detail. SquaredUp's health API exposes **no per-monitor graph node**, so `nodeId` is _not_ the database/host itself — to reach the monitored infrastructure you resolve the tile's scope (see step 2), don't just `graph_query` `nodeId` and expect the root cause.
- `changedAt` is when the monitor actually changed state; `detectedAt` is when the watcher noticed. Pull evidence around **`changedAt`**.
- `current` / `previous` are one of `error`, `warning`, `success`, `unknown`, `unmonitored`.
- `causes[]` lists **every** unhealthy tile under the workspace. More than one entry = a multi-tile incident — correlate them rather than investigating each separately.

## Decide what kind of event this is

- `transition: "degraded"` (`current` is `error` or `warning`) → **run the full RCA below.**
- `transition: "recovered"` (`current` is `success`, was unhealthy) → **post a short all-clear**: confirm the node recovered, note how long it was unhealthy (`detectedAt` of the degrade vs now), and whether any earlier RCA findings still need follow-up. Do not re-run the full investigation.
- `transition: "changed"` (anything else) → note it briefly; investigate only if it looks meaningful.

## RCA playbook (for a degradation)

Work the affected node outwards. Keep tool calls read-only.

1. **Confirm and frame.** State plainly what changed: `nodeName` in `workspaceName` went `previous` → `current` at `changedAt`, and what `stateReason` / `scalar` already tell you (e.g. "…top is 87, greater than the error threshold 50"). That reason is your starting hypothesis — verify it, don't just repeat it.
2. **Find the failing monitor's real subject, then walk upstream.** `nodeId` is the _dashboard_ (or _workspace_) graph node, not the monitored resource. First use `tile_get` (or `tile_query`) with `dashboardId` + `tileId` to see the tile's scope and data stream — that reveals which entity (host, database, service, cloud resource) the monitor actually watches. Then `graph_query` from **that** entity to find its _upstream_ dependencies — the things whose failure would explain this one. You can also explore straight from the graph nodes you were handed:
    ```
    g.V('node-dash-cmY7JJs67PM1VFSqaH6H').both().valueMap(true)
    ```
    An upstream node that is _also_ unhealthy is your prime suspect.
3. **Scope the blast radius.** From the monitored entity, look _downstream_ (dependents) to list what else is at risk — that's what you tell the human, not just the single failing tile.
4. **Pull the evidence.** For the suspect node(s), use `data_stream_query` (and `tile_query` where a tile already frames the metric) to fetch metrics/logs **around `changedAt`** — error rates, latency, saturation, recent log events. Look for the step-change that lines up with the transition time.
5. **Synthesise.** Produce a short RCA:
    - **What:** the failing node and when.
    - **Likely cause:** the upstream node/metric whose movement best explains it, with the data point that supports it.
    - **Blast radius:** the downstream dependents at risk.
    - **Confidence + next step:** how sure you are, and the one thing a human should check or do next.

## Discipline

- **Don't guess IDs.** Everything you need is in the notification (`nodeId`, `workspaceId`, `causes[]`). Start from those; use `workspace_get` / `scope_resolve` only to orient if a lookup comes back empty.
- **Read-only by default.** RCA is investigation. Do **not** create/modify dashboards, alerting rules, or anything else unless the human explicitly asks after seeing your findings.
- **One report per incident.** `causes[]` already groups every failing tile in the workspace — treat them as one incident and correlate by graph proximity. Likewise, if several `health_change` lines arrive close together for related workspaces, report once rather than firing a separate investigation per line.
- **Lead with the answer.** The human wants "checkout-api is erroring, likely because its RDS instance hit connection limits at 14:01, and order-service is downstream" — not a narration of every query you ran.

## When this is _not_ the right skill

- The user is asking to **set up** alerting/notifications (wiring monitors to Slack/email) → that's the `alerting` / `notifications` skills.
- The user wants to browse health without an incident → use `dashboards` / `query-graph` directly.
