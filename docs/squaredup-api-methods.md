# SquaredUp API Tools

Complete reference for all MCP tools provided by the SquaredUp connector.

## Currently Implemented (15 Tools)

### Dashboard Tools (6)

| Tool Name                               | Description                                     | Parameters                                                |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `squaredup_api_list_dashboards`         | List all dashboards in your organization        | None                                                      |
| `squaredup_api_get_dashboard`           | Get full details of a specific dashboard        | `dashboardId`                                             |
| `squaredup_api_create_dashboard`        | Create a new dashboard in a workspace           | `displayName`, `workspaceId`, `content?`                  |
| `squaredup_api_update_dashboard`        | Update dashboard properties                     | `dashboardId`, `displayName?`, `workspaceId?`, `content?` |
| `squaredup_api_get_dashboard_image`     | Generate a dashboard screenshot                 | `workspaceId`, `dashboardId`                              |
| `squaredup_api_get_dashboard_variables` | Get dashboard scope variables for tile creation | `dashboardId`                                             |

### Tile Tools

| Tool Name                          | Description                      | Parameters                                                  |
| ---------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `squaredup_api_list_tiles`         | List all tiles on a dashboard    | `dashboardId`                                               |
| `squaredup_api_get_tile_data`      | Fetch data from specific tiles   | `workspaceId`, `dashboardId`, `tileIndices[]`, `timeframe?` |
| `squaredup_api_get_tile_positions` | Get tile layout and positions    | `dashboardId`                                               |
| `squaredup_api_create_tile`        | Create a new tile on a dashboard | See [Create Tile](#create-tile-parameters) section          |

### Data Source Tools

| Tool Name                                | Description                   | Parameters                       |
| ---------------------------------------- | ----------------------------- | -------------------------------- |
| `squaredup_api_list_data_sources`        | List available data sources   | `workspaceId?`, `allWorkspaces?` |
| `squaredup_api_list_plugin_data_streams` | Get data streams for a plugin | `pluginId`, `workspaceId?`       |

### Scope Tools

| Tool Name                              | Description                | Parameters                                            |
| -------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `squaredup_api_list_workspace_scopes`  | List scopes in a workspace | `workspaceId`                                         |
| `squaredup_api_create_workspace_scope` | Create a new scope         | `workspaceId`, `displayName`, `query?`, `quickScope?` |

---

## Visualization Types

| Type                      | Description                 | Best For             |
| ------------------------- | --------------------------- | -------------------- |
| `data-stream-table`       | Tabular data display        | Lists, detailed data |
| `data-stream-line-graph`  | Time-series line chart      | Metrics over time    |
| `data-stream-bar-chart`   | Bar chart                   | Comparisons          |
| `data-stream-gauge`       | Single value with threshold | Status indicators    |
| `data-stream-scalar`      | Single numeric value        | KPIs, totals         |
| `data-stream-blocks`      | Block visualization         | Status blocks        |
| `data-stream-donut-chart` | Donut/pie chart             | Proportions          |

---

## Timeframe Values

Common timeframe options:

- `last5minutes`, `last15minutes`, `last30minutes`
- `last1hour`, `last3hours`, `last6hours`, `last12hours`, `last24hours`
- `last48hours`, `last7days`, `last30days`, `last90days`, `last365days`
- `none` - For static data (CSV tiles)

---

## Planned Features

Future tool additions being considered:

### Phase 3 - Health & Monitoring

- `squaredup_api_get_health_rollup` - Dashboard/workspace health status
- `squaredup_api_get_kpis` - List KPIs
- `squaredup_api_evaluate_health` - Evaluate health conditions

### Phase 4 - Advanced Operations

- `squaredup_api_query_graph` - Query the graph database
- `squaredup_api_list_workspaces` - List all workspaces
- `squaredup_api_execute_datastream` - Direct data stream execution

See the full API reference in this document for all available endpoints.

---

## Dashboard Service

### Dashboards

| Method | Path                   | Description                | Priority    |
| ------ | ---------------------- | -------------------------- | ----------- |
| GET    | /dashboards            | List all dashboards        | Implemented |
| GET    | /dashboards/{id}       | Get dashboard by ID        | Implemented |
| POST   | /dashboards            | Create dashboard           | Implemented |
| PUT    | /dashboards/{id}       | Update dashboard           | Implemented |
| DELETE | /dashboards/{id}       | Delete dashboard           | Low         |
| PUT    | /dashboards/{id}/clone | Clone dashboard            | Medium      |
| POST   | /dashboards/delete     | Bulk delete dashboards     | Low         |
| POST   | /dashboards/bulk       | Create multiple dashboards | Low         |

### Workspaces

| Method | Path                            | Description               | Priority |
| ------ | ------------------------------- | ------------------------- | -------- |
| GET    | /workspaces                     | List workspaces           | High     |
| GET    | /workspaces/{id}                | Get workspace             | High     |
| POST   | /workspaces                     | Create workspace          | Medium   |
| PUT    | /workspaces/{id}                | Update workspace          | Medium   |
| PATCH  | /workspaces/{id}                | Partial update workspace  | Medium   |
| DELETE | /workspaces/{id}                | Delete workspace          | Low      |
| GET    | /workspaces/{id}/images/avatars | Get workspace avatar      | Low      |
| GET    | /workspaces/{id}/dashboards     | List workspace dashboards | High     |

### Scopes

| Method | Path                              | Description            | Priority |
| ------ | --------------------------------- | ---------------------- | -------- |
| GET    | /workspaces/{id}/scopes           | List scopes            | Medium   |
| POST   | /workspaces/{id}/scopes           | Create scope           | Medium   |
| POST   | /workspaces/{id}/scopes/bulk      | Create multiple scopes | Low      |
| GET    | /workspaces/{id}/scopes/{scopeId} | Get scope              | Medium   |
| PUT    | /workspaces/{id}/scopes/{scopeId} | Update scope           | Medium   |
| DELETE | /workspaces/{id}/scopes/{scopeId} | Delete scope           | Low      |

### Variables

| Method | Path                       | Description                | Priority    |
| ------ | -------------------------- | -------------------------- | ----------- |
| GET    | /workspaces/{id}/variables | List workspace variables   | Medium      |
| GET    | /dashboards/{id}/variables | List dashboard variables   | Implemented |
| POST   | /workspaces/{id}/variables | Create variable            | Medium      |
| GET    | /variables/{id}            | Get variable               | Medium      |
| PUT    | /variables/{id}            | Update variable            | Medium      |
| DELETE | /variables/{id}            | Delete variable            | Low         |
| POST   | /variables/objects         | List variables for objects | Low         |
| GET    | /variables/objects/ids     | Get variable object IDs    | Low         |

### Dashboard Images

| Method | Path                                                        | Description            | Priority |
| ------ | ----------------------------------------------------------- | ---------------------- | -------- |
| GET    | /workspaces/{id}/dashboards/{dashId}/images                 | List dashboard images  | Medium   |
| GET    | /workspaces/{id}/dashboards/{dashId}/images/{imageId}       | Get dashboard image    | Medium   |
| PUT    | /workspaces/{id}/dashboards/{dashId}/images/{imageId}       | Update dashboard image | Low      |
| PUT    | /workspaces/{id}/dashboards/{dashId}/images/{imageId}/clone | Clone dashboard image  | Low      |
| DELETE | /workspaces/{id}/dashboards/{dashId}/images/{imageId}       | Delete dashboard image | Low      |
| GET    | /workspaces/{id}/dashboards/{dashId}/images/external        | Get external images    | Low      |

### Object References

| Method | Path                             | Description             | Priority |
| ------ | -------------------------------- | ----------------------- | -------- |
| GET    | /objects/{objectId}/perspectives | Get object perspectives | Medium   |
| GET    | /objects/{objectId}/tiles        | Get object tiles        | Medium   |

---

## Health & Monitoring

### Health Evaluation

| Method | Path             | Description     | Priority |
| ------ | ---------------- | --------------- | -------- |
| POST   | /health/evaluate | Evaluate health | High     |
| POST   | /health/preview  | Preview health  | Medium   |

### Health Rollup

| Method | Path                         | Description             | Priority |
| ------ | ---------------------------- | ----------------------- | -------- |
| GET    | /healthrollup/dashboard/{id} | Dashboard health rollup | High     |
| GET    | /healthrollup/workspace/{id} | Workspace health rollup | High     |
| POST   | /healthrollup/dashboards     | Multi-dashboard health  | Medium   |
| POST   | /healthrollup/workspaces     | Multi-workspace health  | Medium   |

### Tile Data

| Method | Path      | Description   | Priority |
| ------ | --------- | ------------- | -------- |
| POST   | /tiledata | Get tile data | High     |

### KPIs

| Method | Path          | Description | Priority |
| ------ | ------------- | ----------- | -------- |
| GET    | /kpis         | List KPIs   | High     |
| POST   | /kpis/preview | Preview KPI | Medium   |

---

## Graph Service

### Graph Operations

| Method | Path                 | Description        | Priority |
| ------ | -------------------- | ------------------ | -------- |
| POST   | /graph/query         | Query graph        | High     |
| POST   | /graph/update        | Update graph       | Medium   |
| POST   | /graph/replace       | Replace graph data | Low      |
| POST   | /graph/delete        | Delete from graph  | Low      |
| POST   | /graph/resolvescopes | Resolve scopes     | High     |

### Correlations

| Method | Path                                  | Description          | Priority |
| ------ | ------------------------------------- | -------------------- | -------- |
| POST   | /correlations/correlate               | Create correlation   | Medium   |
| POST   | /correlations/preview                 | Preview correlation  | Medium   |
| GET    | /correlations/suggestions             | List suggestions     | Medium   |
| POST   | /correlations/suggestions/generate    | Generate suggestions | Medium   |
| POST   | /correlations/suggestions/{id}/accept | Accept suggestion    | Medium   |
| POST   | /correlations/suggestions/{id}/reject | Reject suggestion    | Medium   |
| POST   | /correlations/validate                | Validate correlation | Medium   |

### Promoted Properties

| Method | Path                   | Description        | Priority |
| ------ | ---------------------- | ------------------ | -------- |
| POST   | /promotedprops/promote | Promote properties | Low      |

---

## Data Sources & Streams

### Data Sources

| Method | Path                       | Description                   | Priority |
| ------ | -------------------------- | ----------------------------- | -------- |
| GET    | /datasources               | List data sources             | High     |
| GET    | /datasources/{id}          | Get data source               | High     |
| POST   | /datasources               | Create data source            | Medium   |
| PUT    | /datasources/{id}          | Update data source            | Medium   |
| DELETE | /datasources/{id}          | Delete data source            | Low      |
| GET    | /datasources/{id}/links    | Get data source links         | Medium   |
| DELETE | /datasources/{id}/links    | Delete data source links      | Low      |
| PUT    | /datasources/{id}/plugin   | Update data source plugin     | Low      |
| POST   | /datasources/{id}/import   | Trigger import                | Medium   |
| GET    | /usage/current/datasources | Get current data source usage | Medium   |

### Data Streams

| Method | Path                        | Description                 | Priority |
| ------ | --------------------------- | --------------------------- | -------- |
| POST   | /datastreams/requests       | Execute data stream request | High     |
| POST   | /datastreams/scopes         | Get scopes for data stream  | Medium   |
| POST   | /datastreams/nodes          | Get nodes for data stream   | Medium   |
| POST   | /datastreams/resolve-config | Resolve data stream config  | Medium   |
| GET    | /datastreams                | List data streams           | High     |
| GET    | /datastreams/custom         | List custom data streams    | Medium   |
| GET    | /datastreams/plugin/{id}    | Get plugin data streams     | Medium   |
| GET    | /datastreams/{id}           | Get data stream             | Medium   |
| POST   | /datastreams                | Create data stream          | Medium   |
| PUT    | /datastreams/{id}           | Update data stream          | Medium   |
| DELETE | /datastreams/{id}           | Delete data stream          | Low      |

---

## Plugins

| Method | Path                             | Description                   | Priority |
| ------ | -------------------------------- | ----------------------------- | -------- |
| GET    | /plugins                         | List plugins                  | High     |
| GET    | /plugins/latest                  | List latest plugins           | High     |
| GET    | /plugins/{id}                    | Get plugin                    | Medium   |
| POST   | /plugins                         | Create plugin                 | Low      |
| PUT    | /plugins/{id}                    | Update plugin                 | Low      |
| DELETE | /plugins/{id}                    | Delete plugin                 | Low      |
| GET    | /plugins/{id}/ui                 | Get plugin UI config          | Medium   |
| GET    | /plugins/{id}/icon               | Get plugin icon               | Low      |
| GET    | /plugins/{id}/dashboard          | Get OOB dashboard             | Medium   |
| GET    | /plugins/{id}/dashboards         | Get OOB dashboard structure   | Medium   |
| GET    | /plugins/perspectives/{objectId} | Get perspectives for object   | Medium   |
| POST   | /plugins/{id}/dashboard          | Install OOB dashboard         | Medium   |
| POST   | /plugins/test                    | Test UI configuration         | Low      |
| POST   | /plugins/dashboards              | Create default dashboards     | Medium   |
| POST   | /plugins/oauth2begin             | OAuth2 authentication stage 1 | Low      |
| POST   | /plugins/oauth2coderesponse      | OAuth2 authentication stage 2 | Low      |
| POST   | /plugins/{id}/correlations/sync  | Sync correlations             | Medium   |

---

## Alerting

### Alerts

| Method | Path                | Description     | Priority |
| ------ | ------------------- | --------------- | -------- |
| POST   | /alerting/alert     | Send alert      | High     |
| POST   | /alerting/testalert | Send test alert | Medium   |

### Channel Types

| Method | Path                        | Description        | Priority |
| ------ | --------------------------- | ------------------ | -------- |
| GET    | /alerting/channeltypes      | List channel types | Medium   |
| GET    | /alerting/channeltypes/{id} | Get channel type   | Medium   |

### Channels

| Method | Path                    | Description    | Priority |
| ------ | ----------------------- | -------------- | -------- |
| GET    | /alerting/channels      | List channels  | High     |
| POST   | /alerting/channels      | Create channel | Medium   |
| GET    | /alerting/channels/{id} | Get channel    | Medium   |
| PUT    | /alerting/channels/{id} | Update channel | Medium   |
| DELETE | /alerting/channels/{id} | Delete channel | Low      |

### Alert Rules

| Method | Path            | Description      | Priority |
| ------ | --------------- | ---------------- | -------- |
| GET    | /alerting/rules | List alert rules | High     |

---

## Image Generation

| Method | Path                              | Description              | Priority    |
| ------ | --------------------------------- | ------------------------ | ----------- |
| GET    | /generate/{workspace}/{dashboard} | Generate dashboard image | Implemented |

---

## Tenant & User Management

### Tenants

| Method | Path            | Description             | Priority |
| ------ | --------------- | ----------------------- | -------- |
| GET    | /tenants        | List tenants (from JWT) | Medium   |
| GET    | /tenant         | Get current tenant      | High     |
| PUT    | /tenant         | Update current tenant   | Medium   |
| PUT    | /tenant/setting | Update tenant setting   | Medium   |
| PUT    | /tenant/licence | Update tenant licence   | Low      |

### Tenant Users

| Method | Path          | Description        | Priority |
| ------ | ------------- | ------------------ | -------- |
| GET    | /tenant/users | List tenant users  | High     |
| POST   | /tenant/users | Add tenant user    | Medium   |
| DELETE | /tenant/users | Remove tenant user | Medium   |

### Groups

| Method | Path                      | Description            | Priority |
| ------ | ------------------------- | ---------------------- | -------- |
| GET    | /tenant/groups            | List groups            | Medium   |
| GET    | /tenant/groups/{id}       | Get group              | Medium   |
| POST   | /tenant/groups            | Create group           | Medium   |
| PUT    | /tenant/groups/{id}       | Update group           | Medium   |
| DELETE | /tenant/groups/{id}       | Delete group           | Low      |
| GET    | /tenant/groups/{id}/users | List group users       | Medium   |
| POST   | /tenant/groups/{id}/users | Add user to group      | Medium   |
| DELETE | /tenant/groups/{id}/users | Remove user from group | Medium   |

### Current User

| Method | Path                   | Description              | Priority |
| ------ | ---------------------- | ------------------------ | -------- |
| GET    | /user                  | Get current user         | High     |
| PUT    | /user                  | Update current user      | Medium   |
| GET    | /user/tenantproperties | Get tenant properties    | Medium   |
| PUT    | /user/tenantproperties | Update tenant properties | Medium   |
| PUT    | /user/login            | Update last login time   | Low      |

### Subscriptions

| Method | Path                  | Description                  | Priority |
| ------ | --------------------- | ---------------------------- | -------- |
| GET    | /subscription         | Get subscription details     | Medium   |
| GET    | /subscription/prices  | Get subscription prices      | Low      |
| POST   | /subscription/preview | Preview subscription changes | Low      |
| POST   | /subscription         | Modify subscription          | Low      |

---

## Admin (Internal)

| Method | Path                      | Description             | Priority |
| ------ | ------------------------- | ----------------------- | -------- |
| GET    | /admin/tenants            | List all tenants        | Low      |
| POST   | /admin/tenants            | Create tenant           | Low      |
| GET    | /admin/tenants/{id}       | Get tenant              | Low      |
| PUT    | /admin/tenants/{id}       | Update tenant           | Low      |
| DELETE | /admin/tenants/{id}       | Delete tenant           | Low      |
| GET    | /admin/tenants/{id}/users | List tenant users       | Low      |
| POST   | /admin/tenants/{id}/users | Add user to tenant      | Low      |
| DELETE | /admin/tenants/{id}/users | Remove user from tenant | Low      |

---

## API Keys

| Method | Path          | Description    | Priority |
| ------ | ------------- | -------------- | -------- |
| GET    | /apikeys      | List API keys  | High     |
| POST   | /apikeys      | Create API key | Medium   |
| GET    | /apikeys/{id} | Get API key    | Medium   |
| PUT    | /apikeys/{id} | Update API key | Medium   |
| DELETE | /apikeys/{id} | Delete API key | Medium   |

---

## Agents

| Method | Path                          | Description              | Priority |
| ------ | ----------------------------- | ------------------------ | -------- |
| GET    | /agents                       | List agents              | High     |
| GET    | /agents/latest                | Get latest agent         | Medium   |
| POST   | /agents                       | Create agent             | Medium   |
| GET    | /agents/{id}                  | Get agent                | Medium   |
| PUT    | /agents/{id}                  | Update agent             | Medium   |
| DELETE | /agents/{id}                  | Delete agent             | Low      |
| POST   | /agents/{id}/addtogroups      | Add agent to groups      | Medium   |
| POST   | /agents/{id}/removefromgroups | Remove agent from groups | Medium   |

---

## Scripts

| Method | Path          | Description   | Priority |
| ------ | ------------- | ------------- | -------- |
| GET    | /scripts      | List scripts  | Medium   |
| GET    | /scripts/{id} | Get script    | Medium   |
| POST   | /scripts      | Create script | Medium   |
| PUT    | /scripts/{id} | Update script | Medium   |
| DELETE | /scripts/{id} | Delete script | Low      |

---

## Open Access (Sharing)

| Method | Path                                             | Description                | Priority |
| ------ | ------------------------------------------------ | -------------------------- | -------- |
| GET    | /openaccess/shares                               | List shares                | High     |
| GET    | /openaccess/shares/{id}                          | Get share                  | Medium   |
| POST   | /openaccess/shares                               | Create share               | Medium   |
| PUT    | /openaccess/shares/{id}                          | Update share               | Medium   |
| DELETE | /openaccess/shares/{id}                          | Delete share               | Medium   |
| POST   | /openaccess/shares/transient                     | Create transient share     | Medium   |
| GET    | /openaccess/shares/{id}/restrictions             | Get share restrictions     | Medium   |
| GET    | /openaccess/idtoken/{openAccessId}               | Get open access ID token   | Low      |
| GET    | /openaccess/idtoken/{openAccessId}/authenticated | Get authenticated OA token | Low      |
| POST   | /openaccess/idtoken/{openAccessId}/refresh       | Refresh OA token           | Low      |
| GET    | /usage/current/shares                            | Get current share usage    | Medium   |

---

## Access Control

| Method | Path                                         | Description             | Priority |
| ------ | -------------------------------------------- | ----------------------- | -------- |
| GET    | /accesscontrol/acl/{entityId}                | Get ACL                 | Medium   |
| PUT    | /accesscontrol/acl/{entityId}                | Update ACL              | Medium   |
| GET    | /accesscontrol/permissions/{entityId}        | Get permissions         | Medium   |
| GET    | /accesscontrol/permissions/type/{entityType} | Get permissions by type | Medium   |

---

## Configuration

### Custom Types

| Method | Path        | Description        | Priority |
| ------ | ----------- | ------------------ | -------- |
| GET    | /types      | List custom types  | Medium   |
| GET    | /types/{id} | Get custom type    | Medium   |
| POST   | /types      | Create custom type | Medium   |
| PUT    | /types/{id} | Update custom type | Medium   |
| DELETE | /types/{id} | Delete custom type | Low      |

### Correlation Rules

| Method | Path                     | Description             | Priority |
| ------ | ------------------------ | ----------------------- | -------- |
| GET    | /correlations/rules      | List correlation rules  | Medium   |
| GET    | /correlations/rules/{id} | Get correlation rule    | Medium   |
| POST   | /correlations/rules      | Create correlation rule | Medium   |
| PUT    | /correlations/rules/{id} | Update correlation rule | Medium   |
| DELETE | /correlations/rules/{id} | Delete correlation rule | Low      |

### Promoted Properties

| Method | Path                | Description              | Priority |
| ------ | ------------------- | ------------------------ | -------- |
| GET    | /promotedprops      | List promoted properties | Medium   |
| POST   | /promotedprops      | Create promoted property | Medium   |
| DELETE | /promotedprops/{id} | Delete promoted property | Low      |

### KPI Types

| Method | Path           | Description     | Priority |
| ------ | -------------- | --------------- | -------- |
| GET    | /kpitypes      | List KPI types  | Medium   |
| GET    | /kpitypes/{id} | Get KPI type    | Medium   |
| POST   | /kpitypes      | Create KPI type | Medium   |
| PUT    | /kpitypes/{id} | Update KPI type | Medium   |
| DELETE | /kpitypes/{id} | Delete KPI type | Low      |

---

## Usage Statistics

| Method | Path                           | Description                | Priority |
| ------ | ------------------------------ | -------------------------- | -------- |
| POST   | /usage/counts/workspaces       | Get workspace count        | Medium   |
| POST   | /usage/counts/dashboards       | Get dashboard count        | Medium   |
| POST   | /usage/counts/monitors         | Get monitor count          | Medium   |
| POST   | /usage/counts/kpis             | Get KPI count              | Medium   |
| POST   | /usage/counts/nodes            | Get node count             | Medium   |
| POST   | /usage/counts/edges            | Get edge count             | Medium   |
| POST   | /usage/counts/source-nodes     | Get source node count      | Medium   |
| POST   | /usage/counts/users            | Get user count             | Medium   |
| POST   | /usage/counts/datarequests     | Get data request count     | Medium   |
| POST   | /usage/counts/detailedrequests | Get detailed request count | Low      |
| POST   | /usage/metrics                 | Get usage metrics          | Medium   |
| GET    | /usage/current/monitors        | Get current monitor usage  | Medium   |

---

## Web API

| Method | Path         | Description         | Priority |
| ------ | ------------ | ------------------- | -------- |
| POST   | /web/request | Execute web request | Medium   |

For the complete API specification, see [SquaredUp API Documentation](https://squaredup.com/api).

---

## Support

For issues or feature requests:

- GitHub: [squaredup/mcp](https://github.com/squaredup/mcp)
- Documentation: [docs/running-locally.md](./running-locally.md)
