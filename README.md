# SquaredUp MCP

The official [SquaredUp](https://squaredup.com) marketplace for AI agents. It contains everything an agent needs to work with SquaredUp:

- **Use SquaredUp** - query and manage your organization's **dashboards**, **knowledge graph**, **data streams**, **KPIs**, **workspaces**, and **integrations** through SquaredUp's hosted MCP server, with bundled skills that teach any agent how to use it well.
- **Extend SquaredUp** - build a new SquaredUp plugin (a low-code integration with any HTTP/REST API) end to end, guided by the `build-plugin` skill.

> **The MCP server is only for the first of those.** You need it to have an agent read and manage a live SquaredUp organization - dashboards, the graph, data streams, KPIs, and so on. **Building a SquaredUp plugin doesn't use MCP at all**: `squaredup-plugins@squaredup` bundles no server and works entirely through the [`@squaredup/cli`](https://www.npmjs.com/package/@squaredup/cli). Install it on its own, with no region plugin and nothing to authenticate under `/mcp`.

> **A note on the word "plugin".** This repo uses it in two senses. A **Claude Code plugin** is what you install with `/plugin install` (`us`, `eu`, `skills`, `squaredup-plugins`). A **SquaredUp plugin** is a data source integration that pulls data into SquaredUp - that's what the `squaredup-plugins` Claude Code plugin helps you build.

## What's in the marketplace

| Plugin                 | What it gives you                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `us@squaredup`         | MCP server for the US region + the shared skills (via dependency)                        |
| `eu@squaredup`         | MCP server for the EU region + the shared skills (via dependency)                        |
| `skills@squaredup`     | The 14 shared skills, defined once, no MCP server. Installed automatically by `us`/`eu`. |
| `squaredup-plugins@squaredup` | The `build-plugin` and `deploy-plugin` skills for authoring SquaredUp integrations. Standalone - no MCP server. |

### The 14 shared skills

They guide your agent through real SquaredUp workflows: `explore-org`, `dashboards`, `query-data`, `query-graph`, `kpis`, `workspaces`, `clone-workspace`, `integrations`, `alerting`, `notifications`, `permissions`, `sharing`, `scheduled-reports`, `users`.

### The plugin-building skills

- **`build-plugin`** walks you through creating a SquaredUp low-code plugin for an HTTP/REST API - exploring the API, planning the object model and data streams, scaffolding files, then deploying early and testing every data stream against a live authenticated plugin in your own tenant before it ships.
- **`deploy-plugin`** validates a plugin, works out the correct version bump, and deploys it to a tenant. `build-plugin` invokes it at each deploy checkpoint; you can also use it on its own against an existing plugin.

Both require the [`@squaredup/cli`](https://www.npmjs.com/package/@squaredup/cli) (`npm i -g @squaredup/cli`) and a tenant you can authenticate against.

## Install for Claude

### 1. Add the marketplace

Run this once in any Claude Code session:

```
/plugin marketplace add squaredup/mcp
```

### 2. Install what you need

**To use SquaredUp** - pick the plugin for the region your organization is hosted in:

```
/plugin install us@squaredup     # US
```

```
/plugin install eu@squaredup     # EU
```

The region plugin **automatically pulls in the shared `skills@squaredup` plugin** as a dependency - one command installs everything. It installs **only your region's MCP server**; the other region is never added.

| Region | Plugin         | Server         | Endpoint                           |
| ------ | -------------- | -------------- | ---------------------------------- |
| US     | `us@squaredup` | `squaredup-us` | `https://mcp.squaredup.com/mcp`    |
| EU     | `eu@squaredup` | `squaredup-eu` | `https://eu.mcp.squaredup.com/mcp` |

Not sure which region you're on? Check the URL you use to sign in to SquaredUp - EU tenants use an `eu.` host.

**To build a SquaredUp plugin:**

```
/plugin install squaredup-plugins@squaredup
```

This one is independent of the region plugins - it bundles no MCP server and works through the `squaredup` CLI instead. Install it alongside a region plugin, or on its own.

### 3. Authenticate

Run `/mcp`, select your region's server, and sign in. Authentication is browser-based using your existing SquaredUp account - there are no tokens to copy. The first tool call will prompt you if you haven't signed in yet.

(`squaredup-plugins` needs no `/mcp` step - run `squaredup login` in your terminal instead.)

### Organizations that span both regions

Install **both** region plugins:

```
/plugin install us@squaredup
/plugin install eu@squaredup
```

Both servers will be present (and the shared skills are installed just once). When a task is ambiguous, Claude will ask which region you mean before running any tools, then stick to that region's server for the rest of the task.

## Manual MCP configuration (no plugin)

If you'd rather wire the MCP server up directly, add the entry for your region to your Claude Code MCP config.

**US:**

```json
{
    "mcpServers": {
        "squaredup": {
            "type": "http",
            "url": "https://mcp.squaredup.com/mcp"
        }
    }
}
```

**EU:**

```json
{
    "mcpServers": {
        "squaredup": {
            "type": "http",
            "url": "https://eu.mcp.squaredup.com/mcp"
        }
    }
}
```

The OAuth flow is identical - the first tool call prompts you to sign in. Note that without the plugin you don't get the bundled skills.

## Other agents (Cursor, Codex, ...)

The skills are published to the [Agent Skills](https://agentskills.io) open standard and can be installed into any compatible agent with the [`skills` CLI](https://skills.sh):

```bash
npx skills add squaredup/mcp            # install all skills
npx skills add squaredup/mcp --list     # list available skills
npx skills add squaredup/mcp --skill explore-org    # install one skill
npx skills add squaredup/mcp --skill build-plugin   # just the plugin builder
```

The CLI discovers the skills through the `skills` field of each plugin entry in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). The SquaredUp workflow skills assume a connected SquaredUp MCP server (configure one as above); `build-plugin` and `deploy-plugin` need no MCP server, only the `squaredup` CLI.

## Updating

```
/plugin marketplace update squaredup
```

Plugins are version-pinned, so you receive updates when we publish a new version.

## Repository layout

```
.claude-plugin/marketplace.json          # marketplace "squaredup" -> us, eu, skills, squaredup-plugins
plugins/
  skills/            skills/<name>/SKILL.md   # the 14 shared skills, defined once (no MCP)
  us/                .mcp.json                # squaredup-us -> mcp.squaredup.com    (depends on skills)
  eu/                .mcp.json                # squaredup-eu -> eu.mcp.squaredup.com (depends on skills)
  squaredup-plugins/ skills/build-plugin/     # SKILL.md + references/ + scripts/ (no MCP)
                     skills/deploy-plugin/    # SKILL.md
```

`us` and `eu` declare `"dependencies": ["skills"]`, so the skills live in exactly one place and are shared rather than duplicated. `squaredup-plugins` has no dependencies - it is a self-contained pair of authoring skills.

## Contributing

Every change to a plugin must bump that plugin's `version` in its `.claude-plugin/plugin.json` and add an entry to [`CHANGELOG.md`](CHANGELOG.md).
