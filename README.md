# @squaredup/mcp

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A Model Context Protocol (MCP) server for SquaredUp, enabling AI agents to interact with SquaredUp dashboards, tiles, data sources, and monitoring data.

## Features

This monorepo contains packages and apps built with TypeScript and Zod:

- **@squaredup/mcp-connectors** - Connectors for SquaredUp products and features
- **@squaredup/mcp-server** - An app for running an MCP server locally
- **@squaredup/mcp-config-types** - Shared type definitions and configuration framework for building connectors

## Quick Start

```bash
# 1. Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash  # Mac/Linux
# OR
powershell -c "irm bun.sh/install.ps1|iex"  # Windows

# 2. Install dependencies
bun install

# 3. Build the project
bun run build

# 4. Start the server
# Mac/Linux/Git Bash:
bun run server -- -- --connector squaredup-api --credentials '{"apiKey":"YOUR_API_KEY", "region":"us"}'

# Windows PowerShell:
bun run server -- -- --connector squaredup-api --credentials --% "{\"apiKey\":\"YOUR_API_KEY\",\"region\":\"us\"}"
```

Server runs at `http://localhost:3000/mcp`

## Available Tools

The SquaredUp MCP connector provides **15 tools** organized into 5 categories:

### Dashboard Tools (6)

- `squaredup_api_list_dashboards` - List all dashboards
- `squaredup_api_get_dashboard` - Get full dashboard details
- `squaredup_api_create_dashboard` - Create new dashboards
- `squaredup_api_update_dashboard` - Update dashboard properties
- `squaredup_api_get_dashboard_image` - Generate dashboard screenshots
- `squaredup_api_get_dashboard_variables` - Get dashboard scope variables

### Tile Tools (4)

- `squaredup_api_list_tiles` - List tiles on a dashboard
- `squaredup_api_get_tile_data` - Fetch tile data with timeframe
- `squaredup_api_get_tile_positions` - Get tile layout positions
- `squaredup_api_create_tile` - Add new tiles to dashboards

### Data Source Tools (2)

- `squaredup_api_list_data_sources` - List available data sources
- `squaredup_api_list_plugin_data_streams` - Get data streams for a plugin

### Scope Tools (2)

- `squaredup_api_list_workspace_scopes` - List scopes in a workspace
- `squaredup_api_create_workspace_scope` - Create new scopes

### Example Prompts

- "Show me all my dashboards"
- "Create a new dashboard called 'Q1 Metrics' in my Production workspace"
- "Rename my dashboard to 'DevOps Monitoring'"
- "Add a CPU usage tile to my Production dashboard"
- "Create a CSV table tile with my sales data"
- "Get the latest metrics from my monitoring dashboard"
- "Create me a new tile in my Work dashboard using the Jira Plugin and Work Items data streams - scope it to the Atlas team"

See [docs/squaredup-api-methods.md](./docs/squaredup-api-methods.md) for detailed tool documentation.

## Usage Examples

**Mac/Linux/Git Bash:**

```bash
# Start server with production API
bun run server -- -- --connector squaredup-api --credentials '{"apiKey":"YOUR_KEY", "region":"us"}'

# Start with dev/staging environment
bun run dev -- -- --connector squaredup-api --credentials '{"apiKey":"YOUR_KEY", "region":"us", "baseUrl":"https://dev.api.squaredup.com/api"}'
```

**Windows (PowerShell):**

```powershell
# Production server - Use --% to stop PowerShell parsing
bun run server -- -- --connector squaredup-api --credentials --% "{\"apiKey\":\"YOUR_KEY\",\"region\":\"us\"}"

# Dev/staging environment
bun run dev -- -- --connector squaredup-api --credentials --% "{\"apiKey\":\"YOUR_KEY\",\"region\":\"us\",\"baseUrl\":\"https://dev.api.squaredup.com/api\"}"

# Alternative: Use a credentials file (recommended for complex configs)
# Create dev-creds.json with: {"apiKey":"YOUR_KEY","region":"us","baseUrl":"https://dev.api.squaredup.com/api"}
$creds = Get-Content dev-creds.json -Raw
bun run dev -- -- --connector squaredup-api --credentials $creds
```

## Codebase Structure

```
squaredup-mcp/
├── packages/
│   ├── mcp-connectors/
│   │   ├── src/
│   │   │   ├── connectors/
│   │   │   │   └── squaredup-api.ts          # MCP tool definitions (12 tools)
│   │   │   ├── lib/
│   │   │   │   └── squaredup-client.ts       # SquaredUp API client
│   │   │   └── types/
│   │   │       └── squaredup/
│   │   │           └── types.ts              # SquaredUp type definitions
│   │   └── package.json
│   ├── mcp-config-types/                     # Shared connector framework
│   └── mcp-server/                           # HTTP server implementation
├── apps/
│   └── mcp-server/                           # Server application
│       ├── src/
│       │   └── index.ts                      # Hono HTTP server
│       └── logs/                             # Server logs
└── docs/                                     # Documentation
```

## Available Connectors

| Connector       | Description                                       | Credentials                                                       |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `test`          | Simple test connector for development and testing | `apiKey`, `someSetting`                                           |
| `squaredup-api` | Tools to work with SquaredUp dashboards and data  | `apiKey`, `region` (us/eu), `baseUrl` (optional, for dev/staging) |

## Documentation

- [Running Locally](./docs/running-locally.md) - Setup and development guide
- [SquaredUp API Tools](./docs/squaredup-api-methods.md) - Complete tool reference

## Development

```bash
# Run tests
bun test

# Build all packages
bun run build

# Development mode with auto-reload (Mac/Linux/Git Bash)
bun run dev -- -- --connector squaredup-api --credentials '{"apiKey":"YOUR_KEY", "region":"us"}'

# Development mode with auto-reload (Windows PowerShell)
bun run dev -- -- --connector squaredup-api --credentials --% "{\"apiKey\":\"YOUR_KEY\",\"region\":\"us\"}"
```

## License

Apache 2.0

## Inspiration

This package is inspired by [disco.dev](https://disco.dev).

---

**Built by [SquaredUp](https://squaredup.com)**
