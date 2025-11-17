#!/bin/bash

# OperaStudio Master Startup Script
# Thoroughly kills all processes and restarts dev server on port 3000

# Don't use set -e here, we handle errors manually

echo "🚀 OperaStudio Startup Script"
echo "=============================="
echo ""

# Function to kill processes on a port
kill_port() {
  local port=$1
  local max_attempts=5
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
      echo "✅ Port $port is free"
      return 0
    fi
    
    echo "⚠️  Attempt $attempt/$max_attempts: Found process(es) on port $port: $pids"
    
    # Kill all processes on this port
    for pid in $pids; do
      kill -9 $pid 2>/dev/null || true
    done
    
    # Wait for processes to die
    sleep 2
    
    # Check if port is now free
    local still_running=$(lsof -ti:$port 2>/dev/null || true)
    if [ -z "$still_running" ]; then
      echo "✅ Port $port is now free"
      return 0
    fi
    
    attempt=$((attempt + 1))
  done
  
  # Final attempt - try fuser if available
  if command -v fuser &> /dev/null; then
    echo "🔨 Using fuser to kill processes on port $port..."
    fuser -k $port/tcp 2>/dev/null || true
    sleep 2
  fi
  
  # Final check
  local final_check=$(lsof -ti:$port 2>/dev/null || true)
  if [ ! -z "$final_check" ]; then
    echo "❌ ERROR: Port $port is still occupied after $max_attempts attempts"
    echo "   Process ID(s): $final_check"
    echo "   Please manually kill with: kill -9 $final_check"
    return 1
  fi
  
  echo "✅ Port $port is now free"
  return 0
}

# Kill all Next.js and node processes first (they might be holding the port)
echo "🔍 Checking for Next.js and node processes..."
# Find all Next.js related processes (next dev, next-server, etc.)
NEXTJS_PIDS=$(pgrep -f "next" 2>/dev/null || true)
# Find any node processes that might be related
NODE_PIDS=$(pgrep -f "node.*3000\|pnpm.*dev" 2>/dev/null || true)
# Also find processes listening on port 3000 directly
PORT_PIDS=$(lsof -ti:3000 2>/dev/null || true)

if [ ! -z "$NEXTJS_PIDS" ] || [ ! -z "$NODE_PIDS" ] || [ ! -z "$PORT_PIDS" ]; then
  echo "⚠️  Found processes to kill:"
  [ ! -z "$NEXTJS_PIDS" ] && echo "   Next.js processes: $NEXTJS_PIDS"
  [ ! -z "$NODE_PIDS" ] && echo "   Node/pnpm processes: $NODE_PIDS"
  [ ! -z "$PORT_PIDS" ] && echo "   Processes on port 3000: $PORT_PIDS"
  echo "🔨 Killing processes..."
  for pid in $NEXTJS_PIDS $NODE_PIDS $PORT_PIDS; do
    [ ! -z "$pid" ] && kill -9 $pid 2>/dev/null || true
  done
  sleep 3
  echo "✅ Processes killed"
else
  echo "✅ No Next.js/node processes found"
fi

# Kill processes on port 3000 (with retries)
echo ""
echo "🔍 Checking for processes on port 3000..."
if ! kill_port 3000; then
  echo ""
  echo "❌ Failed to free port 3000. Exiting."
  exit 1
fi

# Extra wait to ensure port is fully released
sleep 1

# Final verification
echo ""
echo "🔍 Final verification: checking port 3000..."
FINAL_CHECK=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$FINAL_CHECK" ]; then
  echo "❌ ERROR: Port 3000 is still occupied by: $FINAL_CHECK"
  echo "   Please manually kill with: kill -9 $FINAL_CHECK"
  exit 1
fi

echo "✅ Port 3000 is confirmed free"
echo ""

# Clean Next.js cache
echo "🧹 Cleaning .next cache..."
rm -rf .next
echo "✅ Cache cleaned"
echo ""

# Wait a moment to ensure everything is settled and port is fully released
sleep 2

# Start dev server with explicit port
echo "📦 Starting Next.js development server on port 3000..."
echo "=============================="
echo ""

# Start the dev server with explicit port 3000
# Using pnpm exec to properly pass arguments to next dev
pnpm exec next dev -p 3000
