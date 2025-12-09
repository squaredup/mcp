import type { z } from 'zod';

/**
 * Context interface with typed credentials and setup.
 * Provides access to credentials, setup configuration, data storage, caching, and OAuth2.
 */
export interface ConnectorContext<C = unknown, S = unknown, O = unknown> {
    /** Get the connector credentials */
    getCredentials(): Promise<C>;
    /** Get the connector setup configuration */
    getSetup(): Promise<S>;
    /** Get stored data by key, or all data if no key provided */
    getData<T = unknown>(key?: string): Promise<T | null>;
    /** Set stored data - either a single key-value or multiple key-values */
    setData(keyOrData: string | Record<string, unknown>, value?: unknown): Promise<void>;

    /** Read from connector-level cache (shared between all tenants) */
    readCache(key: string): Promise<string | null>;
    /** Write to connector-level cache (shared between all tenants) */
    writeCache(key: string, value: string): Promise<void>;

    /** Get OAuth2 credentials (if configured) */
    getOauth2Credentials?(): Promise<O>;
    /** Refresh OAuth2 credentials (if configured) */
    refreshOauth2Credentials?(): Promise<O>;
}

/**
 * Resource definition for MCP resources.
 * Resources are read-only data that can be accessed by the LLM.
 */
export interface MCPResourceDefinition {
    name: string;
    uri: string;
    title?: string;
    description?: string;
    mimeType?: string;
    // biome-ignore lint/suspicious/noExplicitAny: Handler needs to accept any context
    handler: (context: ConnectorContext<any, any, any>) => string | Promise<string>;
}

/**
 * Tool definition with typed input and context.
 * Tools are callable functions that can be invoked by the LLM.
 */
export interface MCPToolDefinition<_I = unknown> {
    name: string;
    description: string;
    // biome-ignore lint/suspicious/noExplicitAny: Schema types vary
    schema: z.ZodType<any>;
    // biome-ignore lint/suspicious/noExplicitAny: Handler needs to accept any args and context
    handler: (args: any, context: ConnectorContext<any, any, any>) => string | Promise<string>;
}

/**
 * OAuth2 connector configuration for connectors that use OAuth2 authentication.
 */
export interface OAuth2ConnectorConfig<_C = unknown> {
    schema: z.ZodType;
    // biome-ignore lint/suspicious/noExplicitAny: Credentials type varies
    token: (credentials: any) => Promise<unknown>;
    // biome-ignore lint/suspicious/noExplicitAny: Credentials type varies
    refresh: (credentials: any, oauth2Credentials: unknown) => Promise<unknown>;
}

/**
 * Main connector configuration interface.
 * Defines everything about a connector: metadata, credentials, tools, resources, etc.
 */
export interface MCPConnectorConfig<_C = unknown, _S = unknown> {
    /** Display name of the connector */
    name: string;
    /** Unique key identifier for the connector */
    key: string;
    /** Version of the connector */
    version: string;
    /** URL to the connector's logo */
    logo?: string;
    /** Description of what the connector does */
    description?: string;
    /** Zod schema for validating credentials */
    // biome-ignore lint/suspicious/noExplicitAny: Schema types vary
    credentials: z.ZodType<any>;
    /** Zod schema for validating setup configuration */
    // biome-ignore lint/suspicious/noExplicitAny: Schema types vary
    setup: z.ZodType<any>;
    /** Initial state data for the connector */
    initialState?: Record<string, unknown>;
    /** Tools provided by this connector */
    tools: Record<string, MCPToolDefinition>;
    /** Prompts provided by this connector */
    prompts: Record<string, unknown>;
    /** Resources provided by this connector */
    resources: Record<string, MCPResourceDefinition>;
    /** Example prompt showing how to use the connector */
    examplePrompt?: string;
    /** OAuth2 configuration if the connector uses OAuth2 */
    oauth2?: OAuth2ConnectorConfig;
}
