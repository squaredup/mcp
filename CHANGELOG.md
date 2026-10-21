# Changelog

All notable changes to the SquaredUp marketplace and its plugins are documented here. The marketplace follows [Semantic Versioning](https://semver.org) per plugin; each plugin's `version` lives in its `.claude-plugin/plugin.json` and must be bumped on every release.

## [1.2.0] - 2026-10-21

### Added

- **Antigravity CLI support** - `us` and `eu` are also Antigravity plugins (`squaredup-us`, `squaredup-eu`), each with a `.antigravity-plugin/plugin.json` and an `mcp_config.json` that points at the region's server. Install with `agy plugin install https://github.com/squaredup/mcp/tree/main/plugins/us` (or `plugins/eu`). Without these files, Antigravity converts the Claude Code plugin and installs the server with no URL.

### Changed

- **`us@squaredup`** and **`eu@squaredup`** (`1.2.0`) - no change for Claude Code, Codex or Copilot CLI; the version moves because the plugin folders gained the Antigravity files.

## [1.1.0] - 2026-10-12

### Removed

- **`skills@squaredup`** - the plugin and its 14 skills are gone. The SquaredUp MCP server now provides the same guidance through its `get_skill` tool, so the skills no longer need a separate install. The marketplace maps `skills` to `null` in `renames`, so existing installs stop loading it after the next marketplace update, with no action needed. Skills installed with `npx skills add squaredup/mcp` are not removed automatically; run `npx skills remove squaredup/mcp -y` (add `-g` for a global install).

### Changed

- **`us@squaredup`** and **`eu@squaredup`** (`1.1.0`) - no longer depend on `skills`. Without auto-update, run `claude plugin update us@squaredup` (or `eu@squaredup`) to get this version, because 1.0.x is disabled once `skills` is gone.

## [1.0.2] - 2026-10-12

### Added

- **MCP Registry publishing** - `us` and `eu` each ship a `server.json` (`com.squaredup/us`, `com.squaredup/eu`), and the `Release` workflow publishes both to the [MCP Registry](https://registry.modelcontextprotocol.io) when a `v*` tag is pushed. It is off until the `REGISTRY_PUBLISH_ENABLED` repository variable is `true`.
- **Directory listing metadata** - every plugin now declares an icon and documentation, support, privacy policy, and terms of service URLs for Anthropic's plugin directory.

### Changed

- **`us@squaredup`** and **`eu@squaredup`** (`1.0.2`) - display as "SquaredUp (US)" and "SquaredUp (EU)".
- **`skills@squaredup`** (`1.0.2`) - `alerting`, `dashboards`, and `query-data` say "set `x`" rather than "pass `x`" for tool parameters; no change in behaviour.
- **Marketplace** - plugin metadata lives only in each plugin's `plugin.json`; marketplace entries carry just `name`, `source`, and `category`.

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
