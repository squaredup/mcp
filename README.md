# SquaredUp Claude Plugin Marketplace

The official Claude Code plugin marketplace for [SquaredUp](https://squaredup.com). Install the plugin and Claude can query your SquaredUp organization — dashboards, the knowledge graph, data streams, and more — through SquaredUp's hosted MCP server.

## Installation

### 1. Add the marketplace

Run this once inside any Claude Code session:

```
/plugin marketplace add squaredup/claude-plugin
```

### 2. Install the plugin

```
/plugin install squaredup@squaredup-official
```

The plugin defaults to the US region (`mcp.squaredup.com`). Users in other regions — see [Region configuration](#region-configuration) below.

### 3. Authenticate

Sign in to SquaredUp via:

```
/mcp
```

The plugin uses browser-based sign-in with your existing SquaredUp account. If you skip this step, the first tool call will trigger the same flow.

### 4. Keep up to date

```
/plugin marketplace update squaredup-official
```

## Region configuration

The plugin reads its MCP URL from the `SQUAREDUP_MCP_URL` environment variable, falling back to the US endpoint if it isn't set.

| Region | URL                                       |
| ------ | ----------------------------------------- |
| US     | `https://mcp.squaredup.com/mcp` (default) |
| EU     | `https://eu.mcp.squaredup.com/mcp`        |

EU users: add an `env` block to your Claude Code [settings file](https://code.claude.com/docs/en/settings) (`~/.claude/settings.json` for user-level, or `.claude/settings.json` / `.claude/settings.local.json` inside a project):

```json
{
    "env": {
        "SQUAREDUP_MCP_URL": "https://eu.mcp.squaredup.com/mcp"
    }
}
```

**Restart Claude Code after editing the settings file. Environment variables are only read at session start.**

## Manual MCP configuration

If you'd rather wire the MCP server up directly without installing the plugin, add the entry for your region to your Claude Code MCP config.

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

The OAuth flow is identical — the first tool call will prompt you to sign in.
