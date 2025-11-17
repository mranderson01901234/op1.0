#!/bin/bash

# Test script to send tool calls to the WebSocket server

echo "🧪 Testing tool call to local agent..."
echo ""

# Test 1: read_file
echo "Test 1: read_file"
curl -X POST http://localhost:8082/tool-call \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tool": "read_file",
    "params": {
      "path": "/home/user/test.txt"
    }
  }'

echo -e "\n\n"
sleep 2

# Test 2: list_files
echo "Test 2: list_files"
curl -X POST http://localhost:8082/tool-call \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tool": "list_files",
    "params": {
      "path": "/home/user/documents"
    }
  }'

echo -e "\n\n"
sleep 2

# Test 3: execute_command
echo "Test 3: execute_command"
curl -X POST http://localhost:8082/tool-call \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tool": "execute_command",
    "params": {
      "command": "ls -la"
    }
  }'

echo -e "\n\n"

# Check health
echo "Health check:"
curl http://localhost:8082/health

echo -e "\n\n✅ Tests complete"
