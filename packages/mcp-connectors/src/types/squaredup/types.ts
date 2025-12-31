// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardTileContent {
  i: string;
  w: number;
  x: number;
  y: number;
  h: number;
  config: TileConfig;
}

export interface DashboardContent {
  _type: "layout/grid" | "layout/list";
  version: number;
  columns: number;
  contents: DashboardTileContent[];
}

export interface SquaredUpDashboard {
  id: string;
  displayName: string;
  content: DashboardContent;
  workspaceId: string;
  builtIn?: boolean;
  lastUpdated?: string;
  timeframe?: UnresolvedTimeframe;
  variables?: VariableId[] | VariableId["value"][];
  schemaVersion?: string;
  group?: string;
  oobInfo?: OOBInfo;
  [key: string]: unknown;
}

export interface OOBInfo {
  pluginId: string;
  pluginVersion: string;
  configId?: string;
  dashboardName?: string;
}

// ============================================
// TILE CONFIG TYPES
// ============================================

export type TileConfig = DataStreamBaseTileConfig | SimpleTileConfig;

export type SimpleTileConfig = {
  _type?: string;
  title?: string;
  description?: string;
  timeframe?: TimeframeEnumValue;
  datasource?: DatasourceConfig;
  dataStream?: DataStreamBaseTileConfig["dataStream"];
  noBackground?: boolean;
  noHeader?: boolean;
  visualisation?: VisualisationConfig;
  transforms?: TransformConfig[];
};

export interface DatasourceConfig {
  type: string;
  config?: Record<string, unknown>;
}

export interface VisualisationConfig {
  type: SimpleTileVisualisationHint;
  config?: Record<string, unknown>;
}

export type SimpleTileVisualisationHint = "image" | "text" | "iframe";

export type TransformConfig = {
  type: string;
  config?: object | ((data: any) => unknown);
};

export type DataStreamBaseTileConfig = { _type: "tile/data-stream" } & Partial<{
  title: string;
  description?: string;
  dataStream: DataStreamConfig;
  configId: string;
  activePluginConfigIds: string[];
  scope: DataStreamScope;
  variables?: string[];
  visualisation: DataStreamVisualisationConfig;
  noBackground: boolean;
  noHeader?: boolean;
  timeframe: UnresolvedTimeframe;
  monitor: MonitorConfig;
  monitorOld?: MonitorConfig;
  kpi: {
    name: string;
    type: `config-${string}`;
  };
}>;

export type DataStreamVisualisationHint =
  | "data-stream-table"
  | "data-stream-bar-chart"
  | "data-stream-line-graph"
  | "data-stream-scalar"
  | "data-stream-gauge"
  | "data-stream-blocks"
  | "data-stream-donut-chart"
  | "data-stream-iframe";

export interface DataStreamVisualisationConfig {
  type: DataStreamVisualisationHint;
  config?: { [key in DataStreamVisualisationHint]?: Record<string, unknown> };
  noDataMessage?: string;
}

export type MonitorConfig = any; // Complex monitoring config

// ============================================
// DATA SOURCE TYPES
// ============================================

export interface DataSource {
  name: string;
  displayName: string;
  supportedScope: ScopeType;
  targetNodesProperties?: string[];
  timeframes?: boolean | TimeframeEnumValue[];
  objectLimit?: number;
}

export type ScopeType = "single" | "list" | "none";

// ============================================
// DATA STREAM TYPES (Plugin Definition)
// ============================================

export interface DataStream {
  name: string;
  displayName: string;
  definition: DataStreamDefinition;
  template?: UIConfig[];
}

export interface DataStreamDefinition {
  name: string;
  dataSourceConfig?: Record<string, unknown>;
  featured?: boolean;
  tags?: string[];
  presetOf?: string;
  rowPath: (string | string[])[];
  matches: MatchSpec;
  metadata?: StreamDataColumnDefinition[];
  sortable?: boolean;
  provides?: "health" | "templateData";
  options?: {
    noMatch?: boolean;
    minimumRequestIntervalSeconds?: number;
    noCache?: boolean;
    excludeFromDrilldown?: boolean;
    bypassDataSourceConfigExpressionResolution?: boolean;
  };
  timeframes?: boolean | TimeframeEnumValue[];
  supportsNoneTimeframe?: boolean;
  defaultTimeframe?: "none" | "dashboard";
  requiresParameterTimeframe?: boolean;
  manualConfigApply?: boolean;
  objectLimit?: number;
  uiConfigMapping?: Record<string, unknown>;
  defaultShaping?: DataStreamFilterConfig &
    DataStreamGroupingConfig &
    DataStreamSortingConfig;
}

export interface PluginConfig {
  id: string;
  displayName: string;
  lastUpdated: string; // ISO timestamp
  type: "config";
  subType: "source.plugin";
  tenant: string;
  lastImportVersion: number;

  plugin: PluginInfo;
  importStatus: ImportStatus;
}

export interface PluginInfo {
  pluginId: string;
  name: string;
  displayName: string;
  lambdaName: string;
  version: string;
  onPrem: boolean;
  importNotSupported: boolean;
}

export interface ImportStatus {
  status: "succeeded" | "failed" | "running";
  started: number; // epoch ms
  ended?: number;
  warnings: unknown[];
  totalWarningCount: number;
  invalidVertexCount?: number;
  invalidEdgeCount?: number;
  lastSuccessful?: LastSuccessfulImport;
}

export interface LastSuccessfulImport {
  status: "succeeded";
  started: number;
  ended: number;
  warnings: unknown[];
  totalWarningCount: number;
}

// ============================================
// STREAM DATA COLUMN DEFINITION (Metadata)
// ============================================

export interface SingleStreamDataColumnDefinition {
  name: string;
  displayName?: string;
  visible?: boolean;
  include?: boolean;
  builtIn?: boolean;
  shape?: string | [string] | [string, Record<string, any>];
  role?: StreamDataColumnRole;
  expand?: StreamDataColumnDefinitionOrExpand[];
  sourceId?: string;
  formatExpression?: string;
  valueExpression?: string;
}

export type PatternStreamDataColumnDefinition = Omit<
  SingleStreamDataColumnDefinition,
  "name"
> & {
  pattern: string;
};

export type ComputedStreamDataColumnDefinition =
  SingleStreamDataColumnDefinition & {
    computed: true;
  };

export type StreamDataColumnDefinition =
  | SingleStreamDataColumnDefinition
  | PatternStreamDataColumnDefinition
  | ComputedStreamDataColumnDefinition;

export type CloneStreamDataColumnDefinition = Omit<
  SingleStreamDataColumnDefinition,
  "name"
> & {
  cloneAs: string;
};

export type ComparisonStreamDataColumnDefinition = Omit<
  SingleStreamDataColumnDefinition,
  "name"
> & {
  comparisonName: string;
  compareTo: string;
  comparisonType: "percentage" | "absolute";
};

export type StreamDataColumnDefinitionOrExpand =
  | StreamDataColumnDefinition
  | CloneStreamDataColumnDefinition
  | ComparisonStreamDataColumnDefinition;

export type StreamDataColumnRole =
  | "label"
  | "value"
  | "timestamp"
  | "unitLabel"
  | "id"
  | "sourceId"
  | "link"
  | "none"
  | "comparison"
  | "computed"
  | "description";

// ============================================
// DATA STREAM SCOPE
// ============================================

export type DataStreamGremlinScope = {
  query: string;
  version?: number;
  gremlin?: string;
  queryDetail?: any;
  bindings?: any;
  workspace?: string;
  literalGremlin?: boolean;
  excludeCanonicalLinkedNodes?: boolean;
};

export type DataStreamWorkspaceScope = {
  workspace: string;
  scope: string;
  variable?: string;
  excludeCanonicalLinkedNodes?: boolean;
};

export type DataStreamScope =
  | string[]
  | DataStreamGremlinScope
  | DataStreamWorkspaceScope;

// ============================================
// DATA STREAM CONFIG (for tiles)
// ============================================

export type DataStreamConfig = Partial<{
  // Identifiers
  id: string;
  name: string;
  dataStreamId: string;
  dataStreamName: string;
  pluginConfigId: string;
  activePluginConfigIds: string[];

  // Configuration
  dataSourceConfig: Record<string, unknown>;
  scope: DataStreamScope;

  // Grouping
  group: {
    by:
      | string
      | [column: string, grouper: string]
      | [column: string, grouper: string][];
    aggregate: {
      names: string[];
      type: string;
    }[];
  };

  // Sorting
  sort: {
    by: [column: string | null, direction: "asc" | "desc"][];
    top?: number;
    valueMap?: Record<string, string | number | boolean>;
  };

  // Filtering
  filter: FilterSpec;

  // Access control
  accessControlType: AccessControlType;
}>;

export type DataStreamGroupingConfig = Partial<{
  group: {
    by:
      | string
      | [column: string, grouper: string]
      | [column: string, grouper: string][];
    aggregate: {
      names: string[];
      type: string;
    }[];
  };
}>;

export type DataStreamSortingConfig = Partial<{
  sort: {
    by: [column: string | null, direction: "asc" | "desc"][];
    top?: number;
    valueMap?: Record<string, string | number | boolean>;
  };
}>;

export type DataStreamFilterConfig = Partial<{
  filter: FilterSpec;
}>;

export type FilterSpec = any; // Complex filter specification
export type AccessControlType = "user" | "dataSource" | "none";

// ============================================
// MATCH SPEC
// ============================================

export type MatchClause =
  | string
  | { type: "oneOf"; values: string[] }
  | { type: "notOneOf"; values: string[] }
  | { type: "contains"; value: string }
  | { type: "notContains"; value: string }
  | { type: "equals"; value: string }
  | { type: "notEquals"; value: string }
  | { type: "regex"; pattern: string }
  | { type: "notRegex"; pattern: string }
  | { type: "any" };

export type MatchCriteria = Record<string, MatchClause>;

export type MatchSpec =
  | "none"
  | "all"
  | "true"
  | MatchCriteria
  | MatchCriteria[];

// ============================================
// UI CONFIG (Template)
// ============================================

export type UIConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | CheckboxFieldConfig
  | ToggleFieldConfig
  | AutoCompleteFieldConfig
  | RadioFieldConfig
  | TextAreaFieldConfig
  | PasswordFieldConfig
  | CodeFieldConfig
  | JsonFieldConfig
  | ExpressionFieldConfig
  //   | KeyValueFieldConfig
  | ChoiceChipsFieldConfig
  | SwitchFieldConfig
  | ScriptFieldConfig
  | ObjectsFieldConfig
  | MarkdownFieldConfig
  | OAuth2FieldConfig
  | AwsCreateRoleFieldConfig
  | PayloadViewerFieldConfig
  | ShowConfigValueFieldConfig
  | CustomFieldConfig
  | FieldGroupConfig;

interface CommonFieldProperties {
  name: string;
  label: string;
  title: string;
  help?: string;
  disabled?: MatchSpec | boolean;
  showValidationIcon?: boolean;
  allowEncryption?: boolean;
  tileEditorStep?: ("Timeframe" | "Parameters")[];
}

interface FieldValidation {
  required?: boolean | { value: boolean; message: string };
  min?: number | string | { value: number | string; message: string };
  max?: number | string | { value: number | string; message: string };
  minLength?: number | string | { value: number | string; message: string };
  maxLength?: number | string | { value: number | string; message: string };
  pattern?: string | { value: string; message: string };
  valueAsNumber?: boolean | { value: boolean; message: string };
  valueAsDate?: boolean | { value: boolean; message: string };
}

export interface TextFieldConfig extends CommonFieldProperties {
  type: "text";
  validation?: FieldValidation;
  placeholder?: string;
  defaultValue?: string;
  displayName?: string;
}

export interface NumberFieldConfig extends CommonFieldProperties {
  type: "number";
  validation?: FieldValidation;
  placeholder?: string;
  defaultValue?: number;
  displayName?: string;
}

export interface CheckboxFieldConfig extends CommonFieldProperties {
  type: "checkbox";
  defaultValue?: boolean;
}

export interface ToggleFieldConfig extends CommonFieldProperties {
  type: "toggle";
  defaultValue?: boolean;
  description?: string;
}

export interface AutoCompleteFieldConfig extends CommonFieldProperties {
  type: "autocomplete";
  validation?: FieldValidation;
  placeholder?: string;
  defaultValue?: string;
  isMulti?: boolean;
  allowCustomValues?: boolean;
  isClearable?: boolean;
  data?:
    | {
        source: "dataStream";
        dataStreamName: string;
        dataSourceConfig: Record<string, any>;
        search?: DataStreamSearchConfig;
      }
    | {
        source: "fixed";
        values: (OptionValue | OptionGroup)[];
      }
    | {
        source: "none";
      };
}

export interface OptionValue {
  label?: string;
  value: string;
}

export interface OptionGroup {
  label: string;
  options: OptionValue[];
}

export type DataStreamSearchConfig =
  | { type: "client" }
  | {
      type: "server";
      minCharacters?: number;
      debounceMs?: number;
      noOptionsMessage?: string;
    };

export interface RadioFieldConfig extends CommonFieldProperties {
  type: "radio";
  defaultValue?: string;
  validation?: FieldValidation;
  options: (OptionValue & { description?: string })[];
}

export interface TextAreaFieldConfig extends CommonFieldProperties {
  type: "textarea";
  validation?: FieldValidation;
  placeholder?: string;
  defaultValue?: string;
}

export interface PasswordFieldConfig extends CommonFieldProperties {
  type: "password";
  validation?: FieldValidation;
  placeholder?: string;
  defaultValue?: string;
}

export interface CodeFieldConfig extends CommonFieldProperties {
  type: "code";
  language?: string;
  validation?: FieldValidation;
  content?: string;
  defaultValue?: string;
  resizable?: boolean;
}

export interface JsonFieldConfig extends CommonFieldProperties {
  type: "json";
  validation?: FieldValidation;
  placeholder?: string;
  content?: string;
  defaultValue?: string;
  heightConstraints?: {
    min: number;
    max: number;
  };
  resizable?: boolean;
}

export interface ExpressionFieldConfig extends CommonFieldProperties {
  type: "expression";
  placeholder?: string;
  defaultValue?: string;
  displayName?: string;
  description?: string;
  exampleExpressions?: string[];
}

// export interface KeyValueFieldConfig extends CommonFieldProperties {
//   type: "key-value";
//   verb?: string;
//   defaultKey?: string;
//   defaultValue?: string;
//   allowEncryption?: string;
//   valueInput?: {
//     type: string;
//     title?: string;
//     placeholder?: string;
//   };
// }

export interface ChoiceChipsFieldConfig extends CommonFieldProperties {
  type: "choiceChips";
  options: OptionValue[];
  isMulti?: boolean;
  defaultValue?: string | string[];
}

export interface SwitchFieldConfig extends CommonFieldProperties {
  type: "switch";
  options: OptionValue[];
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface ScriptFieldConfig {
  type: "script";
  name: string;
  label: string;
  placeholder?: string;
  help?: string;
  tileEditorStep?: string[];
  pluginId?: string;
  activePluginConfigIds?: string[];
}

export interface ObjectsFieldConfig {
  type: "objects";
  name: string;
  label: string;
  placeholder?: string;
  searchPlaceholder?: string;
  description?: string;
  matches: MatchSpec;
  pluginId?: string;
  activePluginConfigIds?: string[];
  objectLimit?: number;
  nodeProperties?: string[];
  tileEditorStep?: ("Timeframe" | "Parameters")[];
  allowVariables?: boolean;
  optionsFormat?: {
    type: "template";
    config: {
      textTemplate: string;
      subtextTemplate?: string;
    };
  };
}

export interface MarkdownFieldConfig {
  type: "markdown";
  name: string;
  content: string;
  tileEditorStep?: ("Timeframe" | "Parameters")[];
}

export interface OAuth2FieldConfig extends CommonFieldProperties {
  type: "oAuth2";
  validation?: FieldValidation;
  provider?: string;
  defaultValue?: number;
}

export interface AwsCreateRoleFieldConfig extends CommonFieldProperties {
  type: "awsCreateRole";
  validation?: FieldValidation;
  defaultValue?: number;
}

export interface PayloadViewerFieldConfig extends CommonFieldProperties {
  type: "payloadViewer";
  defaultValue?: string;
}

export interface ShowConfigValueFieldConfig extends CommonFieldProperties {
  type: "showConfigValue";
  configFieldName: string;
  defaultValue?: string;
}

export interface CustomFieldConfig extends CommonFieldProperties {
  type: "custom";
  children: unknown;
  required?: boolean;
}

export interface FieldGroupConfig extends CommonFieldProperties {
  type: "fieldGroup";
  visible: MatchSpec;
  displayAs?: "tabs" | "tab" | "row" | "inlineFields" | "fieldGroupToggle";
  defaultValue?: string;
  defaultTab?: number;
  defaultField?: string;
  fields: UIConfig[];
  testButtonName?: string;
  testResultField?: PayloadViewerFieldConfig;
}

// ============================================
// TIMEFRAME & IDS
// ============================================

export type TimeframeEnumValue =
  | "last5minutes"
  | "last15minutes"
  | "last30minutes"
  | "last1hour"
  | "last3hours"
  | "last6hours"
  | "last12hours"
  | "last24hours"
  | "last48hours"
  | "last7days"
  | "last30days"
  | "last90days"
  | "last365days"
  | "none";

export type UnresolvedTimeframe =
  | TimeframeEnumValue
  | "dashboard"
  | { start: string; end: string };

export type VariableId = {
  _type: "variable";
  value: string;
};

// ============================================
// DASHBOARD VARIABLES
// ============================================

export interface DashboardVariable {
  id: string;
  name: string;
  scope: DataStreamWorkspaceScope | DataStreamGremlinScope;
  selectedObjects: {
    id: string;
    name: string;
  }[];
  selectedAll: boolean;
  allowMultipleSelection: boolean;
  default: "all" | "none";
}
