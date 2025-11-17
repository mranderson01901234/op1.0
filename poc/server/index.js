const { WebSocketServer } = require('ws');
const http = require('http');

// Store active agent connections
const connections = new Map(); // userId → WebSocket

console.log('🚀 Starting WebSocket server...\n');

// HTTP server for health checks
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: connections.size,
      connectedUsers: Array.from(connections.keys())
    }));
    return;
  }

  // API to send tool calls to agents
  if (req.url === '/tool-call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { userId, tool, params } = JSON.parse(body);
        const ws = connections.get(userId);

        if (!ws || ws.readyState !== 1) { // 1 = OPEN
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Agent not connected' }));
          return;
        }

        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Send tool call to agent
        ws.send(JSON.stringify({
          type: 'tool_call',
          requestId,
          tool,
          params
        }));

        console.log(`📤 Sent tool call to ${userId}: ${tool}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, requestId }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Extract userId from query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId') || 'unknown';
  const secret = url.searchParams.get('secret') || 'none';

  console.log(`✅ Agent connected: ${userId} (secret: ${secret.substring(0, 8)}...)`);

  // Store connection
  connections.set(userId, ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    userId,
    timestamp: Date.now()
  }));

  // Handle messages from agent
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'heartbeat') {
        console.log(`💓 Heartbeat from ${userId}`);
        ws.send(JSON.stringify({
          type: 'heartbeat_ack',
          timestamp: Date.now()
        }));
      }

      if (message.type === 'tool_response') {
        console.log(`📥 Tool response from ${userId}: ${message.requestId}`);
        console.log(`   Result:`, message.result);
      }

    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`❌ Agent disconnected: ${userId}`);
    connections.delete(userId);
  });

  ws.on('error', (error) => {
    console.error(`⚠️ WebSocket error for ${userId}:`, error.message);
  });
});

// Start server
const PORT = 8082;
server.listen(PORT, () => {
  console.log(`✅ WebSocket server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}?userId=test&secret=xyz\n`);
});
