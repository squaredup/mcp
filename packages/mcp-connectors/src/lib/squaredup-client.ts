import type {
  DataStream,
  PluginConfig,
  SquaredUpDashboard,
  TileConfig,
  TimeframeEnumValue,
} from "../types/squaredup/types";

// ============================================
// CLIENT-SPECIFIC TYPES
// ============================================

export type VisualizationType =
  | "data-stream-table"
  | "data-stream-line-graph"
  | "data-stream-bar-chart"
  | "data-stream-gauge"
  | "data-stream-scalar"
  | "data-stream-blocks"
  | "data-stream-donut-chart";

// Tile configuration for data stream tiles (CORRECT SQUAREDUP FORMAT)
export interface DataStreamTileConfig {
  _type: "tile/data-stream";
  title?: string;
  description?: string;
  timeframe?: TimeframeEnumValue;
  variables?: string[];
  dataStream: {
    pluginConfigId?: string;
    name?: string;
    id?: string;
    dataSourceConfig?: {
      string?: string;
      options?: Record<string, unknown>;
    };
  };
  scope:
    | { query: string }
    | { workspace: string; scope: string }
    | { variable: string; workspace: string; scope: string }
    | string[]
    | {
        query: string;
        bindings?: Record<string, string[]>;
        queryDetail?: { ids: string[] };
      };
  visualisation: {
    type: VisualizationType;
    config?: Record<string, unknown>;
  };
  activePluginConfigIds?: string[];
  monitor?: unknown;
  noBackground?: boolean;
  noHeader?: boolean;
}

// Complete tile structure
export interface SquaredUpTile {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: DataStreamTileConfig;
  static?: boolean;
  moved?: boolean;
  z?: number;
}

// Creating a data stream tile options
export interface DataStreamTileOptions {
  tileId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visualization: VisualizationType;
  pluginConfigId?: string;
  dataStreamName?: string;
  dataStreamId?: string;
  workspaceScope?: boolean;
  scope?: Record<string, unknown>;
  title?: string;
  description?: string;
  timeframe?: TimeframeEnumValue;
  monitor?: unknown;
  noBackground?: boolean;
  noHeader?: boolean;
  dataSourceConfig?: {
    string?: string;
    options?: Record<string, unknown>;
  };
  visualizationConfig?: Record<string, unknown>;
  csvDataStreamId?: string;
  csvNodeId?: string;
  csvPluginConfigId?: string;
  variableId?: string;
  workspaceId?: string;
  scopeId?: string;
}

// Creating a tile on a dashboard options
export interface CreateDashboardTileOptions extends DataStreamTileOptions {
  dashboardId: string;
}

// Simplified dashboard info for listing
export interface DashboardListItem {
  dashboardId: string;
  displayName: string;
  description: string;
  workspaceId: string;
}

export interface SquaredUpImageUrl {
  url: string;
}

// Workspace scope interfaces
export interface WorkspaceScope {
  id: string;
  displayName: string;
  data?: {
    query?: string;
    queryDetail?: string;
    bindings?: string;
    isDynamic?: boolean;
    [key: string]: unknown;
  };
}

// Simplified scope info for LLM (minimal tokens)
export interface ScopeInfo {
  id: string;
  displayName: string;
  type: "dynamic" | "fixed" | "unknown";
  objectCount: number | "dynamic";
  hasQuery: boolean;
}

export interface CreateWorkspaceScopeOptions {
  workspaceId: string;
  displayName: string;
  query?: string;
  quickScope?: boolean;
  queryDetail?: Record<string, unknown>;
}

// Dashboard variable interfaces
export interface DashboardVariable {
  variable: {
    id: string;
    type: string;
    displayName: string;
    tenant: string;
    configId: string;
    data: unknown;
    workspaceId: string;
  };
  scope: {
    id: string;
  };
}

// ============================================
// SQUAREDUP CLIENT
// ============================================

export class SquaredUpClient {
  private apiKey: string;
  private baseUrl: string;
  private prefix: string = "";

  constructor(apiKey: string, region: string, customBaseUrl?: string) {
    this.apiKey = apiKey;

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

  async createDashboard(
    dashboard: Omit<SquaredUpDashboard, "id">
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/dashboards`, {
      method: "POST",
      headers: {
        apiKey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dashboard),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] createDashboard failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as string;
  }

  async updateDashboard(
    dashboardId: string,
    dashboard: SquaredUpDashboard
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/dashboards/${dashboardId}`, {
      method: "PUT",
      headers: {
        apiKey: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dashboard),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[SquaredUpClient] updateDashboard failed: ${response.status} - ${errorText}`
      );
      throw new Error(
        `SquaredUp API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
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

    return scopes.map((scope) => {
      const data = scope.data || {};

      let scopeType: "dynamic" | "fixed" | "unknown" = "unknown";
      let objectCount: number | "dynamic" = "dynamic";

      let queryDetail: any = {};
      try {
        queryDetail = data.queryDetail ? JSON.parse(data.queryDetail) : {};
      } catch {
        // If parsing fails, keep as empty object
      }

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

    return (await response.json()) as string;
  }

  createDataStreamTile(options: DataStreamTileOptions): SquaredUpTile {
    const isCSVTile = !!options.dataSourceConfig;
    const isVariableBasedTile = !!options.variableId;

    let scope: DataStreamTileConfig["scope"];

    if (isCSVTile) {
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
      scope = {
        variable: options.variableId!,
        workspace: options.workspaceId,
        scope: options.scopeId,
      };
    } else {
      scope = options.scope
        ? (options.scope as DataStreamTileConfig["scope"])
        : { query: "g.V()" };
    }

    const dataStream: DataStreamTileConfig["dataStream"] = {};

    if (isCSVTile) {
      dataStream.name = "rawText";
      dataStream.id =
        options.csvDataStreamId || "datastream-EcvxqnK5urc9lP9BwPCr";
      dataStream.dataSourceConfig = options.dataSourceConfig;
    } else {
      if (options.pluginConfigId) {
        dataStream.pluginConfigId = options.pluginConfigId;
      }
      if (options.dataStreamName) {
        dataStream.name = options.dataStreamName;
      } else if (options.dataStreamId) {
        dataStream.id = options.dataStreamId;
      }
    }

    let visualisationConfig: Record<string, unknown> | undefined;
    if (options.visualizationConfig) {
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

    if (isVariableBasedTile && options.variableId) {
      config.variables = [options.variableId];
    }

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
