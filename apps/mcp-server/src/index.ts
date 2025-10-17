import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Import all connector factories
import * as Connectors from '@squaredup/mcp-connectors';
import express, { type Request, type Response } from 'express';
import winston from 'winston';

// Connector registry mapping connector keys to their factory functions
const CONNECTOR_REGISTRY: Record<
    string,
    {
        name: string;
        factory: string;
        description?: string;
    }
> = {
    'squaredup-api': { name: 'SquaredUp API', factory: 'createSquaredUpApiServer' },
    test: { name: 'Test', factory: 'createTestServer' },
};

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

const getConnectorByKey = (connectorKey: string) => {
    return CONNECTOR_REGISTRY[connectorKey] || null;
};

const printUsage = () => {
    console.log('🚀 SquaredUp MCP Server');
    console.log('');
    console.log('Usage: npm start -- --connector <connector-key> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --connector    Connector key (required)');
    console.log('  --credentials  JSON string with connector credentials');
    console.log('  --port         Port to run server on (default: 3000)');
    console.log('  --help         Show this help message');
    console.log('');
    const connectorKeys = Object.keys(CONNECTOR_REGISTRY).sort();
    console.log(`Available connectors (${connectorKeys.length}):`);
    console.log(connectorKeys.join(', '));
    console.log('');
    console.log('Examples:');
    console.log('  npm start -- --connector test');
    console.log('  npm start -- --connector squaredup-api --credentials \'{"apiKey":"abcDEf", "region":"us"}\'');
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
        const connectorKeys = Object.keys(CONNECTOR_REGISTRY).sort();
        console.log(`Available connectors (${connectorKeys.length}):`);
        console.log(connectorKeys.join(', '));
        process.exit(1);
    }

    // Parse credentials
    let credentials: Record<string, unknown> = {};

    if (values.credentials) {
        try {
            credentials = JSON.parse(values.credentials);
        } catch (error) {
            console.error('❌ Invalid credentials JSON:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    // Function to create a new MCP server instance using the connector factory
    const getServer = (): McpServer => {
        const factoryName = connectorConfig.factory;
        const factory = (Connectors as Record<string, unknown>)[factoryName];

        if (typeof factory !== 'function') {
            throw new Error(`Factory function "${factoryName}" not found in @stackone/mcp-connectors`);
        }

        // Call the factory function with credentials to get the server instance
        const server = factory(credentials) as McpServer;
        return server;
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
            const server = getServer();
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
    customLogger(`Factory: ${connectorConfig.factory}`, 'info');
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
if (import.meta.url === `file://${process.argv[1]}`) {
    const { app, port } = await startServer();
    app.listen(port, () => {
        customLogger('Server ready and listening for requests!', 'info');
    });
}
