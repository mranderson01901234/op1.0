# Local Environment Assistant - Production-Ready Blueprint

**Project:** OperaStudio Local Environment Assistant
**Version:** 2.0 (Scalable Architecture)
**Date:** November 2025
**Architecture:** Browser UI + Cloud API + WebSocket Servers + Redis + Local Agent
**Goal:** Enable non-technical users to give LLM access to local file system with 1-2 click installation
**Scale Target:** 1M+ concurrent users

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scalable Architecture](#scalable-architecture)
3. [User Experience Flow](#user-experience-flow)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Component Specifications](#component-specifications)
6. [Security & Performance](#security--performance)
7. [Testing & Deployment](#testing--deployment)
8. [Monitoring & Operations](#monitoring--operations)

---

## Executive Summary

### Product Vision

Users sign up on operastudio.io, enable local environment features with 1-2 clicks, and immediately chat with an LLM that can read/write files and execute commands on their local machine - all from the browser.

### Core Architecture Principle

**Browser is UI only. Cloud orchestrates. Redis brokers messages. WebSocket servers handle connections. Local agent executes.**

```
Browser (UI) → Next.js API (Serverless) → Redis Cluster → WebSocket Servers → Local Agent
     ↑                                                                              ↓
     └─────────────────── Response flows back ──────────────────────────────────────┘
```

**Key Improvements Over v1.0:**
- ✅ Redis for distributed state (scales horizontally)
- ✅ Separate WebSocket servers (independent scaling)
- ✅ Pre-built installer templates (fast downloads)
- ✅ Database persistence (survives restarts)
- ✅ Supports 1M+ concurrent users

### Success Criteria

- ✅ Installation: 1-2 clicks maximum
- ✅ Time to first connection: < 60 seconds
- ✅ User stays in browser (operastudio.io)
- ✅ LLM can read/write files, execute commands
- ✅ Works on Windows + Linux (macOS future)
- ✅ Zero terminal commands required
- ✅ Horizontally scalable architecture
- ✅ 99.9% uptime SLA

---

## Scalable Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: EDGE & LOAD BALANCING                │
│                                                                 │
│  Cloudflare / AWS ALB                                          │
│  - SSL termination                                             │
│  - DDoS protection                                             │
│  - Geographic routing                                          │
│  - Sticky sessions (userId → server mapping)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 2: API SERVERS (Stateless)              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Next.js #1  │  │  Next.js #2  │  │  Next.js #N  │         │
│  │              │  │              │  │              │         │
│  │  - Chat API  │  │  - Chat API  │  │  - Chat API  │         │
│  │  - Auth      │  │  - Auth      │  │  - Auth      │         │
│  │  - Download  │  │  - Download  │  │  - Download  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 3: DATA LAYER                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Redis Cluster (Connection Registry & Message Broker)    │  │
│  │                                                           │  │
│  │  agent:user_123:server  → "ws-server-2"                 │  │
│  │  agent:user_123:commands → [pub/sub channel]            │  │
│  │  pending:req_abc → { userId, timestamp }                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Persistent Storage)                         │  │
│  │                                                           │  │
│  │  - User accounts                                         │  │
│  │  - Agent credentials                                     │  │
│  │  - Audit logs                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 4: WEBSOCKET SERVERS                    │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                  │
│  │  WS #1    │  │  WS #2    │  │  WS #N    │                  │
│  │           │  │           │  │           │                  │
│  │  10K      │  │  10K      │  │  10K      │                  │
│  │  agents   │  │  agents   │  │  agents   │                  │
│  └───────────┘  └───────────┘  └───────────┘                  │
│       ↓              ↓              ↓                          │
│  Subscribe to Redis pub/sub channels                           │
│  Forward commands to local agents                              │
│  Publish responses back to Redis                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S LOCAL MACHINES                        │
│                                                                 │
│  Local Agent (Background Process)                              │
│  - Standalone binary (40MB)                                    │
│  - Connects to WebSocket server                                │
│  - Executes file operations                                    │
│  - Returns results                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Scales

| Component | Scaling Strategy | Capacity |
|-----------|------------------|----------|
| Next.js API | Serverless/horizontal | Unlimited |
| Redis Cluster | Sharding + replication | 100K+ ops/sec |
| WebSocket Servers | Horizontal (add more) | 40K users per server |
| PostgreSQL | Vertical + read replicas | Millions of records |
| Local Agents | N/A (user's machine) | 1 per user |

**Cost per user at scale:** ~$0.01/month (1M users = $10K/month infrastructure)

---

## User Experience Flow

### First-Time Setup (One-Time Installation)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Creates Account                                │
├─────────────────────────────────────────────────────────────┤
│ - Visit operastudio.io                                      │
│ - Sign up with email/Google/GitHub                          │
│ - Log into dashboard                                        │
│                                                             │
│ Time: 30 seconds                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Enable Local Environment                            │
├─────────────────────────────────────────────────────────────┤
│ Sidebar shows:                                              │
│   [ ] Local Environment Assistant                           │
│                                                             │
│ User clicks toggle → Modal appears                          │
│                                                             │
│ Time: 5 seconds                                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Download Installer (Instant)                        │
├─────────────────────────────────────────────────────────────┤
│ Modal content:                                              │
│   Platform detected: Windows 11                             │
│   [Download Agent] button                                   │
│                                                             │
│ Backend:                                                    │
│   - Generate credentials (userId + secret)                  │
│   - Inject into pre-built template (100ms)                  │
│   - Stream installer to browser                             │
│                                                             │
│ Download: OperaStudio-Agent-Setup.exe (40MB)               │
│ Time: 10 seconds (on 30Mbps connection)                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Install Agent (2 Clicks)                            │
├─────────────────────────────────────────────────────────────┤
│ Instructions shown:                                         │
│   1. Open Downloads folder                                  │
│   2. Double-click OperaStudio-Agent-Setup.exe              │
│                                                             │
│ Installer runs silently:                                   │
│   ┌────────────────────────────────┐                       │
│   │ Installing OperaStudio Agent   │                       │
│   │ [████████████████░░] 85%      │                       │
│   └────────────────────────────────┘                       │
│                                                             │
│ Actions:                                                    │
│   - Extract binary to Program Files                         │
│   - Write config.json with credentials                      │
│   - Register auto-start (Task Scheduler/systemd)           │
│   - Start agent immediately                                 │
│                                                             │
│ Time: 30 seconds                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Auto-Connect                                        │
├─────────────────────────────────────────────────────────────┤
│ Agent:                                                      │
│   - Reads config.json                                       │
│   - Connects to wss://operastudio.io/agent                 │
│   - Authenticates with userId + secret                      │
│                                                             │
│ Server:                                                     │
│   - Validates credentials                                   │
│   - Registers in Redis: agent:user_123:server → "ws-2"    │
│   - Sends confirmation                                      │
│                                                             │
│ Browser:                                                    │
│   - Polls /api/agent/status every 2 seconds                │
│   - Detects connection                                      │
│   - Updates UI: ✅ Connected                                │
│                                                             │
│ Time: 5 seconds                                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Immediate Use                                       │
├─────────────────────────────────────────────────────────────┤
│ Chat interface shows:                                       │
│   "Your local environment is connected!                     │
│    Try asking me to read a file."                           │
│                                                             │
│ User types:                                                 │
│   "List files in my Documents folder"                       │
│                                                             │
│ LLM responds in <2 seconds with file list                   │
│                                                             │
│ ✅ SETUP COMPLETE                                           │
└─────────────────────────────────────────────────────────────┘

Total time: < 90 seconds from signup to first use
```

### Subsequent Logins (Zero Setup)

```
User boots computer
    ↓
Agent auto-starts (Task Scheduler/systemd)
    ↓
Agent connects to WebSocket server
    ↓
Registered in Redis
    ↓
User opens operastudio.io anytime
    ↓
Logs in
    ↓
UI shows: ✅ Connected (instant)
    ↓
User can immediately chat with files
```

---

## Implementation Roadmap

**Total Timeline:** 10 weeks to production launch
**Team Size:** 1-2 engineers

### Phase 0: Proof of Concept (Week 1)
**Goal:** Validate core architecture with minimal code

#### Tasks
- [ ] Create minimal Node.js agent (100 lines)
  - [ ] WebSocket client that connects to server
  - [ ] Send "ping" every 5 seconds
  - [ ] Log received messages
- [ ] Create minimal WebSocket server (150 lines)
  - [ ] Accept WebSocket connections
  - [ ] Store userId → WebSocket mapping
  - [ ] Broadcast "pong" to all connected clients
- [ ] Test on Windows
  - [ ] Run agent.js with `node agent.js`
  - [ ] Verify connection
  - [ ] Verify bidirectional messages
- [ ] Test on Linux
  - [ ] Same as Windows
  - [ ] Verify cross-platform compatibility

#### Success Criteria
- [x] Bidirectional WebSocket communication works
- [x] No CORS issues
- [x] Connection persists across browser refreshes
- [x] Works on Windows and Linux

#### Deliverables
- `poc/agent.js` - Minimal agent
- `poc/server.js` - Minimal WebSocket server
- Documentation of learnings

---

### Phase 1: Foundation (Weeks 2-3)
**Goal:** Core infrastructure ready for development

#### 1.1 Database Setup
- [ ] Set up PostgreSQL database
  - [ ] Create `agent_credentials` table
    ```sql
    CREATE TABLE agent_credentials (
      user_id TEXT PRIMARY KEY,
      shared_secret TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_seen TIMESTAMP,
      metadata JSONB
    );
    CREATE INDEX idx_shared_secret ON agent_credentials(shared_secret);
    ```
  - [ ] Create `tool_execution_logs` table
    ```sql
    CREATE TABLE tool_execution_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      params JSONB,
      result JSONB,
      success BOOLEAN,
      error TEXT,
      execution_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_user_created ON tool_execution_logs(user_id, created_at);
    ```
  - [ ] Test database connection from Next.js
  - [ ] Set up connection pooling (pg-pool)

#### 1.2 Redis Setup
- [ ] Set up Redis (local for dev, ElastiCache for prod)
- [ ] Install ioredis package
- [ ] Create connection registry module
  - [ ] File: `lib/redis/connection-registry.ts`
  - [ ] Methods: register(), isConnected(), getServer(), sendToolCall(), sendResponse()
  - [ ] Unit tests for each method
- [ ] Create pub/sub module
  - [ ] File: `lib/redis/pubsub.ts`
  - [ ] Publisher and subscriber instances
  - [ ] Channel naming convention: `agent:{userId}:commands`, `response:{requestId}`
- [ ] Test Redis locally
  - [ ] Set key, get key
  - [ ] Pub/sub between two Node.js processes
  - [ ] Verify TTL expiration

#### 1.3 Local Agent Core
- [ ] Set up TypeScript project in `local-agent/`
  - [ ] Initialize package.json
  - [ ] Configure tsconfig.json
  - [ ] Install dependencies: ws, typescript, tsx
- [ ] Implement WebSocket client
  - [ ] File: `src/websocket-client.ts`
  - [ ] Connect to server with userId + secret
  - [ ] Auto-reconnect with exponential backoff (1s → 60s max)
  - [ ] Send heartbeat every 30 seconds
  - [ ] Handle connection errors gracefully
- [ ] Implement configuration management
  - [ ] File: `src/config.ts`
  - [ ] Read config from `~/.operastudio/config.json`
  - [ ] Validate required fields
  - [ ] Handle missing config file
- [ ] Implement logging
  - [ ] File: `src/logger.ts`
  - [ ] Write to `~/.operastudio/agent.log`
  - [ ] Log rotation (keep 7 days, max 100MB)
  - [ ] Log levels: info, warn, error
- [ ] Build script
  - [ ] npm script: `npm run build` (TypeScript → JavaScript)
  - [ ] Test compiled output: `node dist/index.js`

#### 1.4 WebSocket Server (Separate from Next.js)
- [ ] Create new project: `websocket-server/`
- [ ] Implement WebSocket server
  - [ ] File: `websocket-server/index.js`
  - [ ] Accept connections on port 8080
  - [ ] Validate credentials against database
  - [ ] Store local connections: Map<userId, WebSocket>
  - [ ] Subscribe to Redis channels for each connected user
  - [ ] Forward messages from Redis to WebSocket
  - [ ] Publish agent responses back to Redis
- [ ] Implement health check endpoint
  - [ ] HTTP endpoint on port 8081: `/health`
  - [ ] Returns: { status: "ok", connections: count }
- [ ] Add graceful shutdown
  - [ ] On SIGTERM/SIGINT: close all WebSockets
  - [ ] Wait for in-flight requests (max 30s)
  - [ ] Exit cleanly
- [ ] Test locally
  - [ ] Start WebSocket server
  - [ ] Connect with test agent
  - [ ] Send message via Redis, verify agent receives it
  - [ ] Send response from agent, verify Redis receives it

#### Success Criteria
- [x] Agent can connect to WebSocket server
- [x] Credentials stored in database and validated
- [x] Redis pub/sub routes messages correctly
- [x] All components tested locally
- [x] Code is modular and well-documented

---

### Phase 2: Tool Implementation (Weeks 3-4)
**Goal:** Local agent can execute all core file operations

#### 2.1 File Operations
- [ ] Implement read_file
  - [ ] File: `src/file-operations.ts`
  - [ ] Function: `readFile(path: string): Promise<string>`
  - [ ] Handle errors: ENOENT, EACCES, EISDIR
  - [ ] Return file content as UTF-8 string
  - [ ] Test with various file types
- [ ] Implement write_file
  - [ ] Function: `writeFile(path: string, content: string): Promise<void>`
  - [ ] Create parent directories if needed
  - [ ] Handle errors: EACCES, ENOSPC
  - [ ] Test overwriting existing files
- [ ] Implement list_files
  - [ ] Function: `listFiles(path: string, recursive?: boolean): Promise<FileInfo[]>`
  - [ ] Return array: [{ name, type, size, modified }]
  - [ ] Support recursive option
  - [ ] Handle errors: ENOTDIR, EACCES
- [ ] Path validation
  - [ ] Function: `validatePath(path: string): boolean`
  - [ ] Ensure absolute paths only
  - [ ] Block dangerous patterns: `..`, symlinks to system dirs
  - [ ] Resolve to canonical path

#### 2.2 Command Execution
- [ ] Implement execute_command
  - [ ] File: `src/command-executor.ts`
  - [ ] Function: `executeCommand(cmd: string, cwd?: string): Promise<CommandResult>`
  - [ ] Use child_process.spawn
  - [ ] Capture stdout, stderr, exit code
  - [ ] Timeout after 5 minutes
  - [ ] Kill process on timeout
- [ ] Command sanitization
  - [ ] Blacklist dangerous commands: `rm -rf /`, `mkfs`, `dd`, fork bombs
  - [ ] Function: `sanitizeCommand(cmd: string): void`
  - [ ] Throw error if blocked pattern detected
- [ ] Test with various commands
  - [ ] `echo "test"`
  - [ ] `ls -la`
  - [ ] Long-running command (sleep 120)
  - [ ] Invalid command (should return error)

#### 2.3 Permission System
- [ ] Implement permission modes
  - [ ] File: `src/permissions.ts`
  - [ ] Enum: Safe, Balanced, Unrestricted
  - [ ] Read from config: `permissions.mode`
- [ ] Implement path checking
  - [ ] Function: `checkPermission(operation, path): boolean`
  - [ ] Safe mode: read-only, home dir only
  - [ ] Balanced mode: read/write in allowed dirs
  - [ ] Unrestricted mode: all operations allowed
- [ ] Audit logging
  - [ ] Log all tool executions to database
  - [ ] Include: userId, tool, params, result, timestamp
  - [ ] Async (don't block tool execution)

#### 2.4 Tool Executor
- [ ] Implement tool router
  - [ ] File: `src/tool-executor.ts`
  - [ ] Function: `executeTool(toolName, params): Promise<any>`
  - [ ] Route to correct implementation
  - [ ] Wrap in try/catch
  - [ ] Return structured response: { success, result?, error? }
- [ ] Integrate with WebSocket client
  - [ ] Listen for `tool_call` messages
  - [ ] Execute tool
  - [ ] Send `tool_response` back
- [ ] Add request timeout
  - [ ] Default: 30 seconds
  - [ ] Per-tool timeouts:
    - read_file: 10s
    - write_file: 10s
    - list_files: 15s
    - execute_command: 5 minutes
- [ ] Error handling
  - [ ] Map error codes: ENOENT → FILE_NOT_FOUND
  - [ ] Return user-friendly error messages
  - [ ] Log full stack trace locally

#### 2.5 Unit Tests
- [ ] Test file operations
  - [ ] Create temp files/folders for testing
  - [ ] Test read_file with various files
  - [ ] Test write_file creates and overwrites
  - [ ] Test list_files with nested directories
  - [ ] Test error cases (permission denied, not found)
- [ ] Test command execution
  - [ ] Test successful command
  - [ ] Test command with error exit code
  - [ ] Test command timeout
  - [ ] Test sanitization blocks dangerous commands
- [ ] Test permissions
  - [ ] Safe mode blocks writes
  - [ ] Safe mode blocks outside home dir
  - [ ] Balanced mode allows allowed dirs
  - [ ] Unrestricted mode allows everything

#### Success Criteria
- [x] All 4 tools working correctly
- [x] Permissions enforced properly
- [x] Errors handled gracefully with clear messages
- [x] Unit test coverage > 80%
- [x] No security vulnerabilities (path traversal, command injection)

---

### Phase 3: Cloud Integration (Weeks 4-5)
**Goal:** LLM can use local tools via cloud API

#### 3.1 Tool Definitions for LLM
- [ ] Create tool definitions
  - [ ] File: `lib/ai/local-tools.ts`
  - [ ] Define 4 tools in Anthropic format
  - [ ] Specify parameters, descriptions
  - [ ] Export as array
- [ ] Implement tool execution wrapper
  - [ ] File: `lib/local-agent/execute-tool.ts`
  - [ ] Function: `executeLocalTool(userId, toolName, params)`
  - [ ] Check agent connection via Redis
  - [ ] Generate requestId
  - [ ] Publish to Redis: `agent:{userId}:commands`
  - [ ] Subscribe to Redis: `response:{requestId}`
  - [ ] Wait for response with 30s timeout
  - [ ] Return result or throw error
- [ ] Add rate limiting
  - [ ] Max 100 tool calls per minute per user
  - [ ] Store in Redis: `ratelimit:{userId}` with sliding window
  - [ ] Return 429 error if exceeded

#### 3.2 Chat API Integration
- [ ] Update chat route
  - [ ] File: `app/api/chat/route.ts`
  - [ ] Add tools to Gemini API call
  - [ ] Handle tool_use blocks from LLM
  - [ ] Execute tools via Redis
  - [ ] Return tool results to LLM
  - [ ] Stream LLM response back to user
- [ ] Handle multi-turn conversations
  - [ ] LLM requests tool → execute → return result → LLM continues
  - [ ] Support multiple sequential tool calls
  - [ ] Maintain conversation context
- [ ] Error handling
  - [ ] Agent disconnected → return helpful message to user
  - [ ] Tool execution timeout → return error to LLM, let it retry or inform user
  - [ ] Invalid tool params → validate before sending to agent

#### 3.3 Agent Status API
- [ ] Create status endpoint
  - [ ] File: `app/api/agent/status/route.ts`
  - [ ] Check Redis: `agent:{userId}:server`
  - [ ] Return: { connected: boolean, lastSeen: timestamp, metadata }
  - [ ] Cache for 5 seconds (reduce Redis load)
- [ ] Create agent metadata endpoint
  - [ ] File: `app/api/agent/metadata/route.ts`
  - [ ] Return: version, platform, permissions mode
  - [ ] For debugging and support

#### 3.4 End-to-End Testing
- [ ] Test complete flow
  - [ ] Start WebSocket server
  - [ ] Start local agent
  - [ ] Send chat message: "Read my ~/.bashrc file"
  - [ ] Verify LLM calls read_file tool
  - [ ] Verify tool executed on local machine
  - [ ] Verify file content returned to LLM
  - [ ] Verify LLM responds with file content
- [ ] Test error scenarios
  - [ ] Agent disconnected mid-conversation
  - [ ] File not found
  - [ ] Permission denied
  - [ ] Tool call timeout
- [ ] Test multi-turn
  - [ ] "Read config.json"
  - [ ] "Change the API key to xyz"
  - [ ] "Verify the change"

#### Success Criteria
- [x] LLM can successfully use all 4 tools
- [x] Multi-turn conversations work seamlessly
- [x] Errors surface to user gracefully
- [x] Rate limiting prevents abuse
- [x] End-to-end latency < 2 seconds for file operations

---

### Phase 4: Binary Build & Auto-Start (Weeks 5-6)
**Goal:** Agent runs as standalone binary and auto-starts

#### 4.1 Binary Compilation
- [ ] Set up pkg
  - [ ] Install: `npm install -g pkg`
  - [ ] Add pkg config to package.json
  - [ ] Specify targets: node18-win-x64, node18-linux-x64
- [ ] Build binaries
  - [ ] Script: `npm run build:binaries`
  - [ ] Output: `dist/binaries/operastudio-agent-win-x64.exe`
  - [ ] Output: `dist/binaries/operastudio-agent-linux-x64`
  - [ ] Verify binary size (~40MB)
- [ ] Test binaries on clean VMs
  - [ ] Windows 10: Run .exe, verify it works without Node.js
  - [ ] Windows 11: Same
  - [ ] Ubuntu 22.04: Run binary, verify it works
  - [ ] Ubuntu 24.04: Same
- [ ] Handle bundled assets
  - [ ] Ensure config file path works in binary
  - [ ] Test reading/writing config from binary

#### 4.2 Windows Auto-Start
- [ ] Implement Task Scheduler registration
  - [ ] File: `src/auto-start/windows.ts`
  - [ ] Function: `registerAutoStart(exePath: string): Promise<void>`
  - [ ] Use `schtasks` command:
    ```bash
    schtasks /create /tn "OperaStudioAgent" /tr "{exePath}" /sc onlogon /rl highest /f
    ```
  - [ ] Called by agent on first run
- [ ] Test on Windows 10
  - [ ] Register auto-start
  - [ ] Verify Task Scheduler entry created
  - [ ] Reboot
  - [ ] Verify agent auto-started
  - [ ] Check agent.log for startup message
- [ ] Test on Windows 11
  - [ ] Same as Windows 10
- [ ] Handle uninstall
  - [ ] Function: `unregisterAutoStart(): Promise<void>`
  - [ ] Command: `schtasks /delete /tn "OperaStudioAgent" /f`

#### 4.3 Linux Auto-Start
- [ ] Implement systemd service
  - [ ] File: `src/auto-start/linux.ts`
  - [ ] Function: `registerAutoStart(exePath: string): Promise<void>`
  - [ ] Create systemd user service file:
    ```ini
    [Unit]
    Description=OperaStudio Local Agent
    After=network.target

    [Service]
    Type=simple
    ExecStart={exePath}
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=default.target
    ```
  - [ ] Write to: `~/.config/systemd/user/operastudio-agent.service`
  - [ ] Enable service: `systemctl --user enable operastudio-agent`
  - [ ] Start service: `systemctl --user start operastudio-agent`
- [ ] Test on Ubuntu 22.04
  - [ ] Register auto-start
  - [ ] Verify service file created
  - [ ] Verify service running: `systemctl --user status operastudio-agent`
  - [ ] Reboot
  - [ ] Verify agent auto-started
- [ ] Test on Ubuntu 24.04
  - [ ] Same as 22.04
- [ ] Test on Fedora 39
  - [ ] Same as Ubuntu
- [ ] Handle uninstall
  - [ ] Stop service: `systemctl --user stop operastudio-agent`
  - [ ] Disable service: `systemctl --user disable operastudio-agent`
  - [ ] Remove service file

#### 4.4 Platform Detection
- [ ] Implement platform detection in agent
  - [ ] File: `src/platform.ts`
  - [ ] Detect: windows, linux, darwin
  - [ ] Return auto-start module for platform
- [ ] Test on all platforms
  - [ ] Windows: Uses Task Scheduler
  - [ ] Linux: Uses systemd
  - [ ] macOS: Placeholder (future: launchd)

#### Success Criteria
- [x] Binaries work without Node.js installed
- [x] Agent auto-starts on Windows after reboot
- [x] Agent auto-starts on Linux after reboot
- [x] Binary size is reasonable (~40MB)
- [x] Uninstall cleanly removes auto-start

---

### Phase 5: Installer System (Weeks 6-7)
**Goal:** One-click installation working end-to-end

#### 5.1 Pre-Build Installer Templates
- [ ] Create Windows template
  - [ ] Build agent binary: `operastudio-agent-win-x64.exe`
  - [ ] Add credential placeholder in binary
    - [ ] Append 1KB of zeros to end of .exe
    - [ ] Mark section with magic string: `%%CREDENTIALS_PLACEHOLDER%%`
  - [ ] Test: Inject credentials, verify agent reads them
- [ ] Create Linux template
  - [ ] Build agent binary: `operastudio-agent-linux-x64`
  - [ ] Add credential placeholder
    - [ ] Same approach as Windows
  - [ ] Test: Inject credentials, verify agent reads them
- [ ] Create injection script
  - [ ] File: `scripts/inject-credentials.js`
  - [ ] Function: `injectCredentials(templatePath, credentials): Buffer`
  - [ ] Find magic marker
  - [ ] Replace with JSON credentials (padded to same length)
  - [ ] Return modified binary
  - [ ] Benchmark: Should take < 100ms

#### 5.2 Windows Installer (Inno Setup)
- [ ] Install Inno Setup
  - [ ] Download from jrsoftware.org
  - [ ] Install on Windows dev machine or CI
- [ ] Create installer script template
  - [ ] File: `scripts/windows-installer.iss`
  - [ ] Embed agent binary (with placeholder)
  - [ ] Install to: `%LOCALAPPDATA%\OperaStudio\Agent`
  - [ ] Run agent with `--install` flag (sets up auto-start)
  - [ ] Start agent immediately
  - [ ] Add uninstaller
- [ ] Build installer
  - [ ] Script: `scripts/build-windows-installer.js`
  - [ ] Read template
  - [ ] Inject credentials into embedded binary
  - [ ] Compile with Inno Setup: `iscc temp-installer.iss`
  - [ ] Output: `installers/OperaStudio-Agent-Setup.exe`
  - [ ] Test build time (should be < 5 seconds)
- [ ] Test installer
  - [ ] Run on clean Windows VM
  - [ ] Verify agent installed to correct location
  - [ ] Verify Task Scheduler entry
  - [ ] Verify agent running
  - [ ] Verify agent connects to cloud
  - [ ] Reboot and verify auto-start
  - [ ] Run uninstaller, verify clean removal

#### 5.3 Linux Installer (Self-Extracting Script)
- [ ] Create installer template
  - [ ] File: `scripts/linux-installer-template.sh`
  - [ ] Self-extracting shell script
  - [ ] Embedded agent binary (base64 encoded)
  - [ ] Extract to: `~/.local/share/operastudio-agent/`
  - [ ] Write config.json
  - [ ] Set up systemd service
  - [ ] Start agent
- [ ] Build installer
  - [ ] Script: `scripts/build-linux-installer.js`
  - [ ] Read template
  - [ ] Read agent binary
  - [ ] Inject credentials into binary
  - [ ] Base64 encode binary
  - [ ] Append to shell script
  - [ ] Output: `installers/operastudio-agent-installer.sh`
  - [ ] Make executable
  - [ ] Test build time (should be < 2 seconds)
- [ ] Test installer
  - [ ] Run on clean Ubuntu VM: `bash operastudio-agent-installer.sh`
  - [ ] Verify agent installed
  - [ ] Verify systemd service
  - [ ] Verify agent running
  - [ ] Verify agent connects
  - [ ] Reboot and verify auto-start
  - [ ] Run uninstall script, verify clean removal

#### 5.4 Download Endpoint
- [ ] Create download API
  - [ ] File: `app/api/agent/download/route.ts`
  - [ ] Authenticate user (Clerk/Auth)
  - [ ] Get platform from query params
  - [ ] Generate credentials:
    - userId (from auth)
    - sharedSecret (crypto.randomBytes(32).toString('hex'))
    - serverUrl (from env: NEXT_PUBLIC_WS_URL)
  - [ ] Store credentials in database
  - [ ] Inject credentials into template
  - [ ] Stream installer to browser
  - [ ] Set headers:
    - Content-Type: application/octet-stream
    - Content-Disposition: attachment; filename="..."
- [ ] Optimize for performance
  - [ ] Load templates into memory on server start
  - [ ] Inject credentials (< 100ms)
  - [ ] Stream file (don't load into memory)
  - [ ] Add caching headers (no-cache for security)
- [ ] Test download flow
  - [ ] Browser requests download
  - [ ] Installer downloads
  - [ ] Verify credentials embedded correctly
  - [ ] Verify installer works

#### 5.5 Credential Management
- [ ] Store credentials in database
  - [ ] On download: INSERT INTO agent_credentials
  - [ ] Include: userId, sharedSecret, platform, status=pending
- [ ] Validate credentials on connection
  - [ ] WebSocket server checks database
  - [ ] Query: SELECT * FROM agent_credentials WHERE user_id = ? AND shared_secret = ?
  - [ ] If valid: accept connection
  - [ ] If invalid: reject with 1008 close code
  - [ ] Update status to 'connected' and last_seen timestamp
- [ ] Handle credential rotation
  - [ ] Allow user to regenerate credentials (revoke old, issue new)
  - [ ] Download new installer
  - [ ] Old agent disconnects, new agent connects

#### Success Criteria
- [x] Windows: Download → Double-click → Connected in < 60 seconds
- [x] Linux: Download → Double-click → Connected in < 60 seconds
- [x] Installer generation takes < 5 seconds
- [x] No manual steps required
- [x] Credentials securely embedded

---

### Phase 6: Browser UI (Week 7)
**Goal:** Polished, intuitive user interface

#### 6.1 Installation Button Component
- [ ] Create component
  - [ ] File: `components/local-env/install-agent-button.tsx`
  - [ ] States: disconnected, installing, connected
  - [ ] Detect platform: navigator.userAgent
  - [ ] Poll /api/agent/status every 5 seconds
  - [ ] Update state based on connection
- [ ] Handle download click
  - [ ] Detect platform
  - [ ] Fetch `/api/agent/download?platform=${platform}`
  - [ ] Trigger browser download
  - [ ] Show installation modal
- [ ] UI states
  - [ ] Disconnected: "Enable Local Environment" button
  - [ ] Installing: "Installing..." with spinner
  - [ ] Connected: "✅ Connected" with green checkmark
- [ ] Test on all browsers
  - [ ] Chrome, Firefox, Safari, Edge
  - [ ] Verify download works
  - [ ] Verify state updates correctly

#### 6.2 Installation Modal
- [ ] Create component
  - [ ] File: `components/local-env/install-modal.tsx`
  - [ ] Steps: download, waiting, connected
  - [ ] Platform-specific instructions
- [ ] Download step
  - [ ] Show: "Installer downloaded to Downloads folder"
  - [ ] Instructions:
    - Windows: "1. Open Downloads 2. Double-click OperaStudio-Agent-Setup.exe"
    - Linux: "1. Open Downloads 2. Run operastudio-agent-installer.sh"
  - [ ] Button: "I've run the installer" → Move to waiting step
- [ ] Waiting step
  - [ ] Show: Spinner with "Waiting for agent to connect..."
  - [ ] Poll /api/agent/status every 2 seconds
  - [ ] When connected: Move to connected step
  - [ ] Timeout after 2 minutes: Show troubleshooting link
- [ ] Connected step
  - [ ] Show: Large checkmark with "Connected!"
  - [ ] Message: "You can now use local environment features"
  - [ ] Auto-close after 3 seconds
- [ ] Error handling
  - [ ] Download failed: Show error, retry button
  - [ ] Connection timeout: Show troubleshooting steps
  - [ ] Permission denied: Show instructions

#### 6.3 Status Indicators
- [ ] Sidebar badge
  - [ ] Show connection status next to "Local Environment"
  - [ ] Green dot: Connected
  - [ ] Gray dot: Disconnected
  - [ ] Update in real-time (poll every 10 seconds)
- [ ] Chat interface indicator
  - [ ] When agent connected: Show small badge in chat header
  - [ ] On hover: "Local environment active"
  - [ ] Click: Show agent details (version, platform, uptime)
- [ ] Disconnect warning
  - [ ] If agent disconnects during conversation
  - [ ] Show warning banner: "Local agent disconnected. Some features unavailable."
  - [ ] Offer reconnect button

#### 6.4 Settings Panel
- [ ] Create settings UI
  - [ ] File: `components/local-env/settings.tsx`
  - [ ] Show: Platform, version, connection status
  - [ ] Show: Allowed directories (if balanced mode)
  - [ ] Show: Recent tool executions (last 10)
- [ ] Permission mode toggle
  - [ ] Radio buttons: Safe, Balanced, Unrestricted
  - [ ] Show description of each mode
  - [ ] Save to database, agent polls for changes
- [ ] Uninstall button
  - [ ] Download uninstall script
  - [ ] Platform-specific instructions
  - [ ] Confirm before download

#### 6.5 Error Messages & Help
- [ ] Create troubleshooting guide
  - [ ] Page: `/docs/local-agent-troubleshooting`
  - [ ] Common issues:
    - "Installer not downloading" → Check browser permissions
    - "Agent not connecting" → Check firewall, antivirus
    - "Connection keeps dropping" → Check network stability
  - [ ] Platform-specific sections
- [ ] Add help links throughout UI
  - [ ] Installation modal: "Need help?" link
  - [ ] Settings panel: "Troubleshooting" button
  - [ ] Error messages: Link to relevant guide section

#### Success Criteria
- [x] User can install without confusion
- [x] Clear visual feedback at every step
- [x] Graceful error messages with helpful next steps
- [x] Works on all major browsers
- [x] Responsive design (desktop focus, but works on mobile)

---

### Phase 7: Production Hardening (Week 8)
**Goal:** Bulletproof reliability and security

#### 7.1 Error Handling & Retry Logic
- [ ] Agent reconnection
  - [ ] Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
  - [ ] Reset delay on successful connection
  - [ ] Log reconnection attempts
  - [ ] Notify cloud of reconnection
- [ ] Tool execution retry
  - [ ] Retry transient errors (EAGAIN, ECONNRESET)
  - [ ] Max 3 retries with 1s delay
  - [ ] Don't retry permanent errors (ENOENT, EACCES)
- [ ] Timeout handling
  - [ ] Tool call timeout: 30s (configurable per tool)
  - [ ] Connection timeout: 90s (3 missed heartbeats)
  - [ ] Graceful timeout: Return error to LLM, don't crash
- [ ] Graceful degradation
  - [ ] If agent disconnected: Chat still works, local features disabled
  - [ ] Show clear message: "Local features unavailable"
  - [ ] Offer reconnect instructions

#### 7.2 Security Audit
- [ ] Authentication review
  - [ ] Verify credentials validated on every connection
  - [ ] Verify sharedSecret has sufficient entropy (32 bytes)
  - [ ] Verify no credentials in logs or error messages
  - [ ] Test: Invalid credentials rejected
  - [ ] Test: Expired credentials rejected (if implementing expiry)
- [ ] Permission enforcement
  - [ ] Test safe mode blocks writes
  - [ ] Test safe mode blocks outside home dir
  - [ ] Test balanced mode respects allowed dirs
  - [ ] Test path traversal attempts blocked
  - [ ] Test symlink escapes blocked
- [ ] Command injection prevention
  - [ ] Test dangerous commands blocked
  - [ ] Test shell metacharacters escaped
  - [ ] Test command chaining blocked (`;`, `&&`, `||`)
  - [ ] Test injection via cwd parameter
- [ ] Rate limiting
  - [ ] Test 100 calls/min limit enforced
  - [ ] Test limit resets after 1 minute
  - [ ] Test per-user isolation (user A can't exhaust user B's quota)
- [ ] Transport security
  - [ ] Verify WSS (WebSocket Secure) used in production
  - [ ] Verify SSL certificate valid
  - [ ] Test: Agent rejects invalid certificates (in production mode)
- [ ] Penetration testing
  - [ ] Hire security firm or run internal pentest
  - [ ] Test: Unauthorized file access
  - [ ] Test: Credential theft
  - [ ] Test: Denial of service
  - [ ] Test: Privilege escalation
  - [ ] Fix any vulnerabilities found

#### 7.3 Monitoring & Observability
- [ ] Set up error tracking (Sentry)
  - [ ] Install Sentry SDK in Next.js
  - [ ] Install Sentry SDK in agent
  - [ ] Configure source maps for agent
  - [ ] Test: Errors reported to Sentry
  - [ ] Set up alerts for critical errors
- [ ] Set up metrics (Prometheus + Grafana or DataDog)
  - [ ] WebSocket server metrics:
    - Active connections (gauge)
    - Connection rate (counter)
    - Disconnection rate (counter)
    - Message rate (counter)
  - [ ] Tool execution metrics:
    - Tool call rate by type (counter)
    - Tool execution time (histogram)
    - Tool success/failure rate (counter)
  - [ ] Redis metrics:
    - Pub/sub message rate
    - Key count
    - Memory usage
  - [ ] Database metrics:
    - Query time
    - Connection pool usage
  - [ ] Create dashboards for all metrics
- [ ] Set up logging (Cloudwatch / Logflare)
  - [ ] Centralize logs from all WebSocket servers
  - [ ] Structured logging (JSON format)
  - [ ] Log levels: info, warn, error
  - [ ] Include: requestId, userId, timestamp
  - [ ] Set up log retention (30 days)
- [ ] Set up uptime monitoring (Pingdom / UptimeRobot)
  - [ ] Monitor WebSocket endpoint health check
  - [ ] Monitor Next.js API health endpoint
  - [ ] Alert on downtime (PagerDuty / email)
  - [ ] Target: 99.9% uptime

#### 7.4 Performance Optimization
- [ ] Database query optimization
  - [ ] Add indexes on frequently queried columns
  - [ ] Use connection pooling (pg-pool)
  - [ ] Cache agent status in Redis (5s TTL)
  - [ ] Benchmark: Query time < 10ms p95
- [ ] Redis optimization
  - [ ] Use pipelining for bulk operations
  - [ ] Set appropriate TTLs (avoid memory bloat)
  - [ ] Use Redis Cluster for horizontal scaling
  - [ ] Benchmark: Pub/sub latency < 5ms p95
- [ ] WebSocket server optimization
  - [ ] Use Node.js clustering (1 process per CPU core)
  - [ ] Optimize message serialization (use Buffer)
  - [ ] Avoid blocking operations (use async)
  - [ ] Benchmark: Message latency < 10ms p95
- [ ] Installer generation optimization
  - [ ] Pre-load templates into memory
  - [ ] Use streaming for large files
  - [ ] Benchmark: Installer generation < 100ms p95

#### 7.5 Load Testing
- [ ] Test 1,000 concurrent connections
  - [ ] Simulate 1,000 agents connecting
  - [ ] Send tool calls randomly
  - [ ] Measure: Connection success rate, latency, errors
  - [ ] Target: 100% success rate, < 100ms latency p95
- [ ] Test 10,000 concurrent connections
  - [ ] Use multiple WebSocket servers
  - [ ] Verify Redis handles load
  - [ ] Verify database handles load
  - [ ] Target: 99.9% success rate, < 200ms latency p95
- [ ] Test failover scenarios
  - [ ] Kill WebSocket server mid-connection
  - [ ] Verify agents reconnect to different server
  - [ ] Verify no data loss
  - [ ] Verify tool calls complete successfully
- [ ] Test sustained load
  - [ ] Run 5,000 agents for 24 hours
  - [ ] Measure: Memory leaks, error rate, performance degradation
  - [ ] Target: No memory leaks, < 0.1% error rate, stable performance

#### Success Criteria
- [x] No unhandled errors
- [x] All errors logged and monitored
- [x] Security audit passed (no critical vulnerabilities)
- [x] Uptime SLA met (99.9%)
- [x] Load tests passed (10K concurrent users)
- [x] Performance benchmarks met

---

### Phase 8: Production Deployment (Week 9)
**Goal:** Ship to production environment

#### 8.1 Infrastructure Setup
- [ ] Provision servers
  - [ ] Next.js API: Deploy to Vercel / AWS ECS
  - [ ] WebSocket servers: Deploy to AWS EC2 / ECS
    - Start with 2 servers (for redundancy)
    - Auto-scaling group (scale up to 10 based on connections)
  - [ ] Redis: AWS ElastiCache (m6g.large, 2-node cluster)
  - [ ] PostgreSQL: AWS RDS (r6g.large, Multi-AZ)
  - [ ] Load balancer: AWS ALB with sticky sessions
- [ ] Configure networking
  - [ ] VPC with public and private subnets
  - [ ] Security groups:
    - ALB: Allow 443 from internet
    - WebSocket servers: Allow 8080 from ALB
    - Redis: Allow 6379 from WebSocket servers and Next.js
    - PostgreSQL: Allow 5432 from WebSocket servers and Next.js
  - [ ] NAT gateway for outbound traffic
- [ ] Set up SSL certificates
  - [ ] Use AWS Certificate Manager
  - [ ] Certificate for operastudio.io (Next.js)
  - [ ] Certificate for ws.operastudio.io (WebSocket servers)
  - [ ] Auto-renewal enabled
- [ ] Configure DNS
  - [ ] operastudio.io → Vercel / ALB (Next.js)
  - [ ] ws.operastudio.io → ALB (WebSocket servers)
  - [ ] Enable Cloudflare proxy (DDoS protection)

#### 8.2 Environment Configuration
- [ ] Set environment variables
  - [ ] Next.js:
    ```env
    DATABASE_URL=postgresql://...
    REDIS_URL=redis://...
    NEXT_PUBLIC_WS_URL=wss://ws.operastudio.io/agent
    SENTRY_DSN=...
    ```
  - [ ] WebSocket servers:
    ```env
    DATABASE_URL=postgresql://...
    REDIS_URL=redis://...
    PORT=8080
    SERVER_ID=ws-prod-1
    SENTRY_DSN=...
    ```
- [ ] Set up secrets management
  - [ ] Use AWS Secrets Manager
  - [ ] Store: Database credentials, Redis password, API keys
  - [ ] Rotate secrets quarterly

#### 8.3 CI/CD Pipeline
- [ ] Set up GitHub Actions
  - [ ] Workflow: Build and test on push
  - [ ] Workflow: Deploy Next.js to Vercel on merge to main
  - [ ] Workflow: Build and deploy WebSocket servers to ECS on merge to main
  - [ ] Workflow: Build agent binaries on release tag
- [ ] Agent binary builds
  - [ ] Build on GitHub Actions (Windows and Linux runners)
  - [ ] Upload to S3: `s3://operastudio-agent-templates/`
  - [ ] Versioned: `agent-win-v1.0.0.exe`, `agent-linux-v1.0.0`
- [ ] Database migrations
  - [ ] Use migration tool (e.g., node-pg-migrate)
  - [ ] Run migrations automatically on deploy
  - [ ] Test migrations on staging first

#### 8.4 Deployment Steps
- [ ] Deploy to staging
  - [ ] Deploy Next.js to staging.operastudio.io
  - [ ] Deploy WebSocket servers to staging environment
  - [ ] Deploy database and Redis (separate instances)
  - [ ] Run smoke tests
  - [ ] Test installer download and installation
  - [ ] Test full user flow
- [ ] Deploy to production
  - [ ] Run database migrations
  - [ ] Deploy WebSocket servers (rolling deployment, 1 at a time)
  - [ ] Deploy Next.js
  - [ ] Verify health checks pass
  - [ ] Monitor error rates
- [ ] Enable monitoring
  - [ ] Verify Sentry receiving errors
  - [ ] Verify Grafana dashboards populated
  - [ ] Verify uptime monitors active
  - [ ] Set up PagerDuty alerts

#### 8.5 Rollback Plan
- [ ] Document rollback procedure
  - [ ] Next.js: Revert Vercel deployment
  - [ ] WebSocket servers: Revert ECS task definition
  - [ ] Database: Rollback migration (if safe)
  - [ ] Agents: Old agents continue working (backward compatible)
- [ ] Test rollback
  - [ ] Simulate failed deployment
  - [ ] Execute rollback
  - [ ] Verify system restored

#### Success Criteria
- [x] All services running in production
- [x] Health checks passing
- [x] No critical errors in logs
- [x] Monitoring dashboards showing healthy metrics
- [x] Rollback plan tested and documented

---

### Phase 9: Beta Launch & Iteration (Week 10)
**Goal:** Real users, real feedback, real improvements

#### 9.1 Beta User Onboarding
- [ ] Invite beta users
  - [ ] Start with 10 users (internal team)
  - [ ] Expand to 50 users (friends & family)
  - [ ] Expand to 500 users (public beta signups)
- [ ] Onboarding email
  - [ ] Welcome message
  - [ ] Link to installation guide
  - [ ] Link to support (Discord / email)
- [ ] Track activation funnel
  - [ ] Sign up → Enable local env → Download installer → Connected
  - [ ] Identify drop-off points
  - [ ] Iterate to improve conversion

#### 9.2 Feedback Collection
- [ ] In-app feedback widget
  - [ ] "Send Feedback" button in settings
  - [ ] Form: What were you trying to do? What went wrong?
  - [ ] Submit to database or external tool (Canny / UserVoice)
- [ ] User interviews
  - [ ] Schedule 30-minute calls with 10 beta users
  - [ ] Ask: What do you love? What's frustrating? What's missing?
  - [ ] Document insights
- [ ] Analytics
  - [ ] Track key metrics:
    - Installation success rate
    - Time to first connection
    - Tool usage by type
    - Error rates
  - [ ] Use Mixpanel / Amplitude
  - [ ] Create dashboards

#### 9.3 Bug Fixes & Improvements
- [ ] Triage bugs
  - [ ] Critical: Fix within 24 hours
  - [ ] High: Fix within 1 week
  - [ ] Medium: Fix within 2 weeks
  - [ ] Low: Backlog
- [ ] Common issues to monitor
  - [ ] Installer not downloading (browser blocking)
  - [ ] Agent not connecting (firewall, antivirus)
  - [ ] Tool execution failures (permissions)
  - [ ] Connection drops (network issues)
- [ ] Improvements based on feedback
  - [ ] Better error messages
  - [ ] More helpful troubleshooting steps
  - [ ] Additional tools (e.g., search_files, get_clipboard)
  - [ ] UI polish

#### 9.4 Documentation
- [ ] User guide
  - [ ] How to install
  - [ ] How to use local features
  - [ ] Examples: "Read my todo.txt", "Update my config"
  - [ ] FAQ
- [ ] Troubleshooting guide
  - [ ] "Agent not connecting"
  - [ ] "Installer blocked by antivirus"
  - [ ] "Permission denied errors"
  - [ ] "Connection keeps dropping"
- [ ] Developer docs
  - [ ] Architecture overview
  - [ ] How to add new tools
  - [ ] How to debug agent locally
  - [ ] Deployment guide

#### 9.5 Metrics Review
- [ ] Week 1 metrics
  - [ ] Signups: Target 100
  - [ ] Installation success rate: Target > 80%
  - [ ] Connection success rate: Target > 90%
  - [ ] Tool execution success rate: Target > 95%
  - [ ] Critical bugs: Target 0
- [ ] Week 2-4 metrics
  - [ ] Signups: Target 500
  - [ ] Installation success rate: Target > 90%
  - [ ] Connection success rate: Target > 95%
  - [ ] Tool execution success rate: Target > 99%
  - [ ] User satisfaction (NPS): Target > 50
- [ ] Iterate based on data
  - [ ] If installation success < target: Improve installer UX
  - [ ] If connection success < target: Improve error messages, troubleshooting
  - [ ] If tool execution < target: Fix bugs, improve permissions handling

#### Success Criteria
- [x] 500 beta users onboarded
- [x] Installation success rate > 90%
- [x] Connection success rate > 95%
- [x] No critical bugs
- [x] User satisfaction (NPS) > 50
- [x] Documentation complete

---

## Component Specifications

### 1. Local Agent

**Location:** `local-agent/`
**Language:** TypeScript (compiled to standalone binary)
**Build Tool:** pkg
**Binary Size:** ~40MB
**Platforms:** Windows x64, Linux x64, macOS ARM64 (future)

#### File Structure
```
local-agent/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── websocket-client.ts      # WebSocket connection with retry
│   ├── tool-executor.ts         # Route tool calls to implementations
│   ├── file-operations.ts       # read_file, write_file, list_files
│   ├── command-executor.ts      # execute_command with sanitization
│   ├── permissions.ts           # Permission modes and checking
│   ├── config.ts                # Read/write config.json
│   ├── logger.ts                # File logging with rotation
│   ├── auto-start/
│   │   ├── windows.ts           # Task Scheduler integration
│   │   ├── linux.ts             # systemd integration
│   │   └── index.ts             # Platform detection
│   └── platform.ts              # OS detection utilities
├── dist/
│   ├── index.js                 # Compiled JavaScript
│   └── binaries/                # Built with pkg
│       ├── operastudio-agent-win-x64.exe
│       └── operastudio-agent-linux-x64
├── package.json
└── tsconfig.json
```

#### Configuration File
**Location:** `~/.operastudio/config.json`

```json
{
  "userId": "user_2abc123",
  "sharedSecret": "64-character-hex-string",
  "serverUrl": "wss://ws.operastudio.io/agent",
  "version": "1.0.0",
  "autoStart": true,
  "permissions": {
    "mode": "balanced",
    "allowedDirectories": [
      "/home/username",
      "C:\\Users\\username"
    ]
  },
  "telemetry": {
    "enabled": true,
    "anonymize": false
  }
}
```

#### Tool Implementations

**read_file:**
```typescript
async function readFile(path: string): Promise<string> {
  validatePath(path);
  checkPermission('read', path);
  return await fs.readFile(path, 'utf-8');
}
```

**write_file:**
```typescript
async function writeFile(path: string, content: string): Promise<void> {
  validatePath(path);
  checkPermission('write', path);
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, content, 'utf-8');
}
```

**list_files:**
```typescript
async function listFiles(path: string, recursive = false): Promise<FileInfo[]> {
  validatePath(path);
  checkPermission('read', path);
  const entries = await fs.readdir(path, { withFileTypes: true });
  return entries.map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
    size: entry.isFile() ? (await fs.stat(join(path, entry.name))).size : 0,
    modified: (await fs.stat(join(path, entry.name))).mtime
  }));
}
```

**execute_command:**
```typescript
async function executeCommand(
  command: string,
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  sanitizeCommand(command);
  checkPermission('execute', cwd || process.cwd());

  return new Promise((resolve, reject) => {
    const proc = spawn(command, { shell: true, cwd });
    let stdout = '', stderr = '';

    proc.stdout.on('data', data => stdout += data);
    proc.stderr.on('data', data => stderr += data);

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Command timeout'));
    }, 300000); // 5 minutes

    proc.on('close', code => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}
```

---

### 2. WebSocket Server

**Location:** `websocket-server/`
**Language:** JavaScript (Node.js)
**Framework:** ws (WebSocket library)
**Deployment:** AWS ECS / EC2

#### File Structure
```
websocket-server/
├── index.js                     # Main server
├── connection-handler.js        # Handle agent connections
├── message-router.js            # Route messages via Redis
├── health-check.js              # Health endpoint
└── package.json
```

#### Main Server
```javascript
const { WebSocketServer } = require('ws');
const { Redis } = require('ioredis');
const { validateCredentials } = require('./connection-handler');

const redis = new Redis(process.env.REDIS_URL);
const subscriber = redis.duplicate();
const publisher = redis.duplicate();

const SERVER_ID = process.env.SERVER_ID;
const localConnections = new Map(); // userId → WebSocket

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async (ws, req) => {
  const { userId, secret } = parseQuery(req.url);

  // Validate
  const isValid = await validateCredentials(userId, secret);
  if (!isValid) {
    ws.close(1008, 'Invalid credentials');
    return;
  }

  // Store connection
  localConnections.set(userId, ws);
  await redis.setex(`agent:${userId}:server`, 120, SERVER_ID);

  // Subscribe to commands
  await subscriber.subscribe(`agent:${userId}:commands`);

  console.log(`Agent ${userId} connected to ${SERVER_ID}`);

  // Handle messages from agent
  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'tool_response') {
      await publisher.publish(`response:${msg.requestId}`, data);
    }

    if (msg.type === 'heartbeat') {
      await redis.setex(`agent:${userId}:server`, 120, SERVER_ID);
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
    }
  });

  ws.on('close', async () => {
    localConnections.delete(userId);
    await redis.del(`agent:${userId}:server`);
    await subscriber.unsubscribe(`agent:${userId}:commands`);
  });
});

// Forward commands from Redis to agents
subscriber.on('message', (channel, message) => {
  const userId = channel.split(':')[1];
  const ws = localConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  }
});

// Health check
const http = require('http');
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: localConnections.size,
      serverId: SERVER_ID
    }));
  }
}).listen(8081);

console.log(`WebSocket server ${SERVER_ID} running on port 8080`);
console.log(`Health check on port 8081`);
```

---

### 3. Cloud API (Next.js)

**Location:** `app/`
**Framework:** Next.js 14+ App Router
**Deployment:** Vercel / AWS ECS

#### API Routes

**1. Chat API**
- [ ] File: `app/api/chat/route.ts`
- [ ] Accept POST with messages array
- [ ] Add local tools to LLM
- [ ] Handle tool_use blocks
- [ ] Execute tools via Redis
- [ ] Stream response

**2. Agent Status API**
- [ ] File: `app/api/agent/status/route.ts`
- [ ] Check Redis for agent connection
- [ ] Return: { connected: boolean, lastSeen: timestamp }
- [ ] Cache for 5 seconds

**3. Agent Download API**
- [ ] File: `app/api/agent/download/route.ts`
- [ ] Authenticate user
- [ ] Generate credentials
- [ ] Inject into template binary
- [ ] Stream installer to browser

**4. Health Check**
- [ ] File: `app/api/health/route.ts`
- [ ] Return: { status: 'ok', timestamp, version }

#### Tool Execution via Redis

**File:** `lib/redis/tool-executor.ts`

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const subscriber = redis.duplicate();
const publisher = redis.duplicate();

export async function executeLocalTool(
  userId: string,
  toolName: string,
  params: any
): Promise<any> {
  // Check if agent connected
  const serverId = await redis.get(`agent:${userId}:server`);
  if (!serverId) {
    throw new Error('Agent not connected');
  }

  // Generate request ID
  const requestId = `req_${Date.now()}_${randomId()}`;

  // Store pending request
  await redis.setex(`pending:${requestId}`, 30, JSON.stringify({ userId }));

  // Publish tool call
  await publisher.publish(`agent:${userId}:commands`, JSON.stringify({
    type: 'tool_call',
    requestId,
    tool: toolName,
    params
  }));

  // Wait for response
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscriber.unsubscribe(`response:${requestId}`);
      reject(new Error('Tool execution timeout'));
    }, 30000);

    subscriber.subscribe(`response:${requestId}`);
    subscriber.on('message', (channel, message) => {
      if (channel === `response:${requestId}`) {
        clearTimeout(timeout);
        subscriber.unsubscribe(`response:${requestId}`);

        const response = JSON.parse(message);
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      }
    });
  });
}
```

---

### 4. Redis Architecture

**Purpose:** Distributed state and message broker

#### Key Patterns

**1. Connection Registry**
```
Key: agent:{userId}:server
Value: "ws-prod-2"
TTL: 120 seconds (refreshed by heartbeat)
```

**2. Command Channels**
```
Channel: agent:{userId}:commands
Messages: Tool calls from cloud to agent
```

**3. Response Channels**
```
Channel: response:{requestId}
Messages: Tool responses from agent to cloud
```

**4. Pending Requests**
```
Key: pending:{requestId}
Value: { userId, timestamp }
TTL: 30 seconds
```

**5. Rate Limiting**
```
Key: ratelimit:{userId}
Value: List of timestamps
TTL: 60 seconds
```

---

### 5. Database Schema

**Database:** PostgreSQL

#### Tables

**agent_credentials**
```sql
CREATE TABLE agent_credentials (
  user_id TEXT PRIMARY KEY,
  shared_secret TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_shared_secret ON agent_credentials(shared_secret);
CREATE INDEX idx_status ON agent_credentials(status);
```

**tool_execution_logs**
```sql
CREATE TABLE tool_execution_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  params JSONB,
  result JSONB,
  success BOOLEAN,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_created ON tool_execution_logs(user_id, created_at DESC);
CREATE INDEX idx_request_id ON tool_execution_logs(request_id);
```

**user_sessions** (optional, for analytics)
```sql
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  tool_calls_count INTEGER DEFAULT 0,
  agent_version TEXT
);
```

---

## Security & Performance

### Security Measures

#### 1. Authentication
- [x] Shared secret generated per installation (32 bytes, cryptographically random)
- [x] Stored in database, hashed (optional: use bcrypt)
- [x] Validated on every WebSocket connection
- [x] Transmitted over WSS (encrypted)

#### 2. Authorization
- [x] Permission modes: Safe, Balanced, Unrestricted
- [x] Path validation (absolute paths only, no `..`)
- [x] Symlink resolution and validation
- [x] Command sanitization (block dangerous patterns)

#### 3. Rate Limiting
- [x] 100 tool calls per minute per user
- [x] Sliding window using Redis
- [x] Return 429 error if exceeded

#### 4. Audit Logging
- [x] All tool executions logged to database
- [x] Include: userId, tool, params, result, timestamp
- [x] Retention: 30 days

#### 5. Transport Security
- [x] WSS (WebSocket Secure) in production
- [x] TLS 1.3
- [x] Valid SSL certificates

#### 6. Input Validation
- [x] Validate all tool parameters
- [x] Sanitize file paths
- [x] Sanitize shell commands
- [x] Reject malformed requests

### Performance Optimizations

#### 1. Connection Pooling
- [x] Database: pg-pool with 20 connections
- [x] Redis: 10 connections per server

#### 2. Caching
- [x] Agent status cached in Redis (5s TTL)
- [x] Installer templates loaded into memory

#### 3. Asynchronous Processing
- [x] Audit logging async (don't block tool execution)
- [x] Metrics reporting async

#### 4. Compression
- [x] WebSocket messages (optional: use permessage-deflate)
- [x] Installer downloads (gzip)

#### 5. Load Balancing
- [x] Sticky sessions (route same userId to same WebSocket server)
- [x] Round-robin for new connections
- [x] Health checks for auto-scaling

### Scaling Capacity

| Users | WebSocket Servers | Redis | Database | Monthly Cost |
|-------|-------------------|-------|----------|--------------|
| 1K | 1× t3.medium | t4g.micro | t4g.micro | ~$122 |
| 10K | 1× t3.large | t4g.small | t4g.small | ~$250 |
| 100K | 3× t3.xlarge | m6g.large | t4g.large | ~$1,140 |
| 1M | 25× t3.xlarge | m6g.2xlarge cluster | r6g.2xlarge Multi-AZ | ~$11,010 |

**Cost per user at 1M scale:** $0.011/month ($0.13/year)

---

## Testing & Deployment

### Testing Strategy

#### Unit Tests
- [x] Local agent: All tool implementations
- [x] WebSocket server: Connection handling
- [x] Next.js API: Tool execution via Redis
- [x] Target: > 80% code coverage

#### Integration Tests
- [x] End-to-end tool execution (browser → cloud → agent → cloud → browser)
- [x] Multi-turn conversations
- [x] Error scenarios (disconnection, timeout, permission denied)

#### Load Tests
- [x] 1,000 concurrent agents
- [x] 10,000 concurrent agents
- [x] Sustained load (24 hours)
- [x] Failover testing (kill servers mid-operation)

#### Manual Testing
- [x] Installation on Windows 10, 11
- [x] Installation on Ubuntu 22.04, 24.04
- [x] Installation on Fedora
- [x] Cross-browser (Chrome, Firefox, Safari, Edge)

### Deployment Strategy

#### Environments
1. **Development:** Local machine
2. **Staging:** staging.operastudio.io
3. **Production:** operastudio.io

#### Deployment Process
1. Merge to `main` branch
2. CI runs tests
3. Build artifacts (binaries, Docker images)
4. Deploy to staging
5. Run smoke tests
6. Deploy to production (rolling, 1 server at a time)
7. Monitor error rates
8. Rollback if issues detected

#### Monitoring
- [x] Sentry for error tracking
- [x] Grafana for metrics
- [x] CloudWatch for logs
- [x] PagerDuty for alerts

---

## Monitoring & Operations

### Key Metrics

#### User Metrics
- Installation success rate (target: > 90%)
- Connection success rate (target: > 95%)
- Tool execution success rate (target: > 99%)
- User satisfaction / NPS (target: > 50)

#### System Metrics
- Active WebSocket connections (gauge)
- Tool calls per minute (counter)
- Tool execution time (histogram, target: p95 < 500ms)
- Error rate (counter, target: < 0.1%)
- WebSocket server CPU/memory (gauge)
- Redis CPU/memory (gauge)
- Database query time (histogram, target: p95 < 10ms)

#### Business Metrics
- New signups per day
- Active users (daily, weekly, monthly)
- Tool usage by type
- Churn rate

### Alerting Rules

#### Critical (PagerDuty)
- WebSocket server down (> 1 minute)
- Redis down
- Database down
- Error rate > 5% (> 5 minutes)
- Connection success rate < 80% (> 5 minutes)

#### Warning (Slack/Email)
- Error rate > 1% (> 10 minutes)
- Tool execution time p95 > 2s (> 10 minutes)
- WebSocket server CPU > 80% (> 5 minutes)
- Redis memory > 80%

### Runbooks

#### Agent Not Connecting
1. Check WebSocket server health endpoints
2. Check Redis connectivity
3. Check database for credentials
4. Review agent logs (ask user to send `~/.operastudio/agent.log`)
5. Check firewall / antivirus blocking

#### Tool Execution Failing
1. Check error logs in database (tool_execution_logs)
2. Check agent permissions (config.json)
3. Verify path exists and is readable
4. Check Redis pub/sub working
5. Test manually: Send tool call via Redis, check response

#### High Error Rate
1. Check Sentry for error patterns
2. Check if specific tool or all tools failing
3. Check WebSocket server logs
4. Check Redis health
5. Rollback recent deployment if needed

---

## Conclusion

This blueprint provides a complete, production-ready, **scalable** architecture for enabling local environment features in a browser-based application.

### Key Innovations
- ✅ **Redis-based message broker** for horizontal scaling
- ✅ **Separate WebSocket servers** for independent scaling
- ✅ **Pre-built installer templates** for fast downloads
- ✅ **Database persistence** for reliability
- ✅ **Comprehensive monitoring** for observability

### Timeline Summary
- Week 1: Proof of concept
- Weeks 2-3: Foundation (database, Redis, agent core)
- Weeks 3-4: Tool implementation
- Weeks 4-5: Cloud integration
- Weeks 5-6: Binary build & auto-start
- Weeks 6-7: Installer system
- Week 7: Browser UI
- Week 8: Production hardening
- Week 9: Production deployment
- Week 10: Beta launch & iteration

**Total:** 10 weeks to production-ready system

### Success Criteria
- [x] 1-2 click installation
- [x] < 60 second setup time
- [x] 99.9% uptime
- [x] Supports 1M+ concurrent users
- [x] < $0.02/user/month at scale
- [x] Installation success rate > 90%
- [x] User satisfaction (NPS) > 50

### Next Steps
1. ✅ Review and approve blueprint
2. ⬜ Set up development environment
3. ⬜ Start Phase 0: Proof of concept
4. ⬜ Iterate based on learnings

**Let's build this! 🚀**
