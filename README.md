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

## Install for other agents

Every option below adds only your region's MCP server. Skills come with the server, so there is nothing else to install. Sign in with your SquaredUp account in the browser when the agent first connects.

### One click

| Agent   | US                                                                                                                                                                                                                                                                                                                      | EU                                                                                                                                                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursor  | [![Add US server to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=squaredup-us&config=eyJ1cmwiOiJodHRwczovL21jcC5zcXVhcmVkdXAuY29tL21jcCJ9)                                                                                                                            | [![Add EU server to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=squaredup-eu&config=eyJ1cmwiOiJodHRwczovL2V1Lm1jcC5zcXVhcmVkdXAuY29tL21jcCJ9)                                                                                                                           |
| VS Code | [![Add US server to VS Code](https://img.shields.io/badge/VS_Code-Install_US_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=squaredup-us&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.squaredup.com%2Fmcp%22%7D) | [![Add EU server to VS Code](https://img.shields.io/badge/VS_Code-Install_EU_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=squaredup-eu&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Feu.mcp.squaredup.com%2Fmcp%22%7D) |
| Kiro    | [![Add US server to Kiro](https://kiro.dev/images/add-to-kiro.svg)](https://kiro.dev/launch/mcp/add?name=squaredup-us&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.squaredup.com%2Fmcp%22%7D)                                                                                                                             | [![Add EU server to Kiro](https://kiro.dev/images/add-to-kiro.svg)](https://kiro.dev/launch/mcp/add?name=squaredup-eu&config=%7B%22url%22%3A%22https%3A%2F%2Feu.mcp.squaredup.com%2Fmcp%22%7D)                                                                                                                             |

VS Code also takes the server from the command line:

```bash
code --add-mcp '{"name":"squaredup-us","type":"http","url":"https://mcp.squaredup.com/mcp"}'
```

### Command line

The commands below are for the US region. For EU, use `eu@squaredup`, `squaredup-eu` and `https://eu.mcp.squaredup.com/mcp` instead.

**Codex** reads this repo's marketplace as is:

```bash
codex plugin marketplace add squaredup/mcp
codex plugin add us@squaredup
```

The Codex IDE extension doesn't support plugins. Add the server directly instead; the CLI and the IDE extension share the same config:

```bash
codex mcp add squaredup-us --url https://mcp.squaredup.com/mcp
```

**GitHub Copilot CLI** also reads this repo's marketplace:

```bash
copilot plugin marketplace add squaredup/mcp
copilot plugin install us@squaredup
```

**Gemini CLI:**

```bash
gemini mcp add --transport http squaredup-us https://mcp.squaredup.com/mcp
```

**Every agent on your machine at once** with [`add-mcp`](https://github.com/neondatabase/add-mcp), which writes the config for about 20 agents, including Claude Code, Codex, Cursor, VS Code, Windsurf and Zed:

```bash
npx add-mcp https://mcp.squaredup.com/mcp --name squaredup-us --all -g -y
```

Leave out `--all -y` to choose the agents yourself. Skip Claude Code if you've already installed the region plugin there.

### ChatGPT

In ChatGPT on the web, go to **Plugins**, select **+**, then **Add custom MCP server**. Paste your region's endpoint and sign in when prompted. Whether you can add custom servers depends on your plan and workspace settings.

### Any other MCP client

Any client that supports streamable HTTP and OAuth works. Point it at your region's endpoint from the [table above](#2-install-your-region).

## Installed the skills with `npx skills`?

The skills used to be published from this repo for the [`skills` CLI](https://skills.sh). They now come from the SquaredUp MCP server, so remove the old copies to stop them going stale:

```bash
npx skills remove squaredup/mcp -y      # project install
npx skills remove squaredup/mcp -g -y   # global install
```

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
