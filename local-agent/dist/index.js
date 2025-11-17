#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_client_1 = require("./websocket-client");
const config_1 = require("./config");
const logger = __importStar(require("./logger"));
/**
 * Main entry point for the local agent
 */
async function main() {
    logger.info('Starting OperaStudio Local Agent...');
    try {
        // Load and validate configuration
        const config = (0, config_1.loadConfig)();
        logger.info('Configuration loaded', {
            userId: config.userId,
            serverUrl: config.serverUrl,
            version: config.version,
            permissionMode: config.permissions.mode,
        });
        // Create WebSocket client
        const client = new websocket_client_1.AgentWebSocketClient();
        // Handle graceful shutdown
        const shutdown = () => {
            logger.info('Received shutdown signal');
            client.shutdown();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        logger.info('Agent started successfully');
        logger.info(`Log file: ${logger.getLogPath()}`);
    }
    catch (error) {
        logger.error('Failed to start agent', error);
        console.error('\n❌ Failed to start agent:');
        console.error(error.message);
        console.error('\nPlease ensure you have run the installer and configuration is valid.');
        process.exit(1);
    }
}
// Run the agent
main().catch((error) => {
    logger.error('Unhandled error in main', error);
    console.error('Fatal error:', error);
    process.exit(1);
});
