# Changelog

All notable changes to the SquaredUp marketplace and its plugins are documented here. The marketplace follows [Semantic Versioning](https://semver.org) per plugin; each plugin's `version` lives in its `.claude-plugin/plugin.json` and must be bumped on every release.

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
