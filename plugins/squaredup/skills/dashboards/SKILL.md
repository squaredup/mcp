---
name: dashboards
description: Use when you need to understand what an existing SquaredUp dashboard contains — its tiles, what data each tile pulls, scope, KPIs. The fastest path from a vague monitoring question to concrete data stream IDs and scopes.
---

# Reading SquaredUp dashboards

Dashboards are the most discoverable artifact in a tenant. If a user asks about something monitoring-related, there's often already a dashboard for it — and reading it gives you the data stream IDs, scopes, and KPIs you need to answer follow-ups directly, without guessing.

## Tool map

| Tool               | What it does                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `dashboard_list`   | List all dashboards in the tenant with workspace names                      |
| `dashboard_get`    | Full dashboard including layout and tile content                            |
| `dashboard_create` | Create a new dashboard                                                      |
| `dashboard_update` | Full overwrite of an existing dashboard                                     |
| `dashboard_query`  | Fetch once, run all data-stream tiles in parallel, return every tile's rows |
| `tile_list`        | Flat tile inventory (id, title, description, type)                          |
| `tile_get`         | Full config for a single tile                                               |
| `tile_create`      | Add a new tile; auto-places below existing tiles, generates its id          |
| `tile_update`      | Merge config fields onto an existing tile                                   |
| `tile_query`       | Run a single tile's data stream and return its rows                         |

## Drill-down order

1. **`workspace_list`** — pick the workspace by name match against the user's question (e.g. "production" → the "Production" workspace).
2. **`dashboard_list`** — the response includes `workspaceDisplayName` for fast filtering. Match by `displayName`.
3. **`dashboard_get`** — full dashboard, including layout and tile content. Use this when you need everything.
4. **`tile_list`** — flat list of tiles on a dashboard with id, title, description, and `_type`. Cheaper than `dashboard_get` if you only need the inventory.
5. **`tile_get`** — full tile config: data stream, scope, timeframe, monitor rules, KPI, viz config.

## What a tile gives you

A tile's `config` typically contains:

- `dataStream.id` and `dataStream.name` — feed straight into `data_stream_query` or use `tile_query` to skip the assembly.
- `scope` — feed into `scope_resolve` to materialize the current matching entities.
- `pluginConfigId` / `activePluginConfigIds` — which data source(s) the tile queries.
- `timeframe` — the tile's default time window.
- Monitor / KPI / viz config — shape varies with the tile's `_type`. For KPI tiles, the config references a top-level KPI by ID; see the `kpis` skill to inspect the underlying KPI.

## Pattern: "what is this dashboard telling me right now?"

Use **`dashboard_query`** — one call fetches the dashboard and fans out all data-stream tile queries in parallel. Non-data-stream tiles (text, image) are skipped automatically. Each tile comes back with its title and rows (or an error if that tile failed).

Only drop down to `tile_list` + parallel `tile_query` if you need to filter to specific tiles first (e.g. only tiles matching a keyword in the title).

Don't fan out 20 parallel `data_stream_query` calls without thinking — `dashboard_query` already does this safely. Use it.

## Pattern: "show me the data for this tile / KPI"

`tile_query(dashboardId, tileId)` — reads the tile's config and fires the stream in one step. Optionally pass `timeframe` to override the tile's stored window. The `dashboardId` and `tileId` are returned by `tile_list` and `kpi_list`.

## Pattern: "build me a dashboard like X but for Y"

1. `dashboard_get` on X to capture layout and tile templates.
2. `dashboard_create` with the adjusted content (different scope, displayName, workspaceId).
3. Add or adjust individual tiles with `tile_create` / `tile_update` rather than hand-crafting the full content blob.

## Pattern: "add a tile to dashboard X"

1. `tile_get` on a similar existing tile to understand the config shape.
2. `tile_create(dashboardId, config, w?, h?)` — auto-places the tile below the existing layout. Returns `tileId`.

## Pattern: "edit dashboard X"

- **Tile-level changes** (config, title, data stream, scope): `tile_update(dashboardId, tileId, config)` — merges onto the existing config, no full-read required.
- **Dashboard-level changes** (displayName, layout, timeframe): `dashboard_get` first (it's a full overwrite), then `dashboard_update` with `{ dashboardId, body }`.

## When to skip this skill

- The user explicitly wants ad-hoc graph traversal — go to `graph_query`.
- The user is building from scratch and existing dashboards don't match the intent — `data_source_list` + `graph_query` are the right starting points.
- The user already gave you a tile or stream ID — call the tool directly.
