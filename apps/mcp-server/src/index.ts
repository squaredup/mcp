import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    buildServerFromConnector,
    type ConnectorContext,
    type MCPConnectorConfig,
} from '@squaredup/mcp-config-types';

// Import all connectors
import { Connectors } from '@squaredup/mcp-connectors';
import express, { type Request, type Response } from 'express';
import winston from 'winston';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Configure winston logger for file output
const fileLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        // Write all logs to server.log
        new winston.transports.File({
            filename: path.join(logsDir, 'server.log'),
            options: { flags: 'a' }, // Append mode
        }),
        // Also log to console for development
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
    ],
});

// Helper to format timestamps for logs
const getTimestamp = () => new Date().toISOString();

// Custom logger that writes to both console and file
const customLogger = (
    message: string,
    level: 'info' | 'error' | 'debug' | 'warn' = 'info',
    meta?: Record<string, unknown>,
) => {
    const timestamp = getTimestamp();
    const prefix = {
        info: '📘',
        error: '❌',
        debug: '🔍',
        warn: '⚠️',
    }[level];

    // Console output for immediate feedback
    console.log(`[${timestamp}] ${prefix} ${message}`);

    // File output for agent to read
    fileLogger.log(level, message, { ...meta, timestamp });
};

// Find connector by key from the Connectors array
const getConnectorByKey = (connectorKey: string): MCPConnectorConfig | null => {
    return Connectors.find((c) => c.key === connectorKey) ?? null;
};

const printUsage = () => {
    console.log('🚀 SquaredUp MCP Server');
    console.log('');
    console.log('Usage: npm start -- --connector <connector-key> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --connector    Connector key (required)');
    console.log('  --credentials  JSON string with connector credentials');
    console.log('  --setup        JSON string with connector setup configuration');
    console.log('  --port         Port to run server on (default: 3000)');
    console.log('  --help         Show this help message');
    console.log('');
    const connectorKeys = Connectors.map((c) => c.key).sort();
    console.log(`Available connectors (${connectorKeys.length}):`);
    for (const connector of Connectors) {
        console.log(`  ${connector.key} - ${connector.name}`);
        if (connector.description) {
            console.log(`    ${connector.description}`);
        }
    }
    console.log('');
    console.log('Examples:');
    console.log('  npm start -- --connector test');
    console.log(
        '  npm start -- --connector squaredup-api --credentials \'{"apiKey":"abcDEf", "region":"us"}\'',
    );
};

/**
 * Creates a ConnectorContext for the given credentials and setup.
 * This is a simple in-memory implementation.
 */
const createContext = <C, S>(credentials: C, setup: S): ConnectorContext<C, S> => {
    const dataStore = new Map<string, unknown>();
    const cacheStore = new Map<string, string>();

    return {
        getCredentials: async () => credentials,
        getSetup: async () => setup,
        getData: async <T = unknown>(key?: string): Promise<T | null> => {
            if (key === undefined) {
                const obj: Record<string, unknown> = {};
                for (const [k, v] of dataStore.entries()) {
                    obj[k] = v;
                }
                return obj as T;
            }
            return (dataStore.get(key) as T) ?? null;
        },
        setData: async (
            keyOrData: string | Record<string, unknown>,
            value?: unknown,
        ): Promise<void> => {
            if (typeof keyOrData === 'string') {
                dataStore.set(keyOrData, value);
            } else {
                for (const [k, v] of Object.entries(keyOrData)) {
                    dataStore.set(k, v);
                }
            }
        },
        readCache: async (key: string): Promise<string | null> => {
            return cacheStore.get(key) ?? null;
        },
        writeCache: async (key: string, value: string): Promise<void> => {
            cacheStore.set(key, value);
        },
    };
};

export const startServer = async (): Promise<{
    app: express.Application;
    port: number;
    url: string;
}> => {
    const { values } = parseArgs({
        args: process.argv.slice(2),
        options: {
            connector: {
                type: 'string',
                short: 'c',
            },
            credentials: {
                type: 'string',
            },
            setup: {
                type: 'string',
            },
            port: {
                type: 'string',
                default: '3000',
            },
            help: {
                type: 'boolean',
                short: 'h',
            },
        },
        strict: true,
        allowPositionals: true,
    });

    if (values.help) {
        printUsage();
        process.exit(0);
    }

    const connectorKey = values.connector;

    if (!connectorKey) {
        console.error('❌ Connector key is required');
        console.log('');
        printUsage();
        process.exit(1);
    }

    const connectorConfig = getConnectorByKey(connectorKey);

    if (!connectorConfig) {
        console.error(`❌ Connector "${connectorKey}" not found`);
        console.log('');
        const connectorKeys = Connectors.map((c) => c.key).sort();
        console.log(`Available connectors (${connectorKeys.length}):`);
        console.log(connectorKeys.join(', '));
        process.exit(1);
    }

    // Parse credentials (supports JSON string or file path)
    let credentials: Record<string, unknown> = {};
    if (values.credentials) {
        try {
            credentials = JSON.parse(values.credentials);
        } catch {
            // If JSON parsing fails, try to read as file path
            const credentialPath = path.resolve(values.credentials);
            if (fs.existsSync(credentialPath)) {
                try {
                    const fileContent = fs.readFileSync(credentialPath, 'utf-8');
                    credentials = JSON.parse(fileContent);
                    console.log(`📁 Loaded credentials from: ${credentialPath}`);
                } catch (fileError) {
                    console.error(
                        '❌ Failed to parse credentials file:',
                        fileError instanceof Error ? fileError.message : String(fileError),
                    );
                    process.exit(1);
                }
            } else {
                console.error(
                    '❌ Invalid credentials: not valid JSON and file not found at:',
                    credentialPath,
                );
                process.exit(1);
            }
        }
    }

    // Parse setup configuration
    let setup: Record<string, unknown> = {};
    if (values.setup) {
        try {
            setup = JSON.parse(values.setup);
        } catch (error) {
            console.error(
                '❌ Invalid setup JSON:',
                error instanceof Error ? error.message : String(error),
            );
            process.exit(1);
        }
    }

    // Create context with parsed credentials and setup
    const context = createContext(credentials, setup);

    // Function to create a new MCP server instance using the connector config
    const getServer = async (): Promise<McpServer> => {
        return buildServerFromConnector(connectorConfig, context);
    };

    // Create Express app
    const app = express();
    app.use(express.json());

    // Add logging middleware
    app.use((req, _res, next) => {
        customLogger(`Request: ${req.method} ${req.url}`, 'info', {
            method: req.method,
            url: req.url,
            headers: req.headers,
        });
        next();
    });

    // Handle POST requests in stateless mode
    app.post('/mcp', async (req: Request, res: Response) => {
        const requestId = randomUUID();
        customLogger(`MCP request received [${requestId}]`, 'info', {
            requestId,
            method: req.method,
            url: req.url,
        });

        // In stateless mode, create a new instance of transport and server for each request
        // to ensure complete isolation. A single instance would cause request ID collisions
        // when multiple clients connect concurrently.
        try {
            const server = await getServer();
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined, // Stateless mode - no sessions
            });

            res.on('close', () => {
                customLogger(`Request closed [${requestId}]`, 'debug');
                transport.close();
                server.close();
            });

            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);

            customLogger(`MCP request completed [${requestId}]`, 'info', {
                requestId,
            });
        } catch (error) {
            customLogger(
                `MCP request failed [${requestId}]: ${error instanceof Error ? error.message : String(error)}`,
                'error',
                {
                    requestId,
                    error: error instanceof Error ? error.message : String(error),
                },
            );

            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                        data: error instanceof Error ? error.message : String(error),
                    },
                    id: null,
                });
            }
        }
    });

    // SSE notifications not supported in stateless mode
    app.get('/mcp', async (_req: Request, res: Response) => {
        customLogger('GET request not supported in stateless mode', 'warn');
        res.status(405).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed in stateless mode',
            },
            id: null,
        });
    });

    // Session termination not needed in stateless mode
    app.delete('/mcp', async (_req: Request, res: Response) => {
        customLogger('DELETE request not supported in stateless mode', 'warn');
        res.status(405).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed in stateless mode',
            },
            id: null,
        });
    });

    const port = Number.parseInt(values.port || '3000', 10);
    const url = `http://localhost:${port}/mcp`;

    customLogger('Starting SquaredUp MCP Server (Stateless Mode)...', 'info');
    customLogger(`Connector: ${connectorConfig.name} (${connectorKey})`, 'info');
    customLogger(`Port: ${port}`, 'info');
    customLogger(`Log file: ${path.join(logsDir, 'server.log')}`, 'info');

    if (Object.keys(credentials).length > 0) {
        customLogger(`Credentials: ${Object.keys(credentials).length} keys provided`, 'info');
    } else {
        customLogger('Warning: No credentials provided', 'warn');
    }

    customLogger(`MCP endpoint: ${url}`, 'info');
    customLogger('Mode: Stateless (no session management)', 'info');

    return { app, port, url };
};

// Only start the server if this is the main module
const currentFile = fileURLToPath(import.meta.url);
const mainFile = path.resolve(process.argv[1]);
if (currentFile === mainFile) {
    const { app, port } = await startServer();
    app.listen(port, () => {
        customLogger('Server ready and listening for requests!', 'info');
    });
}
