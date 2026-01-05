import { mcpConnectorConfig } from "@squaredup/mcp-config-types";
import { z } from "zod";
import type {
  DataStream,
  PluginConfig,
  SquaredUpDashboard,
  TileConfig,
  TimeframeEnumValue,
} from "../types/squaredup/types";

type VisualizationType =
  | "data-stream-table"
  | "data-stream-line-graph"
  | "data-stream-bar-chart"
  | "data-stream-gauge"
  | "data-stream-scalar"
  | "data-stream-blocks"
  | "data-stream-donut-chart";

// Tile configuration for data stream tiles (CORRECT SQUAREDUP FORMAT)
interface DataStreamTileConfig {
  _type: "tile/data-stream"; // Inside config, not at tile level!
  title?: string;
  description?: string;
  timeframe?: TimeframeEnumValue;
  variables?: string[]; // Dashboard variables this tile uses
  dataStream: {
    // Nested object
    pluginConfigId?: string; // Optional when using dataSourceConfig
    name?: string; // Use NAME not ID! Server resolves name to ID automatically
    id?: string; // Data stream ID - required for CSV tiles
    dataSourceConfig?: {
      // For CSV tiles and other inline data sources
      string?: string; // CSV data or other inline data
      options?: Record<string, unknown>; // Options like {"header": "selected"}
    };
  };
  scope:
    | { query: string }
    | { workspace: string; scope: string }
    | { variable: string; workspace: string; scope: string } // Variable-based scope
    | string[]
    | {
        query: string;
        bindings?: Record<string, string[]>;
        queryDetail?: { ids: string[] };
      }; // REQUIRED! Can include bindings for CSV tiles
  visualisation: {
    // UK spelling, object not string!
    type: VisualizationType;
    config?: Record<string, unknown>;
  };
  activePluginConfigIds?: string[]; // Required for CSV tiles and variable-based tiles
  monitor?: unknown;
  noBackground?: boolean;
  noHeader?: boolean;
}

// Complete tile structure
interface SquaredUpTile {
  i: string; // Unique tile ID
  x: number; // Grid x position
  y: number; // Grid y position
  w: number; // Width
  h: number; // Height
  config: DataStreamTileConfig;
  static?: boolean;
  moved?: boolean;
  z?: number;
}

// Creating a data stream tile options
interface DataStreamTileOptions {
  tileId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visualization: VisualizationType;
  pluginConfigId?: string; // Optional when using dataSourceConfig
  dataStreamName?: string; // Data stream name
  dataStreamId?: string; // Data stream ID (for built-in streams like CSV)
  workspaceScope?: boolean;
  scope?: Record<string, unknown>;
  title?: string;
  description?: string;
  timeframe?: TimeframeEnumValue;
  monitor?: unknown;
  noBackground?: boolean;
  noHeader?: boolean;
  // Configuration for inline data sources (CSV, etc.)
  dataSourceConfig?: {
    string?: string; // CSV data or other inline data
    options?: Record<string, unknown>; // Options like {"header": "selected"}
  };
  // Configuration for visualization (overrides defaults)
  visualizationConfig?: Record<string, unknown>;
  // CSV-specific fields
  csvDataStreamId?: string; // The built-in CSV data stream ID (e.g., "datastream-EcvxqnK5urc9lP9BwPCr")
  csvNodeId?: string; // The node ID for CSV data source
  csvPluginConfigId?: string; // The plugin config ID for CSV tiles
  // Variable-based scope fields
  variableId?: string; // Dashboard variable ID to use for scope
  workspaceId?: string; // Workspace ID for variable-based scope
  scopeId?: string; // Scope ID for variable-based scope
}

// Creating a tile on a dashboard options
interface CreateDashboardTileOptions extends DataStreamTileOptions {
  dashboardId: string;
}

// Simplified dashboard info for listing
interface DashboardListItem {
  dashboardId: string;
  displayName: string;
  description: string;
  workspaceId: string;
}

interface SquaredUpImageUrl {
  url: string;
}

// Workspace scope interfaces
interface WorkspaceScope {
  id: string;
  displayName: string;
  data?: {
    query?: string; // Gremlin query (dynamic scopes only)
    queryDetail?: string; // JSON string with details
    bindings?: string; // JSON string with bindings
    isDynamic?: boolean;
    [key: string]: unknown;
  };
}

// Simplified scope info for LLM (minimal tokens)
interface ScopeInfo {
  id: string;
  displayName: string;
  type: "dynamic" | "fixed" | "unknown";
  objectCount: number | "dynamic";
  hasQuery: boolean;
}

interface CreateWorkspaceScopeOptions {
  workspaceId: string;
  displayName: string;
  query?: string;
  quickScope?: boolean;
  queryDetail?: Record<string, unknown>;
}

// Dashboard variable interfaces
// Actual API response structure from GET /dashboards/:id/variables
interface DashboardVariable {
  variable: {
    id: string; // e.g., "var-SbdgNf8UrQrNqo8Yjvkm"
    type: string;
    displayName: string;
    tenant: string;
    configId: string;
    data: unknown;
    workspaceId: string; // e.g., "space-uiD4yBLeCS05o2sAkZbY"
  };
  scope: {
    id: string; // e.g., "scope-zocGojlcDrbmndhs3zOK"
  };
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

  async listDashboards(): Promise<DashboardListItem[]> {
    const response = await fetch(`${this.baseUrl}/dashboards`, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] listDashboards failed: ${response.status} - ${errorText}`
      );
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
      console.error(
        `[SquaredUpClient] getDashboard failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as SquaredUpDashboard;
  }

  async getDashboardVariables(
    dashboardId: string
  ): Promise<DashboardVariable[]> {
    const response = await fetch(
      `${this.baseUrl}/dashboards/${dashboardId}/variables`,
      {
        method: "GET",
        headers: {
          apiKey: this.apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] getDashboardVariables failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as DashboardVariable[];
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
    timeframe: TimeframeEnumValue,
    workspaceId?: string,
    dashboardId?: string
  ): Promise<TileConfig> {
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
      console.error(
        `[SquaredUpClient] getTileData failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as TileConfig;
  }

  async getDataSources(options?: {
    workspaceId?: string;
    allWorkspaces?: boolean;
    forAdministration?: boolean;
  }): Promise<PluginConfig[]> {
    const params = new URLSearchParams();

    if (options?.workspaceId) {
      params.append("workspaceId", options.workspaceId);
    }

    if (options?.allWorkspaces) {
      params.append("allWorkspaces", "true");
    }

    if (options?.forAdministration) {
      params.append("forAdministration", "true");
    }

    const url = `${this.baseUrl}/datasources${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] getDataSources failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<PluginConfig[]>;
  }

  async getPluginDataStreams(options: {
    pluginId: string;
    workspaceId?: string;
  }): Promise<DataStream[]> {
    const params = new URLSearchParams();
    if (options.workspaceId) {
      params.append("workspaceId", options.workspaceId);
    }

    const url = `${this.baseUrl}/datastreams/plugin/${options.pluginId}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] getPluginDataStreams failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Ensure we only give relevant data to the LLM to avoid large context
    const dataStreams = (await response.json()) as DataStream[];

    return dataStreams;
  }

  async getWorkspaceScopes(workspaceId: string): Promise<ScopeInfo[]> {
    const url = `${this.baseUrl}/workspaces/${workspaceId}/scopes`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apiKey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] getWorkspaceScopes failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const scopes = (await response.json()) as WorkspaceScope[];

    // Process scopes to return only essential info for LLM
    return scopes.map((scope) => {
      const data = scope.data || {};

      // Determine scope type and count
      let scopeType: "dynamic" | "fixed" | "unknown" = "unknown";
      let objectCount: number | "dynamic" = "dynamic";

      // Try to parse queryDetail to get object info
      let queryDetail: any = {};
      try {
        queryDetail = data.queryDetail ? JSON.parse(data.queryDetail) : {};
      } catch {
        // If parsing fails, keep as empty object
      }

      // Fixed scope if it has a list of IDs
      if (queryDetail.ids?.length > 0 || queryDetail.list?.length > 0) {
        scopeType = "fixed";
        objectCount = (queryDetail.ids || queryDetail.list).length;
      } else if (data.query) {
        scopeType = "dynamic";
      }

      return {
        id: scope.id,
        displayName: scope.displayName || scope.id,
        type: scopeType,
        objectCount: objectCount,
        hasQuery: !!data.query,
      };
    });
  }

  async createWorkspaceScope(
    options: CreateWorkspaceScopeOptions
  ): Promise<string> {
    const url = `${this.baseUrl}/workspaces/${options.workspaceId}/scopes`;

    // FIXED: API expects { scope: { name, query, ... } } not just the scope object
    const body = {
      scope: {
        name: options.displayName,
        query: options.query || "g.V()",
        quickScope: options.quickScope || false,
        queryDetail: options.queryDetail || {},
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        apiKey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] createWorkspaceScope failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // API returns the scope ID as a string
    return (await response.json()) as string;
  }

  createDataStreamTile(options: DataStreamTileOptions): SquaredUpTile {
    const isCSVTile = !!options.dataSourceConfig;
    const isVariableBasedTile = !!options.variableId;

    // Build scope
    let scope: DataStreamTileConfig["scope"];

    if (isCSVTile) {
      // CSV tiles need specific scope with bindings
      const bindingKey = `ids_${this.generateRandomString(20)}`;
      const nodeId =
        options.csvNodeId ||
        "node-1dwkxV4HX7setr3IV7aTF5B9hyJyqKtuijTDo-VRiSCiS2cF7ykmGfY9kn";

      scope = {
        query: `g.V().has('id', within(${bindingKey}))`,
        bindings: {
          [bindingKey]: [nodeId],
        },
        queryDetail: {
          ids: [nodeId],
        },
      };
    } else if (isVariableBasedTile && options.workspaceId && options.scopeId) {
      // Variable-based tiles reference dashboard variables
      scope = {
        variable: options.variableId!,
        workspace: options.workspaceId,
        scope: options.scopeId,
      };
    } else {
      // Regular tiles use simple scope or custom scope
      scope = options.scope
        ? (options.scope as DataStreamTileConfig["scope"])
        : { query: "g.V()" };
    }

    // Build dataStream object
    const dataStream: DataStreamTileConfig["dataStream"] = {};

    if (isCSVTile) {
      // CSV tiles need name, id, and dataSourceConfig
      dataStream.name = "rawText";
      dataStream.id =
        options.csvDataStreamId || "datastream-EcvxqnK5urc9lP9BwPCr";
      dataStream.dataSourceConfig = options.dataSourceConfig;
    } else {
      // Regular tiles need pluginConfigId and name
      if (options.pluginConfigId) {
        dataStream.pluginConfigId = options.pluginConfigId;
      }
      // Use dataStreamName if provided, otherwise fallback to dataStreamId
      if (options.dataStreamName) {
        dataStream.name = options.dataStreamName;
      } else if (options.dataStreamId) {
        // If only ID is provided (for built-in streams), use id
        dataStream.id = options.dataStreamId;
      }
    }

    // Build visualization config
    let visualisationConfig: Record<string, unknown> | undefined;
    if (options.visualizationConfig) {
      // Nest config under visualization type name
      visualisationConfig = {
        [options.visualization]: options.visualizationConfig,
      };
    }

    const config: DataStreamTileConfig = {
      _type: "tile/data-stream" as const,
      title: options.title,
      description: options.description,
      timeframe: options.timeframe || "last24hours",
      dataStream: dataStream,
      scope: scope,
      visualisation: {
        type: options.visualization,
        config: visualisationConfig,
      },
      monitor: options.monitor,
      noBackground: options.noBackground,
      noHeader: options.noHeader,
    };

    // Add variables for variable-based tiles
    if (isVariableBasedTile && options.variableId) {
      config.variables = [options.variableId];
    }

    // Add activePluginConfigIds for CSV tiles and variable-based tiles
    if (isCSVTile) {
      config.activePluginConfigIds = [
        options.csvPluginConfigId || "config-VRiSCiS2cF7ykmGfY9kn",
      ];
    } else if (isVariableBasedTile && options.pluginConfigId) {
      config.activePluginConfigIds = [options.pluginConfigId];
    }

    const tile: SquaredUpTile = {
      i: options.tileId,
      x: options.x,
      y: options.y,
      w: options.w,
      h: options.h,
      config: config,
    };

    return tile;
  }

  // Helper to generate random strings for binding keys
  private generateRandomString(length: number): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createDashboardTile(
    options: CreateDashboardTileOptions
  ): Promise<void> {
    const dashboard = await this.getDashboard(options.dashboardId);

    if (dashboard.content._type !== "layout/grid") {
      throw new Error("Unsupported dashboard layout");
    }

    const tile = this.createDataStreamTile(options);

    const updatedDashboard: SquaredUpDashboard = {
      id: dashboard.id,
      displayName: dashboard.displayName,
      workspaceId: dashboard.workspaceId,
      content: {
        ...dashboard.content,
        contents: [...dashboard.content.contents, tile],
      },
    };

    const response = await fetch(
      `${this.baseUrl}/dashboards/${options.dashboardId}`,
      {
        method: "PUT",
        headers: {
          apiKey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedDashboard),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] createDashboardTile failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `Failed to update dashboard: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
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
                // API returns: { variable: {...}, scope: {id: "scope-xxx"} }
                // Extract the IDs needed for CREATE_TILE
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

          // Extract only positioning info - no heavy config data
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
        // Required IDs - must be obtained from other tools first
        dashboardId: z
          .string()
          .describe("The dashboard ID from LIST_DASHBOARDS"),
        tileId: z
          .string()
          .describe(
            "Unique tile ID - generate random string like 'tile-' + random chars"
          ),

        // Positioning
        x: z.number().describe("Grid X position (0-based)"),
        y: z.number().describe("Grid Y position (0-based)"),
        w: z.number().describe("Tile width in grid units (typically 4-8)"),
        h: z.number().describe("Tile height in grid units (typically 3-4)"),

        // Visualization
        visualization: z
          .enum([
            "data-stream-table",
            "data-stream-line-graph",
            "data-stream-bar-chart",
            "data-stream-gauge",
            "data-stream-scalar",
            "data-stream-blocks",
            "data-stream-donut-chart",
          ])
          .describe("Visualization type"),

        // Data source (get from LIST_DATA_SOURCES)
        pluginConfigId: z
          .string()
          .optional()
          .describe(
            "Data source ID from LIST_DATA_SOURCES (skip for CSV tiles)"
          ),

        // Data stream (get from LIST_PLUGIN_DATA_STREAMS)
        dataStreamName: z
          .string()
          .optional()
          .describe(
            "Data stream name from LIST_PLUGIN_DATA_STREAMS. For CSV tiles use 'rawText'"
          ),

        // Tile content
        title: z.string().optional().describe("Tile title"),
        description: z.string().optional().describe("Tile description"),
        timeframe: z
          .string()
          .optional()
          .describe(
            "Timeframe (e.g., 'last1hour', 'last24hours'). Use 'none' for CSV tiles"
          ),

        // CSV-specific
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

        // Visualization config
        visualizationConfig: z
          .record(z.unknown())
          .optional()
          .describe(
            'Viz config like {"xAxisColumn": "timestamp", "yAxisColumn": ["cpu"]} for line graphs, or {"valueColumn": "count", "labelColumn": "status"} for donuts'
          ),

        // Variable-based scope (get from GET_DASHBOARD_VARIABLES)
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

          // Build dataSourceConfig for CSV tiles
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
            visualization: args.visualization,
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

// Re-export types for backwards compatibility
export type SquaredUpCredentials = z.infer<
  typeof SquaredUpApiConnectorConfig.credentials
>;
