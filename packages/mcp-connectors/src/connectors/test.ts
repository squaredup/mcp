import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface TestCredentials {
    apiKey: string;
    someSetting: string;
}

export function createTestServer(credentials: TestCredentials): McpServer {
    const server = new McpServer({
        name: 'Test',
        version: '1.0.0',
    });

    server.tool('test_tool', 'Test tool', {}, async (_args) => {
        console.log('CREDENTIALS', credentials);
        return {
            content: [
                {
                    type: 'text',
                    text: 'this is a test',
                },
            ],
        };
    });

    server.tool(
        'test_tool_with_args',
        'Test tool with args',
        {
            param1: z.string().describe('Param 1'),
        },
        async (args) => {
            console.log('ARGS', args);
            return {
                content: [
                    {
                        type: 'text',
                        text: `this is a test with args: ${JSON.stringify(args)}`,
                    },
                ],
            };
        },
    );

    return server;
}
