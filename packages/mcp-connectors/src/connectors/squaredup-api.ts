import { mcpConnectorConfig } from "@squaredup/mcp-config-types";
import { z } from "zod";

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
  _type: "layout/grid";
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
  private apiKey: string;
  private baseUrl: string;
  private prefix: string = "";

  constructor(apiKey: string, region: string, customBaseUrl?: string) {
    this.apiKey = apiKey;

    // Use custom base URL if provided, otherwise use default with region
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    } else {
      this.prefix = region !== "us" ? `${region}.` : "";
      this.baseUrl = `https://${this.prefix}api.squaredup.com/api`;
    }
  }

  async listDashboards(): Promise<SquaredUpDashboard[]> {
    const response = await fetch(`${this.baseUrl}/dashboards`, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SquaredUpClient] listDashboards failed: ${response.status} - ${errorText}`);
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as SquaredUpDashboard[];

    return result.map((dashboard) => ({
      dashboardId: dashboard.id,
      displayName: dashboard.displayName,
      description: `A dashboard with ID '${dashboard.id}' and workspace ID '${dashboard.workspaceId}`,
      workspaceId: dashboard.workspaceId,
    }));
  }

  async getDashboard(dashboardId: string): Promise<SquaredUpDashboard> {
    const response = await fetch(`${this.baseUrl}/dashboards/${dashboardId}`, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SquaredUpClient] getDashboard failed: ${response.status} - ${errorText}`);
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as SquaredUpDashboard;
  }

  async getDashboardImage(
    workspaceId: string,
    dashboardId: string
  ): Promise<SquaredUpImageUrl> {
    const response = await fetch(
      `${this.baseUrl}/generate/${workspaceId}/${dashboardId}`,
      {
        method: "POST",
        headers: {
          apiKey: this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as string;
    return { url: result };
  }

  async getTileData(
    tileConfig: unknown,
    timeframe: string | object = "last24hours",
    workspaceId?: string,
    dashboardId?: string
  ): Promise<unknown> {
    const requestBody: {
      tileConfig: unknown;
      timeframe: string | object;
      context?: { dashboard?: { id: string; workspaceId: string } };
    } = {
      tileConfig,
      timeframe,
    };

    // Add context if dashboard info is provided
    if (workspaceId && dashboardId) {
      requestBody.context = {
        dashboard: {
          id: dashboardId,
          workspaceId: workspaceId,
        },
      };
    }

    const response = await fetch(`${this.baseUrl}/tiledata`, {
      method: "POST",
      headers: {
        apiKey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SquaredUpClient] getTileData failed: ${response.status} - ${errorText}`);
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  }
}

export const SquaredUpApiConnectorConfig = mcpConnectorConfig({
  name: "SquaredUp API",
  key: "squaredup-api",
  version: "1.0.0",
  description:
    "Connect to SquaredUp to list dashboards and generate dashboard images",
  credentials: z.object({
    apiKey: z.string().describe("Your SquaredUp API key"),
    region: z
      .enum(["us", "eu"])
      .describe("The region your SquaredUp instance is hosted in (us or eu)"),
    baseUrl: z
      .string()
      .optional()
      .describe(
        "Custom API base URL (e.g., https://dev.api.squaredup.com/api for dev environment). If not provided, uses production URL based on region."
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    "List all my dashboards, then show me the tiles in the BMW dashboard, and fetch data for the first tile.",
  tools: (tool) => ({
    LIST_DASHBOARDS: tool({
      name: "squaredup_api_list_dashboards",
      description: "List all the dashboards in your organization",
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dashboards = await client.listDashboards();
          return JSON.stringify(dashboards, null, 2);
        } catch (error) {
          return `Failed to get dashboards: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    GET_DASHBOARD_IMAGE: tool({
      name: "squaredup_api_get_dashboard_image",
      description: "Get an image of a dashboard",
      schema: z.object({
        workspaceId: z
          .string()
          .describe("The ID of the workspace containing the dashboard"),
        dashboardId: z
          .string()
          .describe("The ID of the dashboard to get the image of"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const imageUrl = await client.getDashboardImage(
            args.workspaceId,
            args.dashboardId
          );
          // Note: Image fetching and base64 encoding should be handled by the server
          // This returns the URL for now; the server can fetch and encode if needed
          return JSON.stringify(imageUrl);
        } catch (error) {
          return `Failed to get image URL: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    LIST_TILES: tool({
      name: "squaredup_api_list_tiles",
      description:
        "List all tiles from a specific dashboard. Use this after listing dashboards to see what tiles are available for the user to select.",
      schema: z.object({
        dashboardId: z
          .string()
          .describe("The dashboard ID from the dashboard list"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dashboard = await client.getDashboard(args.dashboardId);

          if (!dashboard.content?.contents) {
            return `Dashboard "${dashboard.displayName}" has no tiles.`;
          }

          const tiles = dashboard.content.contents.map((tile, index) => {
            const tileConfig = tile.config as {
              title?: string;
              _type?: string;
              description?: string;
            };
            return {
              index,
              id: tile.i,
              title: tileConfig?.title || "Untitled",
              type: tileConfig?._type || "unknown",
              description: tileConfig?.description || "",
              position: { x: tile.x, y: tile.y },
              size: { width: tile.w, height: tile.h },
            };
          });

          return JSON.stringify(
            {
              dashboard: {
                name: dashboard.displayName,
                id: args.dashboardId,
              },
              totalTiles: tiles.length,
              tiles,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to list tiles: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    GET_TILE_DATA: tool({
      name: "squaredup_api_get_tile_data",
      description:
        "Fetch the actual data from specific tile(s). Use after listing tiles and getting user confirmation on which tiles to fetch data for.",
      schema: z.object({
        workspaceId: z.string().describe("The workspace ID from the dashboard"),
        dashboardId: z.string().describe("The dashboard ID from the dashboard"),
        tileIndices: z
          .array(z.number())
          .describe(
            "Array of tile indices from the tiles list (e.g., [0, 1, 2])"
          ),
        timeframe: z
          .string()
          .describe(
            "Timeframe for the data (e.g., 'last1hour', 'last24hours', 'last7days'). Defaults to 'last24hours'"
          )
          .optional(),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dashboard = await client.getDashboard(args.dashboardId);

          if (!dashboard.content?.contents) {
            return `Dashboard has no tiles.`;
          }

          const results = [];

          // Fetch data for each requested tile
          for (const index of args.tileIndices) {
            const tile = dashboard.content.contents[index];

            if (!tile) {
              results.push({
                index,
                error: `Tile at index ${index} not found. Dashboard has ${
                  dashboard.content.contents.length
                } tiles (indices 0-${dashboard.content.contents.length - 1})`,
              });
              continue;
            }

            const tileConfig = tile.config as { title?: string };

            try {
              const tileData = await client.getTileData(
                tile.config,
                args.timeframe || "last24hours",
                args.workspaceId,
                args.dashboardId
              );

              results.push({
                index,
                tile: {
                  id: tile.i,
                  title: tileConfig?.title || "Untitled",
                },
                data: tileData,
              });
            } catch (error) {
              results.push({
                index,
                tile: {
                  id: tile.i,
                  title: tileConfig?.title || "Untitled",
                },
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return JSON.stringify(
            {
              dashboard: {
                name: dashboard.displayName,
                id: args.dashboardId,
                workspaceId: args.workspaceId,
              },
              timeframe: args.timeframe || "last24hours",
              requestedTiles: args.tileIndices.length,
              results,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get tile data: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
  }),
});

// Re-export types for backwards compatibility
export type SquaredUpCredentials = z.infer<
  typeof SquaredUpApiConnectorConfig.credentials
>;
