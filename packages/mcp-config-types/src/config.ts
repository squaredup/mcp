import type { z } from 'zod';
import type {
    ConnectorContext,
    MCPConnectorConfig,
    MCPResourceDefinition,
    MCPToolDefinition,
} from './types';

/** Helper type to extract the output type from a Zod schema */
type ZodInfer<T> = T extends z.ZodType<infer O> ? O : never;

/**
 * Creates a fully typed MCP connector configuration.
 *
 * This helper function provides type inference for credentials, setup, and tool schemas,
 * ensuring that handlers receive properly typed arguments and context.
 *
 * @example
 * ```typescript
 * export const MyConnectorConfig = mcpConnectorConfig({
 *   name: 'My Connector',
 *   key: 'my-connector',
 *   version: '1.0.0',
 *   credentials: z.object({
 *     apiKey: z.string().describe('Your API key'),
 *   }),
 *   setup: z.object({}),
 *   tools: (tool) => ({
 *     LIST_ITEMS: tool({
 *       name: 'my_connector_list_items',
 *       description: 'List all items',
 *       schema: z.object({}),
 *       handler: async (args, context) => {
 *         const { apiKey } = await context.getCredentials();
 *         // Use apiKey to fetch items...
 *         return JSON.stringify(items);
 *       },
 *     }),
 *   }),
 * });
 * ```
 */
export function mcpConnectorConfig<
    C extends z.ZodType = z.ZodType,
    S extends z.ZodType = z.ZodType,
>(config: {
    name: string;
    key: string;
    version: string;
    logo?: string;
    description?: string;
    credentials: C;
    setup: S;
    initialState?: Record<string, unknown>;
    examplePrompt?: string;
    oauth2?: {
        schema: z.ZodType;
        token: (credentials: ZodInfer<C>) => Promise<unknown>;
        refresh: (credentials: ZodInfer<C>, oauth2Credentials: unknown) => Promise<unknown>;
    };
    tools: (
        tool: <I extends z.ZodType = z.ZodType>(config: {
            name: string;
            description: string;
            schema: I;
            handler: (
                args: ZodInfer<I>,
                context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
            ) => string | Promise<string>;
        }) => MCPToolDefinition<ZodInfer<I>>
    ) => Record<string, MCPToolDefinition>;
    prompts?: Record<string, unknown>;
    resources?: (
        resource: (config: {
            name: string;
            uri: string;
            title?: string;
            description?: string;
            mimeType?: string;
            handler: (
                context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
            ) => string | Promise<string>;
        }) => MCPResourceDefinition
    ) => Record<string, MCPResourceDefinition>;
}): MCPConnectorConfig<ZodInfer<C>, ZodInfer<S>> {
    // Tool factory function - using explicit type assertions for Zod v4 compatibility
    const typedTool = <I extends z.ZodType>(toolConfig: {
        name: string;
        description: string;
        schema: I;
        handler: (
            args: ZodInfer<I>,
            context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
        ) => string | Promise<string>;
    }): MCPToolDefinition<ZodInfer<I>> => ({
        name: toolConfig.name,
        description: toolConfig.description,
        schema: toolConfig.schema as unknown as z.ZodType<ZodInfer<I>>,
        handler: toolConfig.handler as unknown as MCPToolDefinition<ZodInfer<I>>['handler'],
    });

    // Resource factory function - using explicit type assertions for Zod v4 compatibility
    const typedResource = (resourceConfig: {
        name: string;
        uri: string;
        title?: string;
        description?: string;
        mimeType?: string;
        handler: (
            context: ConnectorContext<ZodInfer<C>, ZodInfer<S>>
        ) => string | Promise<string>;
    }): MCPResourceDefinition => ({
        name: resourceConfig.name,
        uri: resourceConfig.uri,
        title: resourceConfig.title,
        description: resourceConfig.description,
        mimeType: resourceConfig.mimeType,
        handler: resourceConfig.handler as unknown as MCPResourceDefinition['handler'],
    });

    return {
        name: config.name,
        key: config.key,
        version: config.version,
        logo: config.logo,
        description: config.description,
        credentials: config.credentials as unknown as z.ZodType<ZodInfer<C>>,
        setup: config.setup as unknown as z.ZodType<ZodInfer<S>>,
        initialState: config.initialState,
        tools: config.tools(typedTool),
        prompts: config.prompts ?? {},
        resources: config.resources ? config.resources(typedResource) : {},
        examplePrompt: config.examplePrompt,
        oauth2: config.oauth2,
    } as MCPConnectorConfig<ZodInfer<C>, ZodInfer<S>>;
}
