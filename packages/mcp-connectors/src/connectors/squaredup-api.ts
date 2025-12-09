import { mcpConnectorConfig } from '@squaredup/mcp-config-types';
import { z } from 'zod';

interface SquaredUpTile {
    static?: boolean;
    w: number;
    moved?: boolean;
    h: number;
    x: number;
    y: number;
    i: string;
    config: unknown;
    z?: number;
}

interface SquaredUpDashboardContent {
    _type: 'layout/grid';
    contents: SquaredUpTile[];
}

interface SquaredUpDashboard {
    content?: SquaredUpDashboardContent;
    dashboardId?: string;
    description: string;
    displayName: string;
    id?: string;
    workspaceId: string;
}

interface SquaredUpImageUrl {
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

    async listDashboards(): Promise<SquaredUpDashboard[]> {
        const response = await fetch(`${this.baseUrl}/dashboards`, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`SquaredUp API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as SquaredUpDashboard[];
        return result.map((dashboard) => ({
            dashboardId: dashboard.id,
            displayName: dashboard.displayName,
            description: `A dashboard with ID '${dashboard.id}' and workspace ID '${
                dashboard.workspaceId
            }', containing ${dashboard.content?.contents?.length ?? 'no'} tiles.`,
            workspaceId: dashboard.workspaceId,
        }));
    }

    async getDashboardImage(workspaceId: string, dashboardId: string): Promise<SquaredUpImageUrl> {
        const response = await fetch(`${this.baseUrl}/generate/${workspaceId}/${dashboardId}`, {
            method: 'POST',
            headers: this.headers,
        });

        if (!response.ok) {
            throw new Error(`SquaredUp API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as string;
        return { url: result };
    }
}

export const SquaredUpApiConnectorConfig = mcpConnectorConfig({
    name: 'SquaredUp API',
    key: 'squaredup-api',
    version: '1.0.0',
    description: 'Connect to SquaredUp to list dashboards and generate dashboard images',
    credentials: z.object({
        apiKey: z.string().describe('Your SquaredUp API key'),
        region: z
            .enum(['us', 'eu'])
            .describe('The region your SquaredUp instance is hosted in (us or eu)'),
    }),
    setup: z.object({}),
    examplePrompt:
        'List all my SquaredUp dashboards, then generate an image of the first dashboard.',
    tools: (tool) => ({
        LIST_DASHBOARDS: tool({
            name: 'squaredup_api_list_dashboards',
            description: 'List all the dashboards in your organization',
            schema: z.object({}),
            handler: async (_args, context) => {
                try {
                    const { apiKey, region } = await context.getCredentials();
                    const client = new SquaredUpClient(apiKey, region);
                    const dashboards = await client.listDashboards();
                    return JSON.stringify(dashboards, null, 2);
                } catch (error) {
                    return `Failed to get dashboards: ${error instanceof Error ? error.message : String(error)}`;
                }
            },
        }),
        GET_DASHBOARD_IMAGE: tool({
            name: 'squaredup_api_get_dashboard_image',
            description: 'Get an image of a dashboard',
            schema: z.object({
                workspaceId: z.string().describe('The ID of the workspace containing the dashboard'),
                dashboardId: z.string().describe('The ID of the dashboard to get the image of'),
            }),
            handler: async (args, context) => {
                try {
                    const { apiKey, region } = await context.getCredentials();
                    const client = new SquaredUpClient(apiKey, region);
                    const imageUrl = await client.getDashboardImage(args.workspaceId, args.dashboardId);
                    // Note: Image fetching and base64 encoding should be handled by the server
                    // This returns the URL for now; the server can fetch and encode if needed
                    return JSON.stringify(imageUrl);
                } catch (error) {
                    return `Failed to get image URL: ${error instanceof Error ? error.message : String(error)}`;
                }
            },
        }),
    }),
});

// Re-export types for backwards compatibility
export type SquaredUpCredentials = z.infer<typeof SquaredUpApiConnectorConfig.credentials>;
