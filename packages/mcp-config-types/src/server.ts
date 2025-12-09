import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
    CallToolResult,
    ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { ConnectorContext, MCPConnectorConfig } from './types.js';

/**
 * Builds an MCP server from a connector configuration.
 *
 * This function takes a connector config and a context, and returns a fully
 * configured McpServer with all tools and resources registered.
 *
 * @param connectorConfig - The connector configuration defining tools and resources
 * @param context - The context providing credentials, setup, caching, etc.
 * @returns A configured McpServer instance
 *
 * @example
 * ```typescript
 * const server = await buildServerFromConnector(MyConnectorConfig, context);
 * ```
 */
export const buildServerFromConnector = async (
    connectorConfig: MCPConnectorConfig,
    context: ConnectorContext
): Promise<McpServer> => {
    const server = new McpServer({
        name: `${connectorConfig.name} MCP Server`,
        version: connectorConfig.version,
    });

    // Register all tools
    for (const tool of Object.values(connectorConfig.tools)) {
        // Extract the shape from the Zod schema for tool registration
        // biome-ignore lint/suspicious/noExplicitAny: Zod schema shape access
        const inputSchema = (tool.schema as any).shape || {};

        server.tool(tool.name, tool.description, inputSchema, async (args: unknown) => {
            try {
                const result = await tool.handler(args, context);
                return {
                    content: [{ type: 'text' as const, text: result }],
                } satisfies CallToolResult;
            } catch (error) {
                return {
                    content: [
                        {
                            isError: true,
                            type: 'text' as const,
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                } satisfies CallToolResult;
            }
        });
    }

    // Register all resources
    for (const resource of Object.values(connectorConfig.resources)) {
        server.resource(resource.name, resource.uri, async (uri: URL) => {
            try {
                const result = await resource.handler(context);
                return {
                    contents: [
                        {
                            type: 'text' as const,
                            text: result,
                            uri: uri.toString(),
                        },
                    ],
                } satisfies ReadResourceResult;
            } catch (error) {
                return {
                    contents: [
                        {
                            type: 'text' as const,
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                            uri: uri.toString(),
                        },
                    ],
                } satisfies ReadResourceResult;
            }
        });
    }

    return server;
};
