import { mcpConnectorConfig } from '@squaredup/mcp-config-types';
import { z } from 'zod';

export const TestConnectorConfig = mcpConnectorConfig({
    name: 'Test',
    key: 'test',
    version: '1.0.0',
    description: 'A test connector for development and testing purposes',
    credentials: z.object({
        apiKey: z.string().describe('A test API key'),
        someSetting: z.string().describe('Some test setting'),
    }),
    setup: z.object({}),
    examplePrompt: 'Run the test tool to verify the connector is working.',
    tools: (tool) => ({
        TEST_TOOL: tool({
            name: 'test_tool',
            description: 'Test tool',
            schema: z.object({}),
            handler: async (_args, context) => {
                const credentials = await context.getCredentials();
                console.log('CREDENTIALS', credentials);
                return 'this is a test';
            },
        }),
        TEST_TOOL_WITH_ARGS: tool({
            name: 'test_tool_with_args',
            description: 'Test tool with args',
            schema: z.object({
                param1: z.string().describe('Param 1'),
            }),
            handler: async (args, _context) => {
                console.log('ARGS', args);
                return `this is a test with args: ${JSON.stringify(args)}`;
            },
        }),
    }),
});

// Re-export types for backwards compatibility
export type TestCredentials = z.infer<typeof TestConnectorConfig.credentials>;
