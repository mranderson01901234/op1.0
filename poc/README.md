# Local Environment Assistant - Proof of Concept

This POC validates that a local agent can communicate with a cloud WebSocket server with no CORS issues.

## Architecture

```
Local Agent (agent/) ←→ WebSocket Server (server/) ←→ Your Next.js App
     Node.js                   Port 8080                  Port 3000
```

## Quick Start

### 1. Install Dependencies

```bash
# Install server dependencies
cd poc/server
pnpm install

# Install agent dependencies
cd ../agent
pnpm install
```

### 2. Start WebSocket Server

```bash
cd poc/server
pnpm start
```

Expected output:
```
🚀 Starting WebSocket server...
✅ WebSocket server running on port 8080
📊 Health check: http://localhost:8080/health
🔌 WebSocket URL: ws://localhost:8080?userId=test&secret=xyz
```

### 3. Start Local Agent

Open a new terminal:

```bash
cd poc/agent
pnpm start
```

Expected output:
```
🤖 Starting local agent POC...
🔌 Connecting to ws://localhost:8080...
✅ Connected to server
📥 Received: connected
   Welcome! Server confirmed connection for test-user-123
```

### 4. Test Tool Calls

Open a third terminal:

```bash
cd poc
./test-tool-call.sh
```

You should see:
- Agent receives tool calls
- Agent executes mock tools
- Agent sends responses back
- Server receives responses

## What This Proves

✅ WebSocket connection works (no CORS issues)
✅ Bidirectional communication works
✅ Agent can receive tool calls from server
✅ Agent can execute tools and respond
✅ Server can route messages to correct agent
✅ Reconnection works (try stopping and restarting agent)

## Manual Testing

### Check Server Health

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok",
  "connections": 1,
  "connectedUsers": ["test-user-123"]
}
```

### Send Tool Call Manually

```bash
curl -X POST http://localhost:8080/tool-call \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tool": "read_file",
    "params": {
      "path": "/tmp/test.txt"
    }
  }'
```

Response:
```json
{
  "success": true,
  "requestId": "req_1234567890_abc"
}
```

Check agent terminal - you should see it execute the tool and respond.

## Next Steps

Once this POC is working:

1. ✅ Phase 0 complete - Architecture validated
2. → Phase 1: Add Redis for distributed state
3. → Phase 1: Add PostgreSQL for credentials
4. → Phase 2: Implement real file operations in agent
5. → Phase 3: Integrate with Gemini LLM in your chat API
6. → Phase 4: Build standalone binaries
7. → Phase 5: Build installers
8. → Production!

## Troubleshooting

**Agent can't connect:**
- Make sure server is running on port 8080
- Check firewall isn't blocking port 8080

**Tool calls not working:**
- Verify userId in curl command matches agent's USER_ID
- Check both terminals for error messages

**Want to test with multiple agents:**
- Change USER_ID in agent/index.js
- Run multiple agent instances
- Send tool calls to different userIds
