# Changelog

All notable changes to the SquaredUp marketplace and its plugins are documented here. Each vendor's manifests follow [Semantic Versioning](https://semver.org) on their own, and US and EU always share a version:

| Manifests | Read by | Bump when |
| --- | --- | --- |
| `plugins/<region>/.claude-plugin/plugin.json` | Claude Code, the Claude apps, Codex | The Claude plugin changes |
| `plugins/<region>/.antigravity-plugin/plugin.json` | Antigravity | The Antigravity plugin changes |
| `plugins/<region>/plugin.json` | GitHub Copilot CLI, VS Code, `github/awesome-copilot` | The Agent Plugins plugin changes |
| `plugins/<region>/server.json` | MCP Registry | The registry entry changes; publishes on push to `main` |
| `plugins/<region>/.m365-plugin/manifest.json` | Microsoft 365 Copilot | The package changes; released as `m365-v<version>` on push to `main` |

## [1.2.0] - 2026-10-21

### Added

- **Antigravity CLI support** - `us` and `eu` are also Antigravity plugins (`squaredup-us`, `squaredup-eu`), each with a `.antigravity-plugin/plugin.json` and an `mcp_config.json` that points at the region's server. Install with `agy plugin install https://github.com/squaredup/mcp/tree/main/plugins/us` (or `plugins/eu`). Without these files, Antigravity converts the Claude Code plugin and installs the server with no URL.
- **Microsoft 365 Copilot packages** (`1.2.0`) - `us` and `eu` each carry a Microsoft 365 app package for Copilot Cowork and Copilot Chat in `.m365-plugin/`, which the `Release` workflow zips. Each has a connector to its region's MCP server and a `squaredup` skill that points Copilot at `get_skill`, because Microsoft 365 Copilot doesn't pass on the server's instructions. They aren't listed yet: sign-in needs the MCP server to allow Microsoft's redirect URI, and the listing goes through Partner Center. The skill sits inside `.m365-plugin/` so that Claude Code, Copilot CLI, and Antigravity don't load it; they get the same rules from the server's instructions.
- **Agent Plugins manifests** (`1.2.0`) - `us` and `eu` each ship a `plugin.json` and `mcp.json` in the [Agent Plugins](https://agent-plugins.org) format, which GitHub Copilot CLI, VS Code, and `github/awesome-copilot` read. Copilot CLI now uses these instead of `.claude-plugin/plugin.json`, with the same server, so installs are unaffected. Antigravity still reads `.antigravity-plugin/plugin.json`, which takes precedence over a root `plugin.json`, and that manifest now carries its own version (`1.2.0`).
- **Microsoft 365 releases** - the `Release` workflow creates a GitHub release `m365-v<version>` with both packages when the `m365` version is new. It is off until the `RELEASE_PUBLISH_ENABLED` repository variable is `true`, and releases nothing while an OAuth registration ID is a placeholder.

### Changed

- **`us@squaredup`** and **`eu@squaredup`** (`1.2.0`) - no change for Claude Code, Codex or Copilot CLI; the version moves because the plugin folders gained the Antigravity files.
- **`Release` workflow** - checks that US and EU share a version for each vendor, and that every manifest points at its region's server URL. It no longer requires `server.json` to match `.claude-plugin/plugin.json`.

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
