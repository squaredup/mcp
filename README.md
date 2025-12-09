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

    ```bash
    curl -fsSL https://bun.sh/install | bash
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

```bash
# Start a test server in the background
bun run server -- -- --connector test

# Start with credentials (credentials object schema may be different for each connector)
bun run server -- -- --connector squaredup-api --credentials '{"apiKey":"abcDEf", "region":"us"}'
```

Server runs at `http://localhost:3000/mcp`

## Available Connectors

| Connector       | Description                                       | Credentials                |
| --------------- | ------------------------------------------------- | -------------------------- |
| `test`          | Simple test connector for development and testing | `apiKey`, `someSetting`    |
| `squaredup-api` | Tools to work with SquaredUp dashboards and data  | `apiKey`, `region` (us/eu) |

See [SquaredUp API Methods](./docs/squaredup-api-methods.md) for details on available and planned API tools.

## License

Apache 2.0

## Inspiration

This package is inspired by [disco.dev](https://disco.dev).

---

**Built by [SquaredUp](https://squaredup.com)**
