# @squaredup/mcp

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

This monorepo contains packages and apps built with TypeScript and Zod:

-   **@squaredup/mcp-connectors** - Connectors for SquaredUp products and features
-   **@squaredup/mcp-server** - An app for running an MCP server locally
-   **@squaredup/mcp-config-types** - Shared type definitions and configuration framework for building connectors

## Getting Started

If you want to run the connectors locally:

1. **Clone the repository:**

    ```bash
    git clone https://github.com/squaredup/mcp.git
    cd mcp
    ```

2. **Install Bun** (if you don't have it already):

    **Mac/Linux:**
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

    **Windows (PowerShell):**
    ```powershell
    powershell -c "irm bun.sh/install.ps1|iex"
    ```

3. **Install dependencies:**

    ```bash
    bun install
    ```

4. **Build the project:**

    ```bash
    bun run build
    ```

5. **Run the tests:**

    ```bash
    bun test
    ```

6. **Check out the documentation:**
    - See the [`docs/`](./docs/) directory for detailed guides
    - Start with [Running Locally](./docs/running-locally.md) for setup instructions

## Usage

This is a monorepo managed with Bun and Turbo.

### Start a server from a connector

**Mac/Linux/Git Bash:**
```bash
# Start a test server in the background
bun run server -- -- --connector test

# Start with credentials - production environment (credentials object schema may be different for each connector)
bun run server -- -- --connector squaredup-api --credentials '{"apiKey":"abcDEf", "region":"us"}'

# Start with custom base URL - for dev/staging environments
bun run dev -- -- --connector squaredup-api --credentials '{"apiKey":"abcDEf", "region":"us", "baseUrl":"https://dev.api.squaredup.com/api"}'
```

**Windows (PowerShell):**
```powershell
# Start a test server in the background
bun run server -- -- --connector test

# Start with credentials - production environment (use backticks to escape quotes in PowerShell)
bun run dev -- -- --connector squaredup-api --credentials '{`"apiKey`":`"abcDEf`",`"region`":`"us`"}'

# Start with custom base URL - for dev/staging environments
bun run dev -- -- --connector squaredup-api --credentials '{`"apiKey`":`"abcDEf`",`"region`":`"us`",`"baseUrl`":`"https://dev.api.squaredup.com/api`"}'

# Alternative: Use escaped double quotes (remove baseUrl for production)
bun run dev -- -- --connector squaredup-api --credentials '{\"apiKey\":\"abcDEf\",\"region\":\"us\",\"baseUrl\":\"https://dev.api.squaredup.com/api\"}'
```

Server runs at `http://localhost:3000/mcp`

> **Note for Windows users:** PowerShell handles quotes differently than bash. Use either backtick escaping (`` `" ``) or backslash escaping (`\"`) for JSON credentials. Alternatively, use Git Bash for the same syntax as Mac/Linux.

## Available Connectors

| Connector       | Description                                       | Credentials                                                    |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `test`          | Simple test connector for development and testing | `apiKey`, `someSetting`                                        |
| `squaredup-api` | Tools to work with SquaredUp dashboards and data  | `apiKey`, `region` (us/eu), `baseUrl` (optional, for dev/staging) |

See [SquaredUp API Methods](./docs/squaredup-api-methods.md) for details on available and planned API tools.

## License

Apache 2.0

## Inspiration

This package is inspired by [disco.dev](https://disco.dev).

---

**Built by [SquaredUp](https://squaredup.com)**
