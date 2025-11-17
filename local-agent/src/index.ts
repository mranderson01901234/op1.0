#!/usr/bin/env node

import { AgentWebSocketClient } from './websocket-client';
import { loadConfig } from './config';
import * as logger from './logger';

/**
 * Main entry point for the local agent
 */
async function main(): Promise<void> {
  logger.info('Starting OperaStudio Local Agent...');

  try {
    // Load and validate configuration
    const config = loadConfig();
    logger.info('Configuration loaded', {
      userId: config.userId,
      serverUrl: config.serverUrl,
      version: config.version,
      permissionMode: config.permissions.mode,
    });

    // Create WebSocket client
    const client = new AgentWebSocketClient();

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
  } catch (error: any) {
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
