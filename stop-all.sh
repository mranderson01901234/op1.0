#!/bin/bash

# OperaStudio Stop All Services Script

echo "🛑 Stopping all OperaStudio services..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Kill processes by PID from .pids file
if [ -f ".pids" ]; then
    echo "Killing processes from PID file..."
    while read PID; do
        if kill -0 $PID 2>/dev/null; then
            kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null
            echo "  Killed PID: $PID"
        fi
    done < .pids
    rm .pids
    print_success "Stopped services from PID file"
else
    print_warning "No PID file found"
fi

# Kill processes on specific ports
echo ""
echo "Freeing ports..."
PORTS=(3000 3001 8082)
for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "  Killing processes on port $PORT"
        kill -9 $PIDS 2>/dev/null || true
        print_success "Port $PORT freed"
    else
        echo "  Port $PORT already free"
    fi
done

# Kill any remaining processes
echo ""
echo "Cleaning up remaining processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true
pkill -f "websocket-server" 2>/dev/null || true

sleep 1

echo ""
print_success "All OperaStudio services stopped"
echo ""
