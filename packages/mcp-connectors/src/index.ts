import type { MCPConnectorConfig } from '@squaredup/mcp-config-types';

// Import all connectors
import { SquaredUpApiConnectorConfig } from './connectors/squaredup-api';
import { TestConnectorConfig } from './connectors/test';

// Export the Connectors array for discovery
// Using type assertion since MCPConnectorConfig uses `any` for runtime flexibility
export const Connectors = [
    TestConnectorConfig,
    SquaredUpApiConnectorConfig,
] as MCPConnectorConfig[];

// Named exports for direct imports
export { SquaredUpApiConnectorConfig, TestConnectorConfig };

// Re-export types
export type { SquaredUpCredentials } from './connectors/squaredup-api';
export type { TestCredentials } from './connectors/test';
