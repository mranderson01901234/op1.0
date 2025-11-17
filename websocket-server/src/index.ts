#!/usr/bin/env node

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { parse } from 'url';
import dotenv from 'dotenv';
import { ConnectionManager } from './connection-manager';
import { getRedis, disconnectAll as disconnectRedis } from './redis/client';
import { disconnect as disconnectDb } from './db/client';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '8082');
const SERVER_ID = process.env.SERVER_ID || `ws-server-${process.pid}`;

/**
 * Main WebSocket server
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('OperaStudio WebSocket Server');
  console.log('='.repeat(60));
  console.log(`Server ID: ${SERVER_ID}`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));

  // Initialize Redis and Database connections
  console.log('Initializing connections...');
  const redis = getRedis();
  await redis.ping();
  console.log('✓ Redis connected');

  // Create HTTP server
  const httpServer = createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        serverId: SERVER_ID,
        connections: connectionManager.getConnectionCount(),
        uptime: process.uptime(),
      }));
      return;
    }

    // Metrics endpoint
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        serverId: SERVER_ID,
        connections: connectionManager.getConnectionCount(),
        connectedUsers: connectionManager.getConnectedUsers(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  // Create connection manager
  const connectionManager = new ConnectionManager();

  // Handle WebSocket connections
  wss.on('connection', async (ws, req) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      const userId = parsedUrl.query.userId as string;
      const secret = parsedUrl.query.secret as string;

      if (!userId || !secret) {
        console.warn('Connection rejected: missing userId or secret');
        ws.close(1008, 'Missing credentials');
        return;
      }

      await connectionManager.handleConnection(ws, userId, secret);
    } catch (error) {
      console.error('Error handling connection:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`\n✓ WebSocket server listening on port ${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log(`  Health:    http://localhost:${PORT}/health`);
    console.log(`  Metrics:   http://localhost:${PORT}/metrics`);
    console.log('\nServer is ready to accept connections.\n');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new connections
    wss.close(() => {
      console.log('✓ WebSocket server closed');
    });

    // Close existing connections
    await connectionManager.shutdown();

    // Close HTTP server
    httpServer.close(() => {
      console.log('✓ HTTP server closed');
    });

    // Disconnect Redis and Database
    await disconnectRedis();
    console.log('✓ Redis disconnected');

    await disconnectDb();
    console.log('✓ Database disconnected');

    console.log('\nShutdown complete. Goodbye!\n');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Log metrics periodically
  setInterval(() => {
    console.log(`[Metrics] Connections: ${connectionManager.getConnectionCount()}, Uptime: ${Math.floor(process.uptime())}s`);
  }, 60000); // Every minute
}

// Run the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
