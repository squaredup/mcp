# Changelog

All notable changes to the SquaredUp marketplace and its plugins are documented here. The marketplace follows [Semantic Versioning](https://semver.org) per plugin; each plugin's `version` lives in its `.claude-plugin/plugin.json` and must be bumped on every release.

## [1.1.0] - 2026-07-01

### Added

- **Health watcher (auto-RCA)** - an opt-in background monitor bundled with the `eu` and `us` plugins. It polls SquaredUp workspace health and, the moment a workspace turns unhealthy, wakes Claude to walk the entity graph and report a likely root cause and blast radius before anyone asks. **Off by default** - enable with the `SQUAREDUP_API_KEY` environment variable.
- **`health-rca` skill** (in `skills@squaredup`) - drives the investigation triggered by a health-watcher notification: reads the failing monitor's state reason, resolves the tile's monitored scope, walks the graph upstream, and reports cause + blast radius. Brings the shared skill count to 15.

## [1.0.1] - 2026-07-01

### Fixed

- **`skills@squaredup`** (`1.0.1`) - `query-graph` no longer claims SQL is a valid `graph_query` input; the tool is Gremlin-only.

## [1.0.0] - 2026-06-28

First release of the plugin marketplace.

### Added

- **Marketplace `squaredup`** with three plugins: `us`, `eu`, and `skills`.
- **`skills@squaredup`** (`1.0.0`) - 14 shared skills, defined once, with no MCP server: `alerting`, `clone-workspace`, `dashboards`, `explore-org`, `integrations`, `kpis`, `notifications`, `permissions`, `query-data`, `query-graph`, `scheduled-reports`, `sharing`, `users`, `workspaces`. Full guidance lives inline in each `SKILL.md`.
- **`us@squaredup`** (`1.0.0`) - US region. Bundles the `squaredup-us` MCP server (`https://mcp.squaredup.com/mcp`) and depends on `skills`.
- **`eu@squaredup`** (`1.0.0`) - EU region. Bundles the `squaredup-eu` MCP server (`https://eu.mcp.squaredup.com/mcp`) and depends on `skills`.
