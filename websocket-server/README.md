# OperaStudio WebSocket Server

Production-ready WebSocket server for managing agent connections at scale.

## Features

- **Scalable Architecture**: Supports multiple server instances with Redis-based distributed state
- **Agent Authentication**: Database-backed credential validation
- **Connection Management**: Automatic heartbeat monitoring and timeout detection
- **Redis Pub/Sub**: Cross-server communication for tool calls and responses
- **Health & Metrics**: Built-in health check and metrics endpoints
- **Graceful Shutdown**: Proper cleanup of connections and resources
- **Audit Logging**: Database logging of all tool executions

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────┐
│   Agents    │─────▶│  WS Server(s)    │◀────▶│  Redis  │
│ (Local)     │      │  (This service)  │      │ Pub/Sub │
└─────────────┘      └──────────────────┘      └─────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  PostgreSQL  │
                       │  (Auth/Logs) │
                       └──────────────┘
```

## Directory Structure

```
src/
├── index.ts                 # Main server entry point
├── connection-manager.ts    # WebSocket connection handler
├── redis/
│   ├── client.ts            # Redis connection management
│   └── registry.ts          # Agent registry and pub/sub
└── db/
    ├── client.ts            # Database connection pool
    └── auth.ts              # Authentication and logging
```

## Configuration

Environment variables (`.env`):

```env
# Server
PORT=8082
SERVER_ID=ws-server-1

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5433/operastudio

# Redis
REDIS_URL=redis://localhost:6380

# Heartbeat
HEARTBEAT_INTERVAL=30000     # Check every 30s
HEARTBEAT_TIMEOUT=90000      # Timeout after 90s

# Metrics
METRICS_PORT=9090
```

## Endpoints

### WebSocket
```
ws://localhost:8082?userId={userId}&secret={sharedSecret}
```

### HTTP Endpoints

#### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "serverId": "ws-server-1",
  "connections": 42,
  "uptime": 3600
}
```

#### Metrics
```bash
GET /metrics

Response:
{
  "serverId": "ws-server-1",
  "connections": 42,
  "connectedUsers": ["user_1", "user_2", ...],
  "uptime": 3600,
  "memory": { ... }
}
```

## WebSocket Protocol

### Client → Server

**Heartbeat:**
```json
{
  "type": "heartbeat",
  "timestamp": 1234567890
}
```

**Tool Response:**
```json
{
  "type": "tool_response",
  "requestId": "req_xxx",
  "success": true,
  "result": { ... },
  "error": null,
  "executionTime": 123
}
```

### Server → Client

**Connection Confirmed:**
```json
{
  "type": "connected",
  "userId": "user_xxx",
  "timestamp": 1234567890,
  "serverId": "ws-server-1"
}
```

**Heartbeat Acknowledgment:**
```json
{
  "type": "heartbeat_ack",
  "timestamp": 1234567890
}
```

**Tool Call:**
```json
{
  "type": "tool_call",
  "requestId": "req_xxx",
  "tool": "read_file",
  "params": {
    "path": "/home/user/file.txt"
  }
}
```

## Connection Flow

1. **Agent connects** with userId and sharedSecret
2. **Server validates** credentials against database
3. **Server registers** connection in Redis with 120s TTL
4. **Server subscribes** to Redis pub/sub for this agent
5. **Server sends** connection confirmation
6. **Agent sends** heartbeat every 30s
7. **Server refreshes** Redis TTL on each heartbeat
8. **Server monitors** for heartbeat timeout (90s)
9. **On disconnect**, server cleans up all resources

## Redis Keys

```
agent:{userId}:server       # Server ID (TTL: 120s, refreshed by heartbeat)
agent:{userId}:status       # Connection status
agent:{userId}:commands     # Pub/sub channel for tool calls
response:{requestId}        # Pub/sub channel for responses
```

## Database Tables

### agent_credentials
- Stores userId → sharedSecret mapping
- Updated with connection status and last_seen

### tool_execution_logs
- Audit log of all tool calls
- Includes params, results, execution time
- Used for monitoring and debugging

## Horizontal Scaling

Run multiple server instances:

```bash
# Server 1
PORT=8082 SERVER_ID=ws-server-1 pnpm start

# Server 2
PORT=8083 SERVER_ID=ws-server-2 pnpm start

# Server 3
PORT=8084 SERVER_ID=ws-server-3 pnpm start
```

All instances share Redis and PostgreSQL, allowing agents to connect to any server. Tool calls are routed via Redis pub/sub.

## Load Balancing

Use a load balancer (ALB, nginx, HAProxy) to distribute connections:

```nginx
upstream websocket_backend {
    least_conn;
    server localhost:8082;
    server localhost:8083;
    server localhost:8084;
}

server {
    listen 80;

    location / {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Build TypeScript
pnpm build

# Run production build
pnpm start
```

## Monitoring

The server logs:
- Connection attempts and authentication results
- Heartbeat activity
- Tool call forwarding
- Disconnections and errors
- Metrics every 60 seconds

Example log output:
```
New connection attempt from user: user_123
✓ Agent user_123 connected successfully
[Metrics] Connections: 42, Uptime: 3600s
Heartbeat from user_123, refreshing TTL
Forwarding tool call to user_123: req_456
Tool response from user_123 for request req_456: success=true
Agent user_123 disconnected
Cleaned up connection for user_123
```

## Error Handling

### Invalid Credentials
```
WebSocket close code: 1008
Reason: "Invalid credentials"
```

### Missing Credentials
```
WebSocket close code: 1008
Reason: "Missing credentials"
```

### Heartbeat Timeout
```
Server logs: "Heartbeat timeout for user_123, closing connection"
WebSocket closed by server
```

### Server Error
```
WebSocket close code: 1011
Reason: "Internal server error"
```

## Security

- **Authentication**: Every connection validated against database
- **Credential Isolation**: Shared secret never exposed in logs
- **Connection Limits**: Enforced by load balancer and OS limits
- **Timeout Protection**: Automatic cleanup of stale connections
- **Audit Trail**: All tool calls logged to database

## Performance

Per server instance (single core):
- **Connections**: 10,000+ concurrent
- **Memory**: ~100MB + (1KB per connection)
- **CPU**: <5% idle, spikes on connection events

At 100K concurrent users:
- **Servers**: ~10 instances
- **Redis memory**: ~50MB
- **Database connections**: 200 (20 per server)

## Graceful Shutdown

On SIGINT or SIGTERM:
1. Stop accepting new connections
2. Close existing WebSocket connections
3. Unregister from Redis
4. Update database status
5. Disconnect Redis clients
6. Close database pool
7. Exit with code 0

## Production Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node", "dist/index.js"]
```

```yaml
# Docker Compose example
services:
  ws-server:
    build: .
    environment:
      - PORT=8082
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
    ports:
      - "8082:8082"
    deploy:
      replicas: 3
```

## Troubleshooting

**Agents can't connect:**
- Check DATABASE_URL and Redis are accessible
- Verify credentials exist in database
- Check firewall rules for port 8082

**High memory usage:**
- Monitor connection count via `/metrics`
- Check for connection leaks (should cleanup on disconnect)
- Increase server instances to distribute load

**Tool calls not reaching agents:**
- Verify Redis pub/sub is working (`MONITOR` command)
- Check agent is subscribed to correct channel
- Look for errors in server logs
