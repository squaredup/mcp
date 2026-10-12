# SquaredUp MCP

The official [SquaredUp](https://squaredup.com) marketplace for AI agents. Install a region plugin and your agent of choice can query and manage your SquaredUp organization - **dashboards**, the **knowledge graph**, **data streams**, **KPIs**, **workspaces**, and **integrations** - through SquaredUp's hosted MCP server.

## What you get

- **One MCP server for your region** - browser OAuth, nothing to configure, no API keys to manage.
- **Built-in skills** - the server's `get_skill` tool guides your agent through real SquaredUp workflows: exploring a tenant, reading dashboards, querying data streams and the entity graph, working with KPIs, cloning workspaces, managing integrations, alerting and notification channels, permissions and sharing, scheduled reports, and managing users. There is nothing extra to install.

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

The region plugin installs **only your region's MCP server**; the other region is never added.

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

Both servers will be present. When a task is ambiguous, Claude will ask which region you mean before running any tools, then stick to that region's server for the rest of the task.

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

The OAuth flow is identical - the first tool call prompts you to sign in. Skills come from the server itself, so you get them with or without the plugin.

## Updating

```
/plugin marketplace update squaredup
```

Region plugins are version-pinned, so you receive updates when we publish a new version.

## Repository layout

```
.claude-plugin/marketplace.json   # marketplace "squaredup" -> us, eu
plugins/
  us/       .mcp.json              # squaredup-us -> mcp.squaredup.com
  eu/       .mcp.json              # squaredup-eu -> eu.mcp.squaredup.com
```
