#!/bin/bash

# OperaStudio Master Restart Script
# Restarts all services: Next.js web app, WebSocket server, and Local Agent

set -e  # Exit on error

echo "🔄 OperaStudio Master Restart Script"
echo "====================================="
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

# Step 1: Stop all existing services
print_step "Step 1: Stopping all existing services..."
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

# Kill any remaining Next.js, Node, pnpm processes
print_step "Killing stray processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "tsx.*websocket-server" 2>/dev/null || true
pkill -f "tsx.*local-agent" 2>/dev/null || true
pkill -f "websocket-server" 2>/dev/null || true
pkill -f "local-agent" 2>/dev/null || true

# Kill processes from .pids file if it exists
if [ -f .pids ]; then
    print_step "Killing processes from .pids file..."
    while read pid; do
        if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null || true
            echo "  Killed PID: $pid"
        fi
    done < .pids
    rm -f .pids
fi

sleep 2
print_success "All old processes terminated"
echo ""

# Step 2: Clean build artifacts
print_step "Step 2: Cleaning build artifacts..."
rm -rf .next 2>/dev/null || true
rm -rf websocket-server/dist 2>/dev/null || true
rm -rf local-agent/dist 2>/dev/null || true
print_success "Build artifacts cleaned"
echo ""

# Step 3: Check service directories
print_step "Step 3: Checking service directories..."

HAS_WS_SERVER=false
HAS_LOCAL_AGENT=false

if [ -d "websocket-server" ] && [ -f "websocket-server/package.json" ]; then
    print_success "WebSocket server found"
    HAS_WS_SERVER=true
else
    print_warning "WebSocket server not found (optional)"
fi

if [ -d "local-agent" ] && [ -f "local-agent/package.json" ]; then
    print_success "Local agent found"
    HAS_LOCAL_AGENT=true
else
    print_warning "Local agent not found (optional)"
fi
echo ""

# Step 4: Start services
print_step "Step 4: Starting services..."
echo ""

# Create logs directory
mkdir -p logs

# Start WebSocket server (if exists)
if [ "$HAS_WS_SERVER" = true ]; then
    print_step "Starting WebSocket server on port 8082..."
    cd websocket-server
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Installing WebSocket server dependencies..."
        pnpm install > ../logs/websocket-install.log 2>&1
    fi
    
    pnpm dev > ../logs/websocket.log 2>&1 &
    WS_PID=$!
    cd ..
    echo "  PID: $WS_PID"
    print_success "WebSocket server started"
    sleep 3
    
    # Verify WebSocket server is running
    if lsof -ti:8082 > /dev/null 2>&1; then
        print_success "WebSocket server verified on port 8082"
    else
        print_warning "WebSocket server may not have started. Check logs/websocket.log"
    fi
else
    print_warning "Skipping WebSocket server (not found)"
fi

# Start Next.js web app
print_step "Starting Next.js web app..."
if [ ! -d "node_modules" ]; then
    print_warning "Installing Next.js dependencies..."
    pnpm install > logs/nextjs-install.log 2>&1
fi

pnpm dev > logs/nextjs.log 2>&1 &
NEXT_PID=$!
echo "  PID: $NEXT_PID"
print_success "Next.js starting..."

# Wait for Next.js to be ready with retry logic
print_step "Waiting for Next.js to be ready..."
NEXT_PORT=""
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    # Check if Next.js is running on port 3000
    if lsof -ti:3000 > /dev/null 2>&1; then
        NEXT_PORT=3000
        print_success "Next.js running on port 3000"
        break
    fi
    
    # Check if Next.js is running on port 3001
    if lsof -ti:3001 > /dev/null 2>&1; then
        NEXT_PORT=3001
        print_warning "Next.js running on port 3001 (3000 was busy)"
        break
    fi
    
    # Check if process is still alive
    if ! kill -0 $NEXT_PID 2>/dev/null; then
        print_error "Next.js process died. Check logs/nextjs.log"
        tail -30 logs/nextjs.log
        exit 1
    fi
    
    # Show progress every 5 seconds
    if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
        echo "  Still waiting... ($WAIT_COUNT/$MAX_WAIT seconds)"
    fi
done

# Final check
if [ -z "$NEXT_PORT" ]; then
    print_error "Next.js failed to start within $MAX_WAIT seconds. Check logs/nextjs.log"
    echo ""
    echo "Last 30 lines of log:"
    tail -30 logs/nextjs.log
    echo ""
    print_warning "Process may still be starting. Check logs/nextjs.log manually."
    # Don't exit - let user see logs
    NEXT_PORT=3000  # Default assumption
fi

# Start Local Agent (if exists)
if [ "$HAS_LOCAL_AGENT" = true ]; then
    print_step "Starting Local Agent..."
    cd local-agent
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Installing Local Agent dependencies..."
        pnpm install > ../logs/agent-install.log 2>&1
    fi
    
    pnpm dev > ../logs/agent.log 2>&1 &
    AGENT_PID=$!
    cd ..
    echo "  PID: $AGENT_PID"
    print_success "Local Agent started"
    sleep 2
else
    print_warning "Skipping Local Agent (not found)"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ All services restarted successfully!${NC}"
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

if [ "$HAS_LOCAL_AGENT" = true ]; then
    echo "  🤖 Local Agent:"
    echo "     Status: Running"
    echo "     Logs: logs/agent.log"
    echo "     PID: $AGENT_PID"
    echo ""
fi

echo "======================================"
print_step "Quick Commands:"
echo ""
echo "  View Next.js logs:      tail -f logs/nextjs.log"
if [ "$HAS_WS_SERVER" = true ]; then
    echo "  View WebSocket logs:    tail -f logs/websocket.log"
fi
if [ "$HAS_LOCAL_AGENT" = true ]; then
    echo "  View Agent logs:        tail -f logs/agent.log"
fi
echo "  Stop all services:      pkill -f 'next dev|pnpm dev|tsx'"
echo "  Restart all:            ./restart-all.sh"
echo ""
echo "======================================"
echo -e "${GREEN}Ready to use!${NC} Open http://localhost:$NEXT_PORT in your browser"
echo ""

# Save PIDs to file for reference
echo "$NEXT_PID" > .pids
if [ "$HAS_WS_SERVER" = true ]; then
    echo "$WS_PID" >> .pids
fi
if [ "$HAS_LOCAL_AGENT" = true ]; then
    echo "$AGENT_PID" >> .pids
fi

print_success "PIDs saved to .pids file"
echo ""

# Keep script running to monitor logs
print_step "Services are running. Monitoring logs (Ctrl+C to stop monitoring, services will continue)..."
echo ""
echo "======================================"
echo ""

# Trap Ctrl+C to prevent killing services
trap 'echo ""; echo "======================================"; echo -e "${GREEN}Services still running. Use ./stop-all.sh to stop them.${NC}"; echo ""; exit 0' INT

# Show combined logs with tail -f
if [ "$HAS_WS_SERVER" = true ] && [ "$HAS_LOCAL_AGENT" = true ]; then
    # Show all three logs
    tail -f logs/nextjs.log logs/websocket.log logs/agent.log 2>/dev/null &
elif [ "$HAS_WS_SERVER" = true ]; then
    # Show Next.js and WebSocket logs
    tail -f logs/nextjs.log logs/websocket.log 2>/dev/null &
elif [ "$HAS_LOCAL_AGENT" = true ]; then
    # Show Next.js and Agent logs
    tail -f logs/nextjs.log logs/agent.log 2>/dev/null &
else
    # Show only Next.js logs
    tail -f logs/nextjs.log 2>/dev/null &
fi

TAIL_PID=$!

# Wait for user to Ctrl+C
wait $TAIL_PID 2>/dev/null || true
