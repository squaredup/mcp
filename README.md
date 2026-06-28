# SquaredUp MCP

The official [SquaredUp](https://squaredup.com) marketplace for AI agents. Install a region plugin and your agent of choice can query and manage your SquaredUp organization - **dashboards**, the **knowledge graph**, **data streams**, **KPIs**, **workspaces**, and **integrations** - through SquaredUp's hosted MCP server, with a set of bundled skills that teach any agent how to use it well.

## What you get

- **One MCP server for your region** - browser OAuth, nothing to configure, no API keys to manage.
- **Fourteen skills**, that guide your agent through real SquaredUp workflows: exploring a tenant, reading dashboards, querying data streams and the entity graph, working with KPIs, cloning workspaces, managing integrations, alerting and notification channels, permissions and sharing, scheduled reports, and managing users.

## Install for Claude

### 1. Add the marketplace

Run this once in any Claude Code session:

```
/plugin marketplace add squaredup/mcp
```

### 2. Install your region

Pick the plugin for the region your SquaredUp organization is hosted in:

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

### 3. Authenticate

Run `/mcp`, select your region's server, and sign in. Authentication is browser-based using your existing SquaredUp account - there are no tokens to copy. The first tool call will prompt you if you haven't signed in yet.

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
npx skills add squaredup/mcp --skill explore-org   # install one skill
```

The CLI discovers the skills through the `skills` field of the `skills` plugin entry in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). The skills assume a connected SquaredUp MCP server (configure one as above).

## Updating

```
/plugin marketplace update squaredup
```

Region plugins are version-pinned, so you receive updates when we publish a new version.

## Repository layout

```
.claude-plugin/marketplace.json   # marketplace "squaredup" -> us, eu, skills
plugins/
  skills/   skills/<name>/SKILL.md # the 14 shared skills, defined once (no MCP)
  us/       .mcp.json              # squaredup-us -> mcp.squaredup.com  (depends on skills)
  eu/       .mcp.json              # squaredup-eu -> eu.mcp.squaredup.com (depends on skills)
```

`us` and `eu` declare `"dependencies": ["skills"]`, so the skills live in exactly one place and are shared rather than duplicated.
