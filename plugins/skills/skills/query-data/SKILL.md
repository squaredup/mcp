---
name: query-data
description: Use when pulling tabular rows from a SquaredUp data stream - metrics, log records, events, inventory listings, anything coming from a connected integration. Covers how to compose data source IDs, scope, stream inputs, timeframe, and SQL aggregation correctly.
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Querying a SquaredUp data stream

The `data_stream_query` tool runs a configured data stream against one or more data sources, scoped to a set of entities, optionally parameterised by stream-specific inputs, over a timeframe, **in the context of a workspace**. Output is rows of structured data.

This mirrors the five steps a user takes in the tile editor (which always happen inside a workspace - MCP makes that context explicit as a required `workspaceId`):

1. Pick a data source.
2. Pick a data stream.
3. Pick scope (objects), if the stream requires it.
4. Fill in the stream's inputs (template), if it has any.
5. Optionally wrap the request in a SQL envelope to aggregate, filter, or sort.

## The workspace context (required)

`workspaceId` is a **required** argument. The query runs under that workspace's access control, exactly as it would for a tile in that workspace: you must have access to the workspace, and the data sources you query must be linked to it. Get the id from `workspace_list`; if you're re-assembling a query from an existing tile, use the dashboard's `workspaceId` (returned by `dashboard_list` and `dashboard_get`). To check which data sources a workspace is linked to, read `links.plugins` from `workspace_get`.

## The five pieces

1. **Which stream** - `dataStreamId` (e.g. `datastream-upITeLZ9YzWNZbrx6iHU`, or a built-in slug like `datastream-health` / `datastream-sql`) or `dataStreamName` (canonical name). The two are mutually exclusive. Discover stream IDs by:
    - Reading existing tiles via `tile_get` (the most reliable source - see the `dashboards` skill).
    - Finding stream-defining nodes via `graph_query`.
    - Asking the user if they referenced a specific report or metric by name.

2. **Which data source(s)** - `pluginConfigId` (single) or `activePluginConfigIds` (array, for streams that aggregate across sources). Get from `data_source_list`. Without this the stream has nothing to run against.

3. **Scope** - which entities to query for. Shape:

    ```json
    {
        "resolvedIds": ["node-4tfDTNWMNFf9Hdygh53vwWB4pLY5iK6WYB-4cp3PAvZbuEoJr0V3iX7"],
        "resolvedTypes": ["host", "container"],
        "resolvedSourceTypes": ["AWS::EC2::Instance"]
    }
    ```

    Each data stream definition declares what it can be scoped to via its `matches` field - for example a Pull Requests stream that matches repo vertices means `resolvedTypes` must include the repo type or `resolvedIds` must point at concrete repo nodes. Picking the wrong entity types returns nothing.

    Use `scope_resolve` to convert workspace IDs / scope IDs / type filters into concrete `resolvedIds`, then pass the result through. For inventory-style streams ("list all EC2 instances"), an empty scope or a type-only scope often works.

4. **Stream inputs (template)** - many streams expose user-fillable inputs (state pickers, severity filters, query strings). In the tile editor these come from the stream's `template` definition; on the wire they live in `dataSourceConfig`. Example: a Pull Requests-style stream that takes a `state` choice (open, draft, merged) is invoked with:

    ```json
    { "dataSourceConfig": { "state": "open" } }
    ```

    A built-in concrete example: the `datastream-configurableGremlin` stream takes a `gremlin` text input, so the call shape is `{ "dataStreamId": "datastream-configurableGremlin", "dataSourceConfig": { "gremlin": "g.V().limit(10)" } }`.

    To find what inputs a stream accepts, the most reliable path is to read an existing tile that uses the same stream via `tile_get` and copy its `config.dataSourceConfig`. Inputs are stream-specific - there is no universal list.

5. **Timeframe** - a string like `"last1hour"`, `"last24hours"`, `"last7days"`, or an object `{ from, to }`. Required by most streams. Omit only for inventory-style streams that don't have a time dimension.

## Standard workflow

1. `workspace_list` - pick the workspace the question targets (this becomes the required `workspaceId`).
2. `data_source_list` - pick the data source(s). Check they're linked to the workspace (`workspace_get` → `links.plugins`) if unsure.
3. Identify the stream (often by reading an existing tile via `tile_get`, which also reveals the required scope shape and any `dataSourceConfig` inputs).
4. `scope_resolve` - get the entity node IDs the user cares about, matching the stream's required entity types.
5. `data_stream_query` - pass `workspaceId` + stream id/name + source(s) + scope + `dataSourceConfig` (if the stream takes inputs) + timeframe.

If you don't know which stream to use, find a tile on an existing dashboard that does something similar and copy its `dataStream.id`, `scope`, `dataSourceConfig`, and source IDs - and take `workspaceId` from that dashboard (`dashboard_list` / `dashboard_get` return it). This is faster and more reliable than guessing.

## Shortcut: re-running an existing tile's query

If the user wants the data a tile is already showing - don't assemble the query manually. Use:

- **`tile_query(dashboardId, tileId, timeframe?)`** - runs a single tile's stream as configured, returning its rows directly. Optionally override the timeframe.
- **`dashboard_query(dashboardId, timeframe?)`** - runs all data-stream tiles on a dashboard in parallel and returns all rows grouped by tile.

Both `dashboardId` and `tileId` are returned by `tile_list`, `kpi_list`, and `dashboard_list`. Use these tools when the tile already exists and you don't need to modify the query - `data_stream_query` is for custom or ad-hoc queries.

## Aggregation, filtering, sorting - prefer SQL

`options` carries `sort`, `filter`, and `group` specs that mirror the dashboard tile UI (column-level sort/filter, single grouping key). They work for the simple cases the tile editor exposes, but they don't compose: you can't join, you can't aggregate-then-filter, and the spec shape is opaque to copy from a tile.

For anything beyond a single column sort or a flat group-by, invoke the built-in **`datastream-sql`** meta-stream and pass the inner stream as a table inside `dataSourceConfig.tables`. This is the path the client UI's "advanced mode" uses, and the only reliable one for joins, multi-step aggregations, top-N, or cross-stream queries:

```json
{
    "workspaceId": "space-yHLAPmsNyGkUPe8ZdDxE",
    "dataStreamId": "datastream-sql",
    "dataSourceConfig": {
        "sql": "SELECT state, COUNT(*) AS n FROM prs GROUP BY state ORDER BY n DESC",
        "tables": [
            {
                "tableName": "prs",
                "config": {
                    "dataStream": {
                        "id": "datastream-upITeLZ9YzWNZbrx6iHU",
                        "pluginConfigId": "config-i5ZApyjOBIHBz2J4kG1z"
                    },
                    "scope": { "resolvedIds": ["node-4tfDTNWMNFf9Hdygh53vwWB4pLY5iK6WYB-4cp3PAvZbuEoJr0V3iX7"] },
                    "dataSourceConfig": { "state": "open" },
                    "timeframe": "last7days"
                }
            }
        ]
    }
}
```

The inner `config` of each entry in `tables` is a partial tile config (inner stream id, plugin config, scope, inputs, timeframe). The outer SQL runs over the resulting rows, with each `tableName` available as a SQL table. Use multiple `tables` entries to join across streams.

Use this whenever the user wants a summary, a top-N, a join, or any composed operation.

## Result size

The MCP `data_stream_query` tool runs in multi-page mode internally and returns the full result set in one response - there is no paging knob exposed to the caller. That makes large queries dangerous: streams over noisy entities can return tens of thousands of rows straight into the LLM context.

Before invoking, decide whether the user actually wants raw rows or a rollup. If a rollup is fine, wrap the inner stream in the `datastream-sql` envelope above and aggregate server-side. If raw rows are needed, narrow the scope or shorten the timeframe rather than relying on a default limit - most streams don't have one.

## Common mistakes

- Omitting `workspaceId` - it's required; the call is rejected before anything runs.
- Passing a `workspaceId` the user can't access, or one the queried data sources aren't linked to - denied or empty. Pick the workspace the tile/dashboard actually lives in, or check `workspace_get` → `links.plugins`.
- Trying to override access control via `options.accessControlType` - rejected; queries always run under the workspace's access control.
- Calling `data_stream_query` with no `pluginConfigId` / `activePluginConfigIds` - returns an error.
- Passing a scope with no `resolvedIds`, no `resolvedTypes`, and no `resolvedSourceTypes` - typically returns nothing.
- Passing scope with the wrong entity types for the stream's `matches` - returns nothing. Check an existing tile.
- Forgetting to pass required `dataSourceConfig` inputs (e.g. omitting `state` on a Pull Requests stream, or `gremlin` on `datastream-configurableGremlin`) - returns an error or empty result.
- Confusing `dataStreamId` (`datastream-…`) with the data source `pluginConfigId` (`config-…`).
- Passing both `dataStreamId` and `dataStreamName` - they are mutually exclusive.
- Forgetting `timeframe` on a time-series stream - error or empty result.
- Reaching for `options.sort` / `options.filter` / `options.group` for anything non-trivial - the spec shape mirrors the tile UI and doesn't compose. Use the `datastream-sql` envelope for joins, aggregation, top-N, or anything multi-step.
- Expecting `options.pagingContext` to work - the MCP tool runs the stream end-to-end internally; there is no LLM-driven pagination. Narrow scope/timeframe instead.
