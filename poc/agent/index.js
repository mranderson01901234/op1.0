const WebSocket = require('ws');

// Configuration
const USER_ID = 'test-user-123';
const SECRET = 'test-secret-abc123';
const SERVER_URL = 'ws://localhost:8082';

console.log('🤖 Starting local agent POC...\n');

let ws = null;
let reconnectDelay = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 60000; // Max 60 seconds

function connect() {
  const url = `${SERVER_URL}?userId=${USER_ID}&secret=${SECRET}`;

  console.log(`🔌 Connecting to ${SERVER_URL}...`);

  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('✅ Connected to server\n');
    reconnectDelay = 1000; // Reset delay on successful connection

    // Start heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
        console.log('💓 Sent heartbeat');
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Send initial ping
    ws.send(JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      console.log(`📥 Received: ${message.type}`);

      if (message.type === 'connected') {
        console.log(`   Welcome! Server confirmed connection for ${message.userId}\n`);
      }

      if (message.type === 'heartbeat_ack') {
        console.log(`   Server alive at ${new Date(message.timestamp).toLocaleTimeString()}`);
      }

      if (message.type === 'tool_call') {
        console.log(`\n🔧 Tool call received:`);
        console.log(`   Request ID: ${message.requestId}`);
        console.log(`   Tool: ${message.tool}`);
        console.log(`   Params:`, message.params);

        // Simulate tool execution
        executeTool(message.tool, message.params)
          .then(result => {
            console.log(`   ✅ Tool executed successfully`);

            // Send response back to server
            ws.send(JSON.stringify({
              type: 'tool_response',
              requestId: message.requestId,
              success: true,
              result
            }));

            console.log(`   📤 Sent response\n`);
          })
          .catch(error => {
            console.log(`   ❌ Tool execution failed: ${error.message}`);

            ws.send(JSON.stringify({
              type: 'tool_response',
              requestId: message.requestId,
              success: false,
              error: error.message
            }));
          });
      }

    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('\n❌ Disconnected from server');
    console.log(`   Reconnecting in ${reconnectDelay / 1000} seconds...\n`);

    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connect();
    }, reconnectDelay);
  });

  ws.on('error', (error) => {
    console.error('⚠️ WebSocket error:', error.message);
  });
}

// Simulate tool execution
async function executeTool(toolName, params) {
  console.log(`   ⏳ Executing ${toolName}...`);

  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock tool implementations
  switch (toolName) {
    case 'read_file':
      return {
        content: `This is mock content from ${params.path}.\nLine 2 of the file.\nLine 3 of the file.`,
        size: 123,
        path: params.path
      };

    case 'write_file':
      return {
        success: true,
        bytesWritten: params.content?.length || 0,
        path: params.path
      };

    case 'list_files':
      return {
        files: [
          { name: 'file1.txt', type: 'file', size: 1024 },
          { name: 'file2.txt', type: 'file', size: 2048 },
          { name: 'subfolder', type: 'directory' }
        ],
        path: params.path
      };

    case 'execute_command':
      return {
        stdout: 'Command output here\nLine 2',
        stderr: '',
        exitCode: 0,
        executionTime: 450
      };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Start connection
connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down agent...');
  if (ws) {
    ws.close();
  }
  process.exit(0);
});
