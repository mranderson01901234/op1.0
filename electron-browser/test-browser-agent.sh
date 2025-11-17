#!/bin/bash

# Test script for Electron Browser Agent
# This script helps you quickly test the browser agent functionality

echo "🌐 OperaStudio Browser Agent - Test Script"
echo "=========================================="
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check if WebSocket server is running
echo "🔍 Checking WebSocket server..."
if ! nc -z localhost 8082 2>/dev/null; then
  echo "❌ WebSocket server not running on port 8082"
  echo "   Please start it first:"
  echo "   cd ../websocket-server && pnpm dev"
  echo ""
  exit 1
else
  echo "✅ WebSocket server is running"
fi

echo ""
echo "🚀 Starting Electron Browser Agent..."
echo ""
echo "Configuration:"
echo "  - WebSocket URL: ws://localhost:8082"
echo "  - User ID: demo-user"
echo "  - Headless Chrome: Enabled"
echo ""
echo "The app will:"
echo "  1. Start in system tray (hidden)"
echo "  2. Initialize headless Chrome"
echo "  3. Connect to WebSocket server"
echo "  4. Wait for browser commands"
echo ""
echo "Test it from your web app by chatting:"
echo "  'Navigate to https://example.com'"
echo "  'Take a screenshot of the page'"
echo ""
echo "Press Ctrl+C to stop"
echo "=========================================="
echo ""

# Set environment variables
export WS_URL="ws://localhost:8082"
export USER_ID="demo-user"

# Run the app
npm run dev
