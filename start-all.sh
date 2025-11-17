#!/bin/bash

# OperaStudio Master Startup Script
# This script kills old processes and starts all services in the correct order

set -e  # Exit on error

echo "🚀 OperaStudio Master Startup Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Kill existing processes
print_step "Step 1: Cleaning up existing processes..."
echo ""

# Kill processes on specific ports
PORTS=(3000 3001 8082)
for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "  Killing processes on port $PORT: $PIDS"
        kill -9 $PIDS 2>/dev/null || true
        print_success "Port $PORT freed"
    else
        echo "  Port $PORT already free"
    fi
done

# Kill any remaining Next.js, Node, Electron processes
print_step "Killing stray processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true
pkill -f "websocket-server" 2>/dev/null || true
sleep 2
print_success "All old processes terminated"
echo ""

# Step 2: Clean build artifacts
print_step "Step 2: Cleaning build artifacts..."
rm -rf .next 2>/dev/null || true
rm -rf electron-browser/.next 2>/dev/null || true
print_success "Build artifacts cleaned"
echo ""

# Step 3: Check if WebSocket server exists
print_step "Step 3: Checking WebSocket server..."
if [ -d "websocket-server" ]; then
    print_success "WebSocket server found"
    HAS_WS_SERVER=true
else
    print_warning "WebSocket server not found (optional)"
    HAS_WS_SERVER=false
fi
echo ""

# Step 4: Check if Electron browser exists
print_step "Step 4: Checking Electron browser agent..."
if [ -d "electron-browser" ] && [ -f "electron-browser/package.json" ]; then
    print_success "Electron browser agent found"
    HAS_ELECTRON=true
else
    print_warning "Electron browser agent not found (optional)"
    HAS_ELECTRON=false
fi
echo ""

# Step 5: Start services
print_step "Step 5: Starting services..."
echo ""

# Create logs directory
mkdir -p logs

# Start WebSocket server (if exists)
if [ "$HAS_WS_SERVER" = true ]; then
    print_step "Starting WebSocket server on port 8082..."
    cd websocket-server
    pnpm dev > ../logs/websocket.log 2>&1 &
    WS_PID=$!
    cd ..
    echo "  PID: $WS_PID"
    print_success "WebSocket server started"
    sleep 2
else
    print_warning "Skipping WebSocket server (not found)"
fi

# Start Next.js web app
print_step "Starting Next.js web app..."
pnpm dev > logs/nextjs.log 2>&1 &
NEXT_PID=$!
echo "  PID: $NEXT_PID"
print_success "Next.js starting..."

# Wait for Next.js to be ready
print_step "Waiting for Next.js to be ready..."
sleep 5

# Check if Next.js is running
if lsof -ti:3000 > /dev/null 2>&1 || lsof -ti:3001 > /dev/null 2>&1; then
    if lsof -ti:3001 > /dev/null 2>&1; then
        NEXT_PORT=3001
        print_warning "Next.js running on port 3001 (3000 was busy)"
    else
        NEXT_PORT=3000
        print_success "Next.js running on port 3000"
    fi
else
    print_error "Next.js failed to start. Check logs/nextjs.log"
    tail -20 logs/nextjs.log
    exit 1
fi

# Start Electron browser agent (if exists)
if [ "$HAS_ELECTRON" = true ]; then
    print_step "Starting Electron browser agent..."
    cd electron-browser

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Installing Electron dependencies..."
        npm install > ../logs/electron-install.log 2>&1
    fi

    npm run dev > ../logs/electron.log 2>&1 &
    ELECTRON_PID=$!
    cd ..
    echo "  PID: $ELECTRON_PID"
    print_success "Electron browser agent started"
    sleep 2
else
    print_warning "Skipping Electron browser agent (not found)"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo "======================================"
echo ""

# Display service status
print_step "Service Status:"
echo ""

if [ "$HAS_WS_SERVER" = true ]; then
    echo "  🌐 WebSocket Server:"
    echo "     URL: ws://localhost:8082"
    echo "     Logs: logs/websocket.log"
    echo "     PID: $WS_PID"
    echo ""
fi

echo "  🖥️  Next.js Web App:"
echo "     URL: http://localhost:$NEXT_PORT"
echo "     Logs: logs/nextjs.log"
echo "     PID: $NEXT_PID"
echo ""

if [ "$HAS_ELECTRON" = true ]; then
    echo "  🤖 Electron Browser Agent:"
    echo "     Status: Running in system tray"
    echo "     Logs: logs/electron.log"
    echo "     PID: $ELECTRON_PID"
    echo ""
fi

echo "======================================"
print_step "Quick Commands:"
echo ""
echo "  View Next.js logs:      tail -f logs/nextjs.log"
if [ "$HAS_WS_SERVER" = true ]; then
    echo "  View WebSocket logs:    tail -f logs/websocket.log"
fi
if [ "$HAS_ELECTRON" = true ]; then
    echo "  View Electron logs:     tail -f logs/electron.log"
fi
echo "  Stop all services:      ./stop-all.sh"
echo "  Restart all:            ./restart-all.sh"
echo ""
echo "======================================"
echo -e "${GREEN}Ready to use!${NC} Open http://localhost:$NEXT_PORT in your browser"
echo ""

# Save PIDs to file for stop script
echo "$NEXT_PID" > .pids
if [ "$HAS_WS_SERVER" = true ]; then
    echo "$WS_PID" >> .pids
fi
if [ "$HAS_ELECTRON" = true ]; then
    echo "$ELECTRON_PID" >> .pids
fi

# Keep script running to show logs in real-time
print_step "Monitoring logs (Ctrl+C to stop viewing, services will continue)..."
echo ""

# Trap Ctrl+C to prevent killing services
trap 'echo ""; echo "Services still running. Use ./stop-all.sh to stop them."; exit 0' INT

# Show combined logs
tail -f logs/nextjs.log 2>/dev/null &
TAIL_PID=$!

# Wait for user to Ctrl+C
wait $TAIL_PID
