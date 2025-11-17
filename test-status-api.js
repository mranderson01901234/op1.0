#!/usr/bin/env node

/**
 * Test script to validate local environment integration status
 * Tests Redis connectivity, database connectivity, and agent status
 */

const { Redis } = require('ioredis');
const { Client } = require('pg');

// Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:devpassword@localhost:5433/operastudio';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`! ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function testRedis() {
  log('\n=== Testing Redis Connection ===');
  
  try {
    const redis = new Redis(REDIS_URL);
    
    // Test basic connection
    await redis.ping();
    logSuccess('Redis connection successful');
    
    // Get Redis info
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      logInfo(`Redis version: ${versionMatch[1]}`);
    }
    
    // Check agent registry
    const keys = await redis.keys('agent:*:server');
    if (keys.length > 0) {
      logSuccess(`Found ${keys.length} registered agent(s)`);
      
      for (const key of keys) {
        const serverId = await redis.get(key);
        const userId = key.replace('agent:', '').replace(':server', '');
        logInfo(`  - User: ${userId} → Server: ${serverId}`);
      }
    } else {
      logInfo('No agents currently registered');
    }
    
    await redis.quit();
    return true;
  } catch (error) {
    logError(`Redis connection failed: ${error.message}`);
    return false;
  }
}

async function testDatabase() {
  log('\n=== Testing Database Connection ===');
  
  try {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    logSuccess('Database connection successful');
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('agent_credentials', 'tool_execution_logs')
    `);
    
    if (tablesResult.rows.length >= 2) {
      logSuccess(`Required tables exist (${tablesResult.rows.length}/2)`);
    } else {
      logError(`Missing tables (found ${tablesResult.rows.length}/2)`);
    }
    
    // Check credentials count
    const credsResult = await client.query('SELECT COUNT(*) as count FROM agent_credentials');
    const credCount = parseInt(credsResult.rows[0].count);
    logInfo(`Total credentials: ${credCount}`);
    
    // Check active connections
    const activeResult = await client.query(
      "SELECT COUNT(*) as count FROM agent_credentials WHERE status = 'connected'"
    );
    const activeCount = parseInt(activeResult.rows[0].count);
    if (activeCount > 0) {
      logSuccess(`Active connections: ${activeCount}`);
    } else {
      logInfo('No active connections');
    }
    
    await client.end();
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    return false;
  }
}

async function testAgentStatus(userId) {
  log('\n=== Testing Agent Status ===');
  
  if (!userId) {
    logWarning('No userId provided, skipping agent status test');
    return true;
  }
  
  try {
    const redis = new Redis(REDIS_URL);
    const key = `agent:${userId}:server`;
    const serverId = await redis.get(key);
    
    if (serverId) {
      logSuccess(`Agent is connected for user: ${userId}`);
      logInfo(`Connected to server: ${serverId}`);
      
      // Check TTL
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        logInfo(`Connection TTL: ${ttl} seconds`);
      }
      
      await redis.quit();
      return true;
    } else {
      logWarning(`No agent connected for user: ${userId}`);
      await redis.quit();
      return false;
    }
  } catch (error) {
    logError(`Agent status check failed: ${error.message}`);
    return false;
  }
}

async function testWebSocketServer() {
  log('\n=== Testing WebSocket Server ===');
  
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      const req = http.get('http://localhost:8082/health', (res) => {
        if (res.statusCode === 200) {
          logSuccess('WebSocket server health check passed');
          resolve(true);
        } else {
          logWarning(`WebSocket server returned status: ${res.statusCode}`);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        logError(`WebSocket server not reachable: ${error.message}`);
        resolve(false);
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        logError('WebSocket server health check timed out');
        resolve(false);
      });
    });
  } catch (error) {
    logError(`WebSocket server test failed: ${error.message}`);
    return false;
  }
}

async function testNextJsAPI() {
  log('\n=== Testing Next.js API ===');
  
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000/api/agent/status', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 401) {
            logSuccess('Next.js API is running (authentication required)');
            resolve(true);
          } else if (res.statusCode === 200) {
            logSuccess('Next.js API is running and responding');
            try {
              const json = JSON.parse(data);
              logInfo(`Response: ${JSON.stringify(json, null, 2)}`);
            } catch (e) {
              // Not JSON, that's okay
            }
            resolve(true);
          } else {
            logWarning(`Next.js API returned status: ${res.statusCode}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        logError(`Next.js API not reachable: ${error.message}`);
        logInfo('Start the API with: pnpm dev');
        resolve(false);
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        logError('Next.js API request timed out');
        resolve(false);
      });
    });
  } catch (error) {
    logError(`Next.js API test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  log('\n==================================================');
  log('OperaStudio Local Environment Assistant');
  log('Integration Status Test (Node.js)');
  log('==================================================');
  
  const results = {
    redis: false,
    database: false,
    websocket: false,
    nextjs: false,
  };
  
  // Test Redis
  results.redis = await testRedis();
  
  // Test Database
  results.database = await testDatabase();
  
  // Test WebSocket Server
  results.websocket = await testWebSocketServer();
  
  // Test Next.js API
  results.nextjs = await testNextJsAPI();
  
  // Test agent status if userId provided
  const userId = process.argv[2];
  if (userId) {
    await testAgentStatus(userId);
  }
  
  // Summary
  log('\n=== Summary ===');
  log(`Redis: ${results.redis ? '✓' : '✗'}`);
  log(`Database: ${results.database ? '✓' : '✗'}`);
  log(`WebSocket Server: ${results.websocket ? '✓' : '✗'}`);
  log(`Next.js API: ${results.nextjs ? '✓' : '✗'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

