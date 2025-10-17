# SquaredUp MCP Documentation

## Getting Started

-   [Running Servers Locally](./running-locally.md) - How to start and configure a SquaredUp MCP Server locally

## Quick Start

```bash
# Start a test connector
bun start --connector test

# Start with credentials
bun start --connector squaredup-api --credentials '{"apiKey":"abcDEf", "region":"us"}'
```

The server will be available at `http://localhost:3000/mcp` using HTTP streaming transport.

## Key Features

-   **HTTP Streaming** - Real-time bidirectional communication
-   **Auto-Reloading** - Development server with hot reload
-   **Type Safe** - Full TypeScript support with Zod schemas
-   **Easy Configuration** - Simple JSON-based credential management

## Architecture

The MCP connectors use HTTP streaming over the `/mcp` endpoint for real-time communication between MCP clients (like Cursor) and connector servers.
