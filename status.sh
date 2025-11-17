#!/bin/bash

# OperaStudio Status Check Script

echo "📊 OperaStudio Service Status"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_port() {
    PORT=$1
    NAME=$2
    if lsof -ti:$PORT > /dev/null 2>&1; then
        PID=$(lsof -ti:$PORT)
        echo -e "${GREEN}✓${NC} $NAME (port $PORT) - PID: $PID"
        return 0
    else
        echo -e "${RED}✗${NC} $NAME (port $PORT) - Not running"
        return 1
    fi
}

check_process() {
    PATTERN=$1
    NAME=$2
    if pgrep -f "$PATTERN" > /dev/null 2>&1; then
        PID=$(pgrep -f "$PATTERN" | head -1)
        echo -e "${GREEN}✓${NC} $NAME - PID: $PID"
        return 0
    else
        echo -e "${RED}✗${NC} $NAME - Not running"
        return 1
    fi
}

# Check services
check_port 3000 "Next.js Web App" || check_port 3001 "Next.js Web App"
check_port 8082 "WebSocket Server"
check_process "electron.*--dev" "Electron Browser Agent"

echo ""
echo "======================================"

# Check log files
echo ""
echo "📝 Recent Logs:"
echo ""

if [ -f "logs/nextjs.log" ]; then
    echo "Next.js (last 3 lines):"
    tail -3 logs/nextjs.log | sed 's/^/  /'
    echo ""
fi

if [ -f "logs/websocket.log" ]; then
    echo "WebSocket (last 3 lines):"
    tail -3 logs/websocket.log | sed 's/^/  /'
    echo ""
fi

if [ -f "logs/electron.log" ]; then
    echo "Electron (last 3 lines):"
    tail -3 logs/electron.log | sed 's/^/  /'
    echo ""
fi

echo "======================================"
echo ""
echo "Commands:"
echo "  ./start-all.sh    - Start all services"
echo "  ./stop-all.sh     - Stop all services"
echo "  ./restart-all.sh  - Restart all services"
echo ""
