import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface SquaredUpDashboard {
    id: string;
    title: string;
    description: string;
    workspaceId: string;
}

interface SquaredUpDashboardImage {
    url: string;
}

class SquaredUpClient {
    private headers: { apiKey: string; Accept: string; 'Content-Type': string };
    private baseUrl: string;
    private prefix: string = '';

    constructor(apiKey: string, region: string) {
        this.headers = {
            apiKey: apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        this.prefix = region !== 'us' ? `${region}.` : '';
        this.baseUrl = `https://${this.prefix}api.squaredup.com/api`;
    }

    async getDashboards(): Promise<SquaredUpDashboard[]> {
        const response = await fetch(`${this.baseUrl}/dashboards`, {
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`SquaredUp API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as { data: SquaredUpDashboard[] };
        return result.data;
    }

    async getDashboardImage(workspaceId: string, dashboardId: string): Promise<SquaredUpDashboardImage> {
        const response = await fetch(`${this.baseUrl}/generate/${workspaceId}/${dashboardId}`, {
            headers: this.headers,
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`SquaredUp API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as { data: string };
        return { url: result.data };
    }
}

export interface SquaredUpCredentials {
    apiKey: string;
    region: 'us' | 'eu';
}

export function createSquaredUpApiServer(credentials: SquaredUpCredentials): McpServer {
    const server = new McpServer({
        name: 'SquaredUp API',
        version: '1.0.0',
    });

    server.tool('squaredup_api_get_dashboards', 'Get all the dashboards in your organization', {}, async (_args) => {
        try {
            const client = new SquaredUpClient(credentials.apiKey, credentials.region);
            const dashboards = await client.getDashboards();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(dashboards, null, 2),
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get dashboards: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    });

    server.tool(
        'squaredup_api_get_dashboard_image',
        'Get the image of a dashboard',
        {
            workspaceId: z.string().describe('The ID of the workspace containing the dashboard'),
            dashboardId: z.string().describe('The ID of the dashboard to get the image of'),
        },
        async (args) => {
            try {
                const client = new SquaredUpClient(credentials.apiKey, credentials.region);
                const imageUrl = await client.getDashboardImage(args.workspaceId, args.dashboardId);
                const response = await fetch(imageUrl.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }
                const mimeType = response.headers.get('content-type') ?? 'image/png';
                const arrayBuffer = await response.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString('base64');
                return {
                    content: [
                        {
                            type: 'image',
                            mimeType,
                            data: base64Data,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Failed to get image URL: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        },
    );

    return server;
}
