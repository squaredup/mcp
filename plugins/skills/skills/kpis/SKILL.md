---
name: kpis
description: Use whenever the user mentions KPIs, key performance indicators, dashboard summary numbers, SLAs, or rolled-up metrics in SquaredUp - and any time they ask to inspect or list a KPI, ask why a KPI is showing the value it is, or ask for KPIs in a category. Trigger phrases include "what KPIs do we have", "show our SLA numbers", "list KPIs in the Cost category", "what does the throughput KPI track", "why is the KPI showing zero".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Working with SquaredUp KPIs

KPIs in SquaredUp come in two layers, and the difference matters:

1. **KPI categories** (a.k.a. KPI types) - top-level named buckets like "Cost" or "Performance". They define the value shape and aggregation rules. You configure one in the tenant's KPI type catalogue. They have IDs like `config-abcd1234`.
2. **KPI instances** - the actual KPIs. Each one lives on a single dashboard tile, belongs to one category, and has a live computed value. Their IDs are the KPI sourceId, shaped `<dashboardId>/<tileId>/kpi`.

When a user says "what KPIs do we have" they almost always mean the **instances** with their current values, not the empty-bucket category list. Reach for `kpi_list` (instances + values), not `kpi_type_list` (categories only).

## Tool map

| Tool              | What it does                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kpi_list`        | List KPI **instances** with their current values. Optional filters: `workspaceId`, `dashboardId`, `type` (category id).                            |
| `kpi_get`         | Get one KPI instance by id (`<dashboardId>/<tileId>/kpi`), with its current value.                                                                 |
| `kpi_create`      | Promote an existing tile into a KPI source by stamping `kpi: { type }` onto its config. Args: `workspaceId`, `dashboardId`, `tileId`, `kpiTypeId`. |
| `kpi_type_list`   | List KPI **categories** only (Cost, Performance, …). No values, no instances.                                                                      |
| `kpi_type_get`    | Get one category's full config including aggregation rules.                                                                                        |
| `kpi_type_create` | Create a new category.                                                                                                                             |
| `kpi_type_update` | Update an existing category. Full overwrite - `kpi_type_get` first.                                                                                |

## Standard flows

**"What KPIs do we have?"** → `kpi_list` with no filters. One call returns every KPI in the tenant, each with its name, category, workspace, dashboard, value, formatted value, and health status.

**"Show me the KPIs in the Cost category."** → `kpi_type_list` to find the category id (the one with `displayName: "Cost"`), then `kpi_list` with `type: <that id>`. Single composed answer.

**"What's the current value of <name> KPI?"** → `kpi_list` (filter by workspace/dashboard if you can narrow), match by `name`, then read its `formattedValue` and `value`. Or `kpi_get` if you already have its id.

**"Why is the KPI showing the wrong number?"** A KPI instance is computed from the dashboard tile it lives on. To debug:

1. `kpi_get` (or `kpi_list` with filters) to confirm the current value, status, and any `message` (the message field carries warnings - shape mismatches, missing data, etc.). The response includes `dashboardId` and `tileId` directly.
2. `tile_query(dashboardId, tileId)` - runs the tile's stream as-configured and returns the raw rows in one step. Compare: is the stream returning unexpected rows? Wrong column? Wrong scope?
3. If you need to inspect the stream config itself (scope, timeframe, dataSourceConfig), use `tile_get` first, then adjust and re-run via `data_stream_query` (see `query-data` skill).

## Authoring a KPI instance

A KPI instance isn't a standalone object - it's a _decoration_ on a dashboard tile. Adding `kpi: { type: <category-id> }` to a tile's `config` promotes that tile into a KPI source. The dashboard indexer materialises the KPI graph node a few seconds after the dashboard is saved.

The `kpi_create` tool wraps this whole flow:

```
kpi_create({
    workspaceId: "space-...",
    dashboardId: "dash-...",
    tileId: "b1c476a1-4745-44c8-a7c3-c9608392657c",  // the `i` field on the tile
    kpiTypeId: "config-mNtjiLScmjffl03zHOGg"          // from kpi_type_list
})
```

Internally it `dashboard_get`s the dashboard, finds the tile in `content.contents` by `i`, sets `tile.config.kpi = { type: kpiTypeId }`, and PUTs the dashboard back. It returns the new `kpiId` (`<dashboardId>/<tileId>/kpi`) but the value won't be available immediately - wait a beat, then call `kpi_get`.

Concrete example of the resulting tile config (truncated for clarity - the `kpi` field is the only thing `kpi_create` changes):

```json
{
    "i": "b1c476a1-4745-44c8-a7c3-c9608392657c",
    "config": {
        "_type": "tile/data-stream",
        "title": "Pull Requests",
        "dataStream": { "id": "datastream-...", "name": "pullRequests", "dataSourceConfig": { ... } },
        "scope": { ... },
        "visualisation": { ... },
        "kpi": { "type": "config-mNtjiLScmjffl03zHOGg" }
    }
}
```

Picking the right `kpiTypeId`: the category dictates the value shape (count, percentage, currency, …). Pick one whose shape matches what the tile's stream produces - otherwise the KPI value will come back with a `shapeName` mismatch warning in `kpi_get`'s `message` field. Use `kpi_type_get` to inspect the category's expected shape if unsure.

To **remove** a KPI from a tile, use `tile_update(dashboardId, tileId, { kpi: null })`. There's no dedicated removal tool.

## Authoring a category

`kpi_type_create` and `kpi_type_update` operate on the category catalogue (`/kpitypes`):

1. **Find a template.** `kpi_type_list`, pick a similar category, and `kpi_type_get` it. Use that body's `config` as the starting point.
2. **Substitute what changes** - usually `displayName` plus the aggregation rules. Keep everything else identical.
3. **`kpi_type_create` with `{ body }`** for new categories. The new category gets a fresh `config-…` id.
4. **`kpi_type_update` with `{ kpiTypeId, body }`** for edits. The body is the full payload to write back, not a patch - read the current shape with `kpi_type_get` first.

If no good template exists, ask the user for an example or admit the gap rather than guessing - KPI category configs are stream-specific and easy to get subtly wrong.

## Common mistakes

- Reaching for `kpi_type_list` when the user asked about KPIs - that returns categories only ("Cost", "Performance"), not the actual KPIs or their values. Use `kpi_list` for the instances.
- Treating a KPI instance as a per-dashboard tile in isolation - multiple dashboards can reference the same category, but each instance is bound to exactly one tile. The `<dashboardId>/<tileId>/kpi` id is the source of truth.
- Calling `kpi_get` immediately after `kpi_create` and expecting a value - the graph indexer is async. Give it a few seconds.
- Passing a `tileId` that's a `tile-…` ID rather than the tile's `i` field - `kpi_create` looks up tiles by `content.contents[].i`, which is a free-form string (often a UUID), not a prefixed entity ID.
- Calling `kpi_type_update` with a partial body - it's a full overwrite. `kpi_type_get` first.
- Forgetting that the value comes from a stream - when debugging, bypass the KPI and run the tile's stream directly.

## When to skip this skill

- The user already has a KPI instance id (`<dashboardId>/<tileId>/kpi`) and just wants the value → call `kpi_get` directly.
- The user wants raw stream rows, not a rollup → `query-data`.
- The user wants to find which entities a KPI applies to (graph traversal) → `query-graph` with `.has('type', 'kpi')`.
