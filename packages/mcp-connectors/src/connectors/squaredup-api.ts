import { mcpConnectorConfig } from "@squaredup/mcp-config-types";
import { z } from "zod";
import type { TimeframeEnumValue } from "../types/squaredup/types";
import {
  SquaredUpClient,
  type VisualizationType,
} from "../lib/squaredup-client";

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
    "Add a CPU usage tile to my Production dashboard using my Prometheus data source",
  tools: (tool) => ({
    // ========================================
    // DASHBOARD TOOLS
    // ========================================
    LIST_DASHBOARDS: tool({
      name: "squaredup_api_list_dashboards",
      description:
        "List all dashboards in your organization. Returns dashboard IDs, display names, and workspace IDs. Use this FIRST when the user mentions a dashboard by name to find its ID.",
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
      description: "Get an image URL of a dashboard",
      schema: z.object({
        workspaceId: z
          .string()
          .describe("The workspace ID containing the dashboard"),
        dashboardId: z.string().describe("The dashboard ID"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const imageUrl = await client.getDashboardImage(
            args.workspaceId,
            args.dashboardId
          );
          return JSON.stringify(imageUrl);
        } catch (error) {
          return `Failed to get image URL: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    GET_DASHBOARD_VARIABLES: tool({
      name: "squaredup_api_get_dashboard_variables",
      description:
        'Get all variables (scopes) for a dashboard. CRITICAL: Call this BEFORE CREATE_TILE whenever the user wants a tile scoped to specific objects/teams/resources (e.g., "Atlas Team", "Production Servers", "My Projects"). Returns variableId, workspaceId, and scopeId - you MUST pass ALL THREE to CREATE_TILE as variableId, variableWorkspaceId, variableScopeId or the tile will default to "All Objects".',
      schema: z.object({
        dashboardId: z.string().describe("The dashboard ID"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const variables = await client.getDashboardVariables(
            args.dashboardId
          );

          return JSON.stringify(
            {
              dashboardId: args.dashboardId,
              totalVariables: variables.length,
              variables: variables.map((v) => {
                return {
                  variableId: v.variable.id,
                  displayName: v.variable.displayName,
                  workspaceId: v.variable.workspaceId,
                  scopeId: v.scope.id,
                };
              }),
              note: "IMPORTANT: To create a tile with this variable scope, pass these exact parameters to CREATE_TILE: variableId (from variableId), variableWorkspaceId (from workspaceId), variableScopeId (from scopeId). All three are required!",
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get dashboard variables: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),

    // ========================================
    // TILE TOOLS
    // ========================================
    LIST_TILES: tool({
      name: "squaredup_api_list_tiles",
      description:
        "List all tiles from a dashboard. Use this to see existing tiles before adding new ones.",
      schema: z.object({
        dashboardId: z.string().describe("The dashboard ID"),
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
        "Fetch actual data from specific tiles. Use after LIST_TILES to get tile indices.",
      schema: z.object({
        workspaceId: z.string().describe("The workspace ID"),
        dashboardId: z.string().describe("The dashboard ID"),
        tileIndices: z
          .array(z.number())
          .describe("Array of tile indices (e.g., [0, 1, 2])"),
        timeframe: z
          .string()
          .describe(
            "Timeframe (e.g., 'last1hour', 'last24hours'). Defaults to 'last24hours'"
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
                (args.timeframe || "last24hours") as TimeframeEnumValue,
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
    GET_TILE_POSITIONS: tool({
      name: "squaredup_api_get_tile_positions",
      description:
        "Get grid positions of all tiles on a dashboard. Use this when planning where to place a new tile.",
      schema: z.object({
        dashboardId: z.string().describe("The dashboard ID"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dashboard = await client.getDashboard(args.dashboardId);

          if (!dashboard.content?.contents) {
            return JSON.stringify({
              dashboard: {
                name: dashboard.displayName,
                id: args.dashboardId,
              },
              totalTiles: 0,
              positions: [],
            });
          }

          const positions = dashboard.content.contents.map((tile) => {
            const tileConfig = tile.config as { title?: string };
            return {
              tileId: tile.i,
              title: tileConfig?.title || "Untitled",
              x: tile.x,
              y: tile.y,
              width: tile.w,
              height: tile.h,
            };
          });

          return JSON.stringify(
            {
              dashboard: {
                name: dashboard.displayName,
                id: args.dashboardId,
              },
              totalTiles: positions.length,
              positions,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to get tile positions: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),

    // ========================================
    // DATA SOURCE TOOLS
    // ========================================
    LIST_DATA_SOURCES: tool({
      name: "squaredup_api_list_data_sources",
      description:
        "List available data sources (plugin configurations). Returns data source IDs and names. Use this FIRST when the user mentions a data source by name to find its ID.",
      schema: z.object({
        workspaceId: z
          .string()
          .optional()
          .describe("Filter by workspace ID (optional)"),
        allWorkspaces: z
          .boolean()
          .optional()
          .describe("Show data sources from all workspaces"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dataSources = await client.getDataSources({
            workspaceId: args.workspaceId,
            allWorkspaces: args.allWorkspaces,
          });

          const simplified = dataSources.map((ds) => ({
            id: ds.id,
            displayName: ds.displayName,
            pluginId: ds.plugin.pluginId,
          }));

          return JSON.stringify(
            {
              totalDataSources: simplified.length,
              dataSources: simplified,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to list data sources: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    LIST_PLUGIN_DATA_STREAMS: tool({
      name: "squaredup_api_list_plugin_data_streams",
      description:
        "Get available data streams for a specific plugin. Use this AFTER selecting a data source to see what data streams it provides.",
      schema: z.object({
        pluginId: z
          .string()
          .describe("The plugin ID from the data source (e.g., 'prometheus')"),
        workspaceId: z
          .string()
          .optional()
          .describe("Workspace ID to filter streams (optional)"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const dataStreams = await client.getPluginDataStreams({
            pluginId: args.pluginId,
            workspaceId: args.workspaceId,
          });

          const simplifiedDataStreams = dataStreams.map((dataStream) => ({
            id: dataStream.id,
            displayName: dataStream.displayName,
            dataSourceName: dataStream.definition.name,
            timeframes: dataStream.definition.timeframes,
          }));

          return JSON.stringify(
            {
              pluginId: args.pluginId,
              totalDataStreams: dataStreams.length,
              dataStreams: simplifiedDataStreams,
              note: "When creating tiles, use the 'dataSourceName' field as the dataStreamName parameter in CREATE_TILE",
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to list data streams: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),

    // ========================================
    // SCOPE TOOLS
    // ========================================
    LIST_WORKSPACE_SCOPES: tool({
      name: "squaredup_api_list_workspace_scopes",
      description:
        "List available scopes for a workspace. Scopes filter which objects (servers, databases, etc.) a tile shows data for.",
      schema: z.object({
        workspaceId: z.string().describe("The workspace ID"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const scopes = await client.getWorkspaceScopes(args.workspaceId);

          return JSON.stringify(
            {
              workspaceId: args.workspaceId,
              totalScopes: scopes.length,
              scopes: scopes,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to list workspace scopes: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
    CREATE_WORKSPACE_SCOPE: tool({
      name: "squaredup_api_create_workspace_scope",
      description:
        "Create a new scope in a workspace. Scopes define which resources are included in tiles.",
      schema: z.object({
        workspaceId: z.string().describe("The workspace ID"),
        displayName: z.string().describe("Display name for the scope"),
        query: z
          .string()
          .optional()
          .describe(
            "Gremlin query (e.g., 'g.V()' for all resources). Defaults to 'g.V()'"
          ),
        quickScope: z
          .boolean()
          .optional()
          .describe("Whether this is a quick scope (defaults to false)"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);
          const scopeId = await client.createWorkspaceScope({
            workspaceId: args.workspaceId,
            displayName: args.displayName,
            query: args.query,
            quickScope: args.quickScope,
          });

          return JSON.stringify(
            {
              success: true,
              message: `Scope "${args.displayName}" created successfully`,
              scopeId: scopeId,
              workspaceId: args.workspaceId,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to create workspace scope: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),

    // ========================================
    // TILE CREATION TOOL
    // ========================================
    CREATE_TILE: tool({
      name: "squaredup_api_create_tile",
      description:
        'Create a new tile on a dashboard. IMPORTANT: You MUST gather all required IDs first by calling other tools in this sequence: 1) LIST_DASHBOARDS (if user provided dashboard name), 2) LIST_DATA_SOURCES (if user provided data source name), 3) LIST_PLUGIN_DATA_STREAMS (to get data stream name), 4) GET_TILE_POSITIONS (to find free space), then 5) CREATE_TILE with all the collected IDs. For CSV tiles use dataStreamName="rawText" and provide csvData.',
      schema: z.object({
        dashboardId: z
          .string()
          .describe("The dashboard ID from LIST_DASHBOARDS"),
        tileId: z
          .string()
          .describe(
            "Unique tile ID - generate random string like 'tile-' + random chars"
          ),
        x: z.number().describe("Grid X position (0-based)"),
        y: z.number().describe("Grid Y position (0-based)"),
        w: z.number().describe("Tile width in grid units (typically 4-8)"),
        h: z.number().describe("Tile height in grid units (typically 3-4)"),
        visualization: z
          .enum([
            "data-stream-table",
            "data-stream-line-graph",
            "data-stream-bar-chart",
            "data-stream-gauge",
            "data-stream-scalar",
            "data-stream-blocks",
            "data-stream-donut-chart",
          ] as const)
          .describe("Visualization type"),
        pluginConfigId: z
          .string()
          .optional()
          .describe(
            "Data source ID from LIST_DATA_SOURCES (skip for CSV tiles)"
          ),
        dataStreamName: z
          .string()
          .optional()
          .describe(
            "Data stream name from LIST_PLUGIN_DATA_STREAMS. For CSV tiles use 'rawText'"
          ),
        title: z.string().optional().describe("Tile title"),
        description: z.string().optional().describe("Tile description"),
        timeframe: z
          .string()
          .optional()
          .describe(
            "Timeframe (e.g., 'last1hour', 'last24hours'). Use 'none' for CSV tiles"
          ),
        csvData: z
          .string()
          .optional()
          .describe(
            "CSV data with format: 'Header1,Header2\\nValue1,Value2'. Use with dataStreamName='rawText'"
          ),
        csvOptions: z
          .record(z.unknown())
          .optional()
          .describe('CSV options like {"header": "selected"}'),
        visualizationConfig: z
          .record(z.unknown())
          .optional()
          .describe(
            'Viz config like {"xAxisColumn": "timestamp", "yAxisColumn": ["cpu"]} for line graphs, or {"valueColumn": "count", "labelColumn": "status"} for donuts'
          ),
        variableId: z
          .string()
          .optional()
          .describe(
            "Variable ID from GET_DASHBOARD_VARIABLES (e.g., 'var-xxx')"
          ),
        variableWorkspaceId: z
          .string()
          .optional()
          .describe("Workspace ID from the variable content"),
        variableScopeId: z
          .string()
          .optional()
          .describe("Scope ID from the variable content"),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey, region, baseUrl } = await context.getCredentials();
          const client = new SquaredUpClient(apiKey, region, baseUrl);

          const dataSourceConfig = args.csvData
            ? {
                string: args.csvData,
                options: args.csvOptions || { header: "selected" },
              }
            : undefined;

          const tileOptions = {
            dashboardId: args.dashboardId,
            tileId: args.tileId,
            x: args.x,
            y: args.y,
            w: args.w,
            h: args.h,
            visualization: args.visualization as VisualizationType,
            pluginConfigId: args.pluginConfigId,
            dataStreamName: args.dataStreamName,
            title: args.title,
            description: args.description,
            timeframe: args.timeframe as TimeframeEnumValue | undefined,
            dataSourceConfig: dataSourceConfig,
            visualizationConfig: args.visualizationConfig,
            variableId: args.variableId,
            workspaceId: args.variableWorkspaceId,
            scopeId: args.variableScopeId,
          };

          await client.createDashboardTile(tileOptions);

          return JSON.stringify(
            {
              success: true,
              message: `Tile "${
                args.title || "Untitled"
              }" created successfully`,
              tileId: args.tileId,
              dashboardId: args.dashboardId,
            },
            null,
            2
          );
        } catch (error) {
          return `Failed to create tile: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    }),
  }),
});

export type SquaredUpCredentials = z.infer<
  typeof SquaredUpApiConnectorConfig.credentials
>;
