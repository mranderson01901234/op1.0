#!/bin/bash

# Integration Test for Local Environment Assistant
# This script tests the end-to-end flow from API → Redis → WebSocket Server → Agent

set -e

echo "=================================================="
echo "OperaStudio Local Environment Assistant"
echo "End-to-End Integration Test"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEST_USER_ID="test_user_123"
TEST_SECRET=$(openssl rand -hex 32)
WS_URL="ws://localhost:8082"
DB_URL="postgresql://postgres:devpassword@localhost:5433/operastudio"

echo "Step 1: Check Prerequisites"
echo "----------------------------"

# Check if PostgreSQL is running
echo -n "Checking PostgreSQL... "
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "PostgreSQL is not running. Start it with:"
    echo "  cd /home/dp/Documents/op1.0 && docker-compose up -d postgres"
    exit 1
fi

# Check if Redis is running
echo -n "Checking Redis... "
if docker ps | grep -q redis; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Redis is not running. Start it with:"
    echo "  cd /home/dp/Documents/op1.0 && docker-compose up -d redis"
    exit 1
fi

echo ""
echo "Step 2: Create Test User Credentials"
echo "--------------------------------------"

# Get container IDs
POSTGRES_CONTAINER=$(docker ps | grep postgres | awk '{print $1}' | head -1)
REDIS_CONTAINER=$(docker ps | grep redis | awk '{print $1}' | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}✗${NC} PostgreSQL container not found"
    exit 1
fi

if [ -z "$REDIS_CONTAINER" ]; then
    echo -e "${RED}✗${NC} Redis container not found"
    exit 1
fi

# Insert test credentials into database
echo "Creating test user in database..."
echo "INSERT INTO agent_credentials (user_id, shared_secret, platform, status)
VALUES ('$TEST_USER_ID', '$TEST_SECRET', 'linux', 'pending')
ON CONFLICT (user_id) DO UPDATE SET shared_secret = '$TEST_SECRET', status = 'pending';" | docker exec -i $POSTGRES_CONTAINER psql -U postgres -d operastudio

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Test user created"
else
    echo -e "${RED}✗${NC} Failed to create test user"
    exit 1
fi

echo ""
echo "Step 3: Create Test Agent Config"
echo "---------------------------------"

# Create test config directory and file in the actual home directory
# The agent uses os.homedir() which doesn't respect HOME env var
TEST_CONFIG_DIR="$HOME/.operastudio"
TEST_CONFIG_FILE="$TEST_CONFIG_DIR/config.json"

mkdir -p "$TEST_CONFIG_DIR"

cat > "$TEST_CONFIG_FILE" <<EOF
{
  "userId": "$TEST_USER_ID",
  "sharedSecret": "$TEST_SECRET",
  "serverUrl": "$WS_URL",
  "version": "1.0.0",
  "autoStart": false,
  "permissions": {
    "mode": "balanced",
    "allowedDirectories": ["/tmp"]
  },
  "telemetry": {
    "enabled": false,
    "anonymize": false
  }
}
EOF

echo -e "${GREEN}✓${NC} Test config created at $TEST_CONFIG_FILE"

echo ""
echo "Step 4: Start WebSocket Server"
echo "-------------------------------"

# Check if WebSocket server is already running
if lsof -Pi :8082 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}!${NC} WebSocket server already running on port 8082"
else
    echo "Starting WebSocket server in background..."
    cd /home/dp/Documents/op1.0/websocket-server
    pnpm dev > /tmp/ws-server.log 2>&1 &
    WS_PID=$!
    echo "WebSocket server PID: $WS_PID"

    # Wait for server to start
    echo -n "Waiting for server to start"
    for i in {1..10}; do
        if lsof -Pi :8082 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    if ! lsof -Pi :8082 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e " ${RED}✗${NC}"
        echo "Failed to start WebSocket server. Check logs at /tmp/ws-server.log"
        exit 1
    fi
fi

echo ""
echo "Step 5: Create Test File"
echo "------------------------"

# Create a test file to read
TEST_FILE="/tmp/test-read-file.txt"
echo "Hello from OperaStudio Local Agent!" > "$TEST_FILE"
echo -e "${GREEN}✓${NC} Test file created at $TEST_FILE"

echo ""
echo "Step 6: Start Test Agent"
echo "------------------------"

# Start the local agent
echo "Starting local agent in background..."
cd /home/dp/Documents/op1.0/local-agent
pnpm dev > /tmp/agent.log 2>&1 &
AGENT_PID=$!
echo "Agent PID: $AGENT_PID"

# Wait for agent to connect
echo -n "Waiting for agent to connect"
AGENT_CONNECTED=""
for i in {1..20}; do
    # Check Redis for agent connection
    AGENT_CONNECTED=$(docker exec $REDIS_CONTAINER redis-cli GET "agent:$TEST_USER_ID:server" 2>/dev/null)
    if [ ! -z "$AGENT_CONNECTED" ]; then
        echo -e " ${GREEN}✓${NC}"
        echo "Agent connected to server: $AGENT_CONNECTED"
        break
    fi
    # Also check if agent process is still running
    if ! ps -p $AGENT_PID > /dev/null 2>&1; then
        echo -e " ${RED}✗${NC}"
        echo "Agent process died. Check logs at /tmp/agent.log"
        exit 1
    fi
    echo -n "."
    sleep 1
done

if [ -z "$AGENT_CONNECTED" ]; then
    echo -e " ${RED}✗${NC}"
    echo "Agent failed to connect. Check logs:"
    echo "  Agent log: /tmp/agent.log"
    echo "  WS Server log: /tmp/ws-server.log"
    kill $AGENT_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "Step 7: Test Tool Execution"
echo "----------------------------"

# Test read_file tool via Redis pub/sub
echo "Testing read_file tool..."

REQUEST_ID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)

# Publish tool call to Redis
TOOL_CALL_MSG="{\"type\":\"tool_call\",\"requestId\":\"$REQUEST_ID\",\"tool\":\"read_file\",\"params\":{\"path\":\"$TEST_FILE\"}}"

docker exec $REDIS_CONTAINER redis-cli PUBLISH "agent:$TEST_USER_ID:commands" "$TOOL_CALL_MSG" >/dev/null

# Wait for response (subscribe to response channel with timeout)
echo -n "Waiting for response"
RESPONSE=""
LOG_EXISTS="0"
for i in {1..10}; do
    # Check database for execution log
    LOG_EXISTS=$(echo "SELECT COUNT(*) FROM tool_execution_logs WHERE request_id = '$REQUEST_ID';" | docker exec -i $POSTGRES_CONTAINER psql -U postgres -d operastudio -t 2>/dev/null | tr -d ' ')
    if [ "$LOG_EXISTS" -gt "0" ]; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Check if tool was executed
if [ "$LOG_EXISTS" -gt "0" ]; then
    echo -e "${GREEN}✓${NC} Tool execution logged in database"

    # Get execution details
    echo ""
    echo "Execution Details:"
    echo "SELECT tool_name, success, execution_time_ms FROM tool_execution_logs WHERE request_id = '$REQUEST_ID';" | docker exec -i $POSTGRES_CONTAINER psql -U postgres -d operastudio
else
    echo -e "${RED}✗${NC} Tool execution not found in database"
fi

echo ""
echo "Step 8: Cleanup"
echo "---------------"

# Kill agent and server
echo "Stopping agent (PID: $AGENT_PID)..."
kill $AGENT_PID 2>/dev/null || true

if [ ! -z "$WS_PID" ]; then
    echo "Stopping WebSocket server (PID: $WS_PID)..."
    kill $WS_PID 2>/dev/null || true
fi

# Remove test files
rm -f "$TEST_FILE"
# Note: We keep the config file for potential debugging, but you can remove it with:
# rm -rf "$TEST_CONFIG_DIR"

echo -e "${GREEN}✓${NC} Cleanup complete"
echo -e "${YELLOW}!${NC} Test config kept at $TEST_CONFIG_FILE (remove manually if needed)"

echo ""
echo "=================================================="
echo "Integration Test Complete!"
echo "=================================================="
echo ""
echo "Logs available at:"
echo "  - Agent: /tmp/agent.log"
echo "  - WebSocket Server: /tmp/ws-server.log"
echo ""
echo "Test user credentials:"
echo "  - User ID: $TEST_USER_ID"
echo "  - Secret: $TEST_SECRET"
echo ""
