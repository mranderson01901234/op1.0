# Opera Studio - Comprehensive Architecture Report

**Generated:** 2025-01-27  
**Version:** 1.0  
**Purpose:** Complete architectural overview for Opera Studio codebase

---

## Table of Contents

1. [Current Architecture Overview](#1-current-architecture-overview)
2. [Browser Component](#2-browser-component)
3. [Desktop Component](#3-desktop-component)
4. [Integration Points](#4-integration-points)
5. [Current Pain Points](#5-current-pain-points)
6. [File Structure](#6-file-structure)
7. [MCP Server Recommendations](#7-mcp-server-recommendations)

---

## 1. Current Architecture Overview

### 1.1 Main Application Structure

Opera Studio is a **hybrid application** consisting of:

- **Browser Component** (Primary): Next.js web application running in the browser
- **Desktop Component** (Optional): Electron-based headless browser agent running locally
- **WebSocket Server**: Node.js service managing agent connections
- **Local Agent**: TypeScript service executing tools on user machines

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Chat UI    │  │  Monaco Editor│  │  File Panel   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP/SSE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Port 3000)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ /api/chat    │  │ /api/tools   │  │ /api/agent   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │ Redis Pub/Sub
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         WebSocket Server (Port 8082)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Connection Manager                           │   │
│  │  - Authentication (PostgreSQL)                      │   │
│  │  - Heartbeat Monitoring                              │   │
│  │  - Tool Call Routing                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Local Agent (User Machine)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tool Executor                                       │   │
│  │  - File Operations                                   │   │
│  │  - Command Execution                                 │   │
│  │  - System Info                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend (Browser)
- **Framework**: Next.js 14.2.33 (App Router)
- **UI Library**: React 18.3.1
- **Language**: TypeScript 5.6.3
- **Styling**: Tailwind CSS 3.4.11
- **Animations**: Framer Motion 11.5.4
- **Icons**: Lucide React 0.263.1
- **Editor**: Monaco Editor 4.7.0
- **Markdown**: react-markdown 10.1.0

#### Backend (API)
- **Runtime**: Node.js (via Next.js API routes)
- **AI/LLM**: Google Gemini API (`gemini-2.0-flash-exp`)
- **Streaming**: Server-Sent Events (SSE) via ReadableStream
- **Authentication**: Clerk (@clerk/nextjs 6.35.1)

#### Infrastructure
- **Database**: PostgreSQL 8.16.3 (agent credentials, audit logs)
- **Cache/Pub-Sub**: Redis 5.8.2 (ioredis) - distributed state & tool routing
- **WebSocket**: ws 8.18.0 (WebSocket server)

#### Desktop Component
- **Framework**: Electron 28.1.0 (NOT Tauri - currently Electron)
- **Browser Automation**: Puppeteer 24.30.0
- **Communication**: WebSocket client (ws 8.16.0)

### 1.3 Communication Patterns

#### WebSocket Server Port
- **Primary**: Port **8082** (configurable via `PORT` env var)
- **Alternative**: Port 3002 mentioned in query (not currently used)
- **Protocol**: WebSocket (ws:// or wss://)

#### Communication Flow

```
Browser → API Route → Redis Pub/Sub → WebSocket Server → Local Agent
   ↑                                                              │
   └─────────────────────── SSE Stream ──────────────────────────┘
```

**Key Communication Channels:**

1. **Browser ↔ API**: HTTP + SSE (Server-Sent Events)
   - Chat messages: POST `/api/chat`
   - Tool execution: Redis pub/sub (via API)
   - Streaming: SSE for real-time responses

2. **API ↔ WebSocket Server**: Redis Pub/Sub
   - Tool calls: `agent:{userId}:commands` channel
   - Tool responses: `response:{requestId}` channel
   - Connection registry: Redis keys with TTL

3. **WebSocket Server ↔ Local Agent**: WebSocket
   - Connection: `ws://localhost:8082?userId={userId}&secret={secret}`
   - Heartbeat: Every 30 seconds
   - Tool calls: JSON messages
   - Tool responses: JSON messages

### 1.4 Authentication Flow

#### User Authentication (Browser)
- **Provider**: Clerk
- **Flow**: OAuth-based authentication
- **Middleware**: `middleware.ts` protects all routes
- **User ID**: Available via `useUser()` hook (frontend) or `auth()` (backend)

#### Agent Authentication (Desktop)
- **Method**: Shared secret (64-character hex string)
- **Storage**: PostgreSQL `agent_credentials` table
- **Generation**: Via `/api/agent/install` endpoint
- **Validation**: WebSocket server validates against database
- **Flow**:
  1. User requests agent installation via `/api/agent/install`
  2. Server generates `userId` and `sharedSecret`
  3. Credentials stored in PostgreSQL
  4. Agent connects with credentials: `ws://server?userId={userId}&secret={secret}`
  5. Server validates credentials and registers connection

#### Token Management
- **Browser**: Clerk handles JWT tokens automatically
- **Agent**: Shared secret stored in `~/.operastudio/config.json`
- **No token refresh**: Agent reconnects on disconnect

---

## 2. Browser Component

### 2.1 Chat Interface Implementation

**Main Component**: `components/chat/enhanced-chat-interface.tsx` (1081 lines)

**Key Features:**
- Real-time streaming chat interface
- Complex scroll positioning logic (prevents visual flashing)
- Tool call integration with typewriter-style messages
- Search results display
- Message persistence (localStorage)
- Copy/retry functionality

**State Management:**
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [streamingContent, setStreamingContent] = useState("");
const [currentToolCall, setCurrentToolCall] = useState<...>(null);
const [currentSearchResults, setCurrentSearchResults] = useState<...>([]);
```

**Critical Scroll Positioning Logic:**
- Handles short chats (≤50% viewport) vs long chats (>50% viewport) differently
- Prevents user messages from jumping during response streaming
- Detects short responses early to minimize unnecessary scrolling
- Uses `useLayoutEffect` for synchronous DOM updates
- See `SCROLL_POSITIONING_LOGIC.md` for detailed documentation

### 2.2 Multi-LLM Routing System

**Current Status**: **Single LLM Provider** (Google Gemini)

**Implementation**: `lib/gemini-client.ts` and `lib/gemini-config.ts`

**Model**: `gemini-2.0-flash-exp`

**Configuration**:
```typescript
export const MODEL_NAME = 'gemini-2.0-flash-exp';
export const GENERATION_CONFIG = {
  temperature: 0.5,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 8192,
};
```

**Note**: While the codebase mentions "Multi-LLM routing system (OpenAI, Anthropic, Google)" in the query, **only Google Gemini is currently implemented**. The architecture supports adding more providers, but they are not yet integrated.

**Potential Multi-LLM Architecture**:
```typescript
// Future implementation pattern
const providers = {
  openai: createOpenAIClient(),
  anthropic: createAnthropicClient(),
  google: createGeminiClient(),
};

const selectedProvider = selectProvider(userPreference, model);
```

### 2.3 Memory System Architecture

**Current Implementation**: **localStorage-based conversation persistence**

**Location**: `lib/storage.ts`

**Storage Pattern**:
- Key format: `operastudio_conversations_${userId}`
- Stores array of `Conversation` objects
- Max 50 conversations per user
- JSON serialization

**Conversation Structure**:
```typescript
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
```

**⚠️ Important Note**: The query mentions "proactive context saving" and "RAG semantic search", but **these features are NOT currently implemented**. The current memory system is:
- ✅ Conversation persistence (localStorage)
- ❌ Proactive context saving (not implemented)
- ❌ RAG semantic search (not implemented)
- ❌ Vector embeddings (not implemented)
- ❌ Semantic similarity search (not implemented)

**Current Context Management**:
- Last 50 messages sent to LLM (trimmed in `app/api/chat/route.ts`)
- Editor context (active file, open files) added to messages
- Search results added to message context
- No persistent memory beyond conversation history

**Potential RAG Implementation**:
```typescript
// Future architecture
interface MemorySystem {
  // Proactive context saving
  saveContext(userId: string, context: Context): Promise<void>;
  
  // RAG semantic search
  searchSimilar(userId: string, query: string, limit: number): Promise<Context[]>;
  
  // Vector embeddings
  embed(text: string): Promise<number[]>;
}
```

### 2.4 Current Tool-Calling Implementation

**Tool Definition**: `lib/gemini-tools.ts` (411 lines)

**Available Tools**: 27 tools across 5 categories:

1. **File Operations** (8 tools):
   - `read_file`, `write_file`, `delete_file`, `move_file`, `copy_file`
   - `get_file_info`, `search_files`, `search_content`

2. **Directory Operations** (4 tools):
   - `list_directory`, `create_directory`, `delete_directory`, `get_directory_size`

3. **System Operations** (5 tools):
   - `execute_command`, `get_system_info`, `get_process_list`
   - `get_environment_variables`, `get_current_directory`

4. **System Health Monitoring** (5 tools):
   - `get_system_health`, `get_cpu_usage`, `get_memory_usage`
   - `get_disk_space`, `get_network_info`

5. **Development Tools** (5 tools):
   - `run_npm_command`, `git_status`, `git_diff`, `install_package`

**Tool Execution Flow**:
```
LLM → Function Call → API Route → Redis Pub/Sub → WebSocket Server → Agent → Execute → Response → LLM
```

**Implementation Details**:
- Tools defined as Gemini function declarations
- Multi-round execution (up to 10 rounds, ReAct pattern)
- Tool results sent back to LLM for continued generation
- Client receives tool_call and tool_result events via SSE

**Code Snippet** (`app/api/chat/route.ts`):
```typescript
// Execute tool on local agent
const toolResult = await sendToolCall(userId, {
  tool: call.name,
  params: call.args,
});

// Format result for Gemini
functionResults.push({
  functionResponse: {
    name: call.name,
    response: toolResult,
  },
});

// Send result back to model
result = await chat.sendMessageStream(functionResults);
```

### 2.5 State Management Approach

**Pattern**: **React Context API + Local Component State** (No Zustand/Redux)

**Context Providers**:
1. **EditorContext** (`contexts/editor-context.tsx`):
   - Manages open files, active file, active tab
   - File operations (read, save, close)
   - URL viewing in split view

2. **ConditionalClerkProvider** (`components/providers/conditional-clerk-provider.tsx`):
   - Wraps Clerk provider conditionally
   - Handles authentication state

3. **ToastProvider** (`components/providers/toast-provider.tsx`):
   - Toast notifications (Sonner)

**Local State**:
- Chat messages: `useState` in `enhanced-chat-interface.tsx`
- Streaming content: `useState` for real-time updates
- UI state: Loading, errors, tool calls

**Persistence**:
- Conversations: localStorage (via `lib/storage.ts`)
- Sidebar state: localStorage
- No server-side state synchronization

**State Flow Example**:
```typescript
// Component state
const [messages, setMessages] = useState<Message[]>([]);

// Context state
const { openFiles, activeFile } = useEditor();

// Persistence
useEffect(() => {
  saveConversation(conversation, userId);
}, [messages]);
```

---

## 3. Desktop Component (Tauri/Electron)

### 3.1 Current Status: Headless vs UI-Based

**Current Implementation**: **Electron-based headless browser agent**

**Status**: 
- ✅ **Headless**: Runs in system tray, no visible window by default
- ✅ **Browser Automation**: Uses Puppeteer for headless Chrome
- ❌ **Tauri**: NOT implemented (query mentions Tauri, but codebase uses Electron)

**Files**:
- `electron-browser/src/main.js` - Electron main process
- `electron-browser/src/browser-manager.js` - Puppeteer controller
- `electron-browser/src/websocket-client.js` - WebSocket communication

**Architecture**:
```javascript
// Main process creates hidden window
mainWindow = new BrowserWindow({
  width: 400,
  height: 600,
  show: false, // Start hidden
});

// System tray icon
tray = new Tray(icon);
```

**Note**: The query mentions "Tauri/Electron" but the codebase currently uses **Electron only**. There is no Tauri configuration (`tauri.conf.json`) or Rust code.

### 3.2 WebSocket Server Implementation Details

**Location**: `websocket-server/` directory

**Main Entry**: `websocket-server/src/index.ts`

**Key Components**:

1. **Connection Manager** (`websocket-server/src/connection-manager.ts`):
   - Handles WebSocket connections
   - Validates credentials against PostgreSQL
   - Manages heartbeat monitoring (30s interval, 90s timeout)
   - Routes tool calls via Redis pub/sub

2. **Redis Integration** (`websocket-server/src/redis/`):
   - `client.ts`: Redis connection management
   - `registry.ts`: Agent registry and pub/sub

3. **Database Integration** (`websocket-server/src/db/`):
   - `client.ts`: PostgreSQL connection pool
   - `auth.ts`: Credential validation and logging

**Connection Flow**:
```
1. Agent connects: ws://server:8082?userId={userId}&secret={secret}
2. Server validates credentials (PostgreSQL)
3. Server registers connection in Redis (120s TTL)
4. Server subscribes to Redis pub/sub for agent commands
5. Server sends connection confirmation
6. Agent sends heartbeat every 30s
7. Server refreshes Redis TTL on heartbeat
8. Server monitors for timeout (90s)
```

**Redis Keys**:
- `agent:{userId}:server` - Server ID (TTL: 120s)
- `agent:{userId}:status` - Connection status
- `agent:{userId}:commands` - Pub/sub channel for tool calls
- `response:{requestId}` - Pub/sub channel for responses

**Scalability**:
- Supports multiple server instances
- Shared Redis state for distributed routing
- 10K+ connections per server instance
- Horizontal scaling via load balancer

### 3.3 File System Access Capabilities

**Implementation**: `local-agent/src/tools/` directory

**Permission System**: 3-tier permission model

1. **Safe Mode**:
   - Read-only file operations
   - Restricted commands (blocks rm, chmod, curl, etc.)
   - Path validation (only allowed directories)

2. **Balanced Mode** (Default):
   - Read/write file operations
   - Most commands allowed
   - Blocks dangerous commands (format, dd, shutdown, sudo)
   - Path validation

3. **Unrestricted Mode**:
   - Full file system access
   - All commands allowed
   - No path validation
   - ⚠️ Use with caution

**File Operations**:
- `read_file`: Max 10MB, path validation
- `write_file`: Creates parent directories, path validation
- `list_directory`: Recursive option, path validation
- `delete_file`: Path validation, permission check
- `move_file`, `copy_file`: Source and destination validation

**Security Features**:
- Path traversal prevention
- Symlink resolution
- Dangerous command blocking
- Permission mode enforcement

**Configuration**: `~/.operastudio/config.json`
```json
{
  "permissions": {
    "mode": "balanced",
    "allowedDirectories": ["/home/user"]
  }
}
```

### 3.4 Tool Execution Framework

**Tool Executor**: `local-agent/src/tools/index.ts` (596 lines)

**Execution Flow**:
```
1. Agent receives tool_call via WebSocket
2. Tool executor validates permissions
3. Tool executor calls appropriate tool function
4. Tool executes operation (file, command, system info)
5. Tool executor formats result
6. Agent sends tool_response via WebSocket
7. WebSocket server publishes to Redis
8. API receives response via Redis subscription
```

**Tool Categories**:

1. **File Operations** (`file-operations.ts`, `file-advanced.ts`):
   - Basic: read, write, list
   - Advanced: delete, move, copy, search, get info

2. **Directory Operations** (`directory-operations.ts`):
   - List, create, delete, get size

3. **Command Execution** (`command-executor.ts`):
   - Shell command execution
   - 5-minute timeout
   - Dangerous command blocking
   - stdout/stderr capture

4. **System Info** (`system-info.ts`):
   - System information, processes, environment variables
   - Health monitoring (CPU, memory, disk, network)

5. **Development Tools** (`dev-tools.ts`):
   - npm/pnpm commands, git operations, package installation

**Error Handling**:
- Permission errors return user-friendly messages
- File errors mapped to readable messages (ENOENT → "File not found")
- Command timeouts handled gracefully
- All errors logged to `~/.operastudio/agent.log`

### 3.5 Auto-Start and Background Service Setup

**Implementation**: `local-agent/src/auto-start/` directory

**Platform Support**:
- ✅ **Windows**: Registry-based (`windows.ts`)
  - Registry key: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
  - Entry: `OperaStudioAgent`

- ✅ **Linux**: XDG autostart (`linux.ts`)
  - Desktop file: `~/.config/autostart/operastudio-agent.desktop`
  - XDG autostart specification

- ❌ **macOS**: Not yet implemented (planned: launchd)

**Auto-Start Flow**:
```
1. User installs agent
2. Agent checks platform
3. Agent creates auto-start entry (Registry/.desktop file)
4. System starts agent on boot
5. Agent connects to WebSocket server
6. Agent runs in background
```

**Background Service**:
- Runs as system tray application (Electron)
- No visible window by default
- Logs to `~/.operastudio/agent.log`
- Automatic reconnection on disconnect
- Exponential backoff for reconnection

**Configuration**:
```json
{
  "autoStart": true,
  "serverUrl": "wss://ws.operastudio.com"
}
```

---

## 4. Integration Points

### 4.1 Browser ↔ Desktop Communication

**Architecture**: **Indirect via WebSocket Server**

```
Browser (Next.js) → API Route → Redis Pub/Sub → WebSocket Server → Desktop Agent
```

**Communication Channels**:

1. **Tool Calls** (Browser → Desktop):
   ```typescript
   // Browser: app/api/chat/route.ts
   const toolResult = await sendToolCall(userId, {
     tool: 'read_file',
     params: { path: '/home/user/file.txt' }
   });
   
   // Redis: lib/redis/tool-call.ts
   await publisher.publish(`agent:${userId}:commands`, JSON.stringify({
     type: 'tool_call',
     requestId: 'req_xxx',
     tool: 'read_file',
     params: { path: '/home/user/file.txt' }
   }));
   
   // WebSocket Server: websocket-server/src/connection-manager.ts
   this.sendMessage(userId, message); // Forwards to agent
   
   // Agent: local-agent/src/websocket-client.ts
   ws.on('message', (data) => {
     const message = JSON.parse(data.toString());
     if (message.type === 'tool_call') {
       executeTool(message);
     }
   });
   ```

2. **Tool Responses** (Desktop → Browser):
   ```typescript
   // Agent: local-agent/src/websocket-client.ts
   ws.send(JSON.stringify({
     type: 'tool_response',
     requestId: 'req_xxx',
     success: true,
     result: { content: '...' }
   }));
   
   // WebSocket Server: websocket-server/src/connection-manager.ts
   await publishToolResponse(requestId, response);
   
   // Redis: lib/redis/tool-call.ts
   await publisher.publish(`response:${requestId}`, JSON.stringify(response));
   
   // API: lib/redis/tool-call.ts
   subscriber.on('message', (channel, message) => {
     if (channel === `response:${requestId}`) {
       resolve(JSON.parse(message));
     }
   });
   ```

**No Direct Communication**: Browser and Desktop never communicate directly. All communication goes through the WebSocket server via Redis pub/sub.

### 4.2 Authentication/Authorization Between Components

**Browser Authentication**:
- **Provider**: Clerk
- **Method**: OAuth (Google, GitHub, etc.)
- **Token**: JWT managed by Clerk
- **Protection**: `middleware.ts` protects all routes

**Agent Authentication**:
- **Method**: Shared secret (64-character hex)
- **Storage**: PostgreSQL `agent_credentials` table
- **Generation**: `/api/agent/install` endpoint
- **Validation**: WebSocket server validates on connection

**Authorization Flow**:
```
1. User authenticates via Clerk (browser)
2. User requests agent installation: POST /api/agent/install
3. Server generates userId and sharedSecret
4. Credentials stored in PostgreSQL (linked to Clerk userId)
5. Agent connects with credentials
6. WebSocket server validates credentials
7. Server registers connection in Redis
8. Tool calls routed to agent via userId
```

**Security Model**:
- Each user has isolated agent connection
- Tool calls scoped to authenticated user
- No cross-user access possible
- Credentials never exposed in logs

### 4.3 Tool Call Routing (Browser vs Desktop Execution)

**Current Architecture**: **All tools execute on Desktop Agent**

**Routing Logic**:
```typescript
// app/api/chat/route.ts
const agentConnected = await isAgentConnected(userId);

// Only enable tools if agent is connected
const model = createGeminiClient(agentConnected ? { tools } : undefined);

// Tool execution always goes to agent
if (agentConnected) {
  const toolResult = await sendToolCall(userId, {
    tool: call.name,
    params: call.args,
  });
}
```

**Tool Execution Locations**:

| Tool Category | Execution Location | Notes |
|--------------|-------------------|-------|
| File Operations | Desktop Agent | Requires local file system access |
| Directory Operations | Desktop Agent | Requires local file system access |
| System Operations | Desktop Agent | Requires local system access |
| System Health | Desktop Agent | Requires local system access |
| Development Tools | Desktop Agent | Requires local system access |
| Web Search | Browser (API) | Executes server-side via Brave API |

**No Browser-Side Tool Execution**: Currently, all tools that require local access execute on the desktop agent. The browser only handles:
- Web search (via Brave Search API)
- Chat streaming (SSE)
- UI rendering

**Future Possibility**: Some tools could execute browser-side (e.g., browser automation, DOM manipulation), but this is not currently implemented.

### 4.4 Data Synchronization Patterns

**Conversation Data**:
- **Storage**: localStorage (browser-side only)
- **Sync**: ❌ No server-side sync
- **Scope**: Per-user, per-browser
- **Limitation**: Lost if localStorage cleared, no cross-device sync

**Agent Status**:
- **Storage**: Redis (distributed)
- **Sync**: ✅ Real-time via Redis keys
- **TTL**: 120 seconds (refreshed on heartbeat)
- **Query**: `/api/agent/status` endpoint

**Tool Execution Logs**:
- **Storage**: PostgreSQL `tool_execution_logs` table
- **Sync**: ✅ Server-side audit log
- **Scope**: Per-user, all executions logged
- **Retention**: Indefinite (no cleanup policy)

**File System State**:
- **Storage**: ❌ Not synchronized
- **Sync**: ❌ No sync between browser and desktop
- **Note**: Browser shows files via `list_directory` tool calls, but doesn't maintain state

**Editor State**:
- **Storage**: React Context (in-memory)
- **Sync**: ❌ No persistence
- **Scope**: Per-session, lost on refresh

**Synchronization Gaps**:
1. ❌ Conversation history not synced to server
2. ❌ Editor state not persisted
3. ❌ File system state not cached
4. ✅ Agent connection status synced (Redis)
5. ✅ Tool execution logs synced (PostgreSQL)

---

## 5. Current Pain Points

### 5.1 Tool Development Velocity (6 Hours Per Tool)

**Current Process**:
1. Define tool in `lib/gemini-tools.ts` (function declaration)
2. Implement tool in `local-agent/src/tools/` (actual execution)
3. Register tool in `local-agent/src/tools/index.ts`
4. Test tool execution end-to-end
5. Update documentation

**Bottlenecks**:
- **Manual Registration**: Each tool must be manually added to tool executor switch statement
- **Type Safety**: No shared types between browser and agent
- **Testing**: Manual testing required for each tool
- **Documentation**: Must update multiple files

**Example Tool Addition**:
```typescript
// 1. lib/gemini-tools.ts
{
  name: "new_tool",
  description: "...",
  parameters: { ... }
}

// 2. local-agent/src/tools/new-tool.ts
export async function newTool(params: {...}): Promise<ToolResult> {
  // Implementation
}

// 3. local-agent/src/tools/index.ts
case 'new_tool':
  return await executeNewTool(params);

// 4. Test manually
```

**Estimated Time**: 4-6 hours per tool (as mentioned in query)

**Potential Solutions**:
- **MCP Server Integration**: Tools as MCP servers (see Section 7)
- **Code Generation**: Generate tool stubs from definitions
- **Shared Types**: TypeScript shared types package
- **Automated Testing**: Unit tests for each tool

### 5.2 Authentication Issues in Tauri Component

**Current Status**: **No Tauri Component Exists**

**Query Mention**: "Authentication issues in Tauri component"

**Reality**: 
- ❌ Tauri is NOT implemented
- ✅ Electron browser agent exists
- ⚠️ Electron agent has hardcoded `USER_ID` in `main.js`:
  ```javascript
  const USER_ID = process.env.USER_ID || 'demo-user'; // TODO: Get from config file
  ```

**Actual Issues**:
1. **Hardcoded User ID**: Electron agent uses `demo-user` by default
2. **No Config File Integration**: Should read from `~/.operastudio/config.json`
3. **No Authentication Flow**: No UI for entering credentials

**Fix Required**:
```javascript
// electron-browser/src/main.js
// Should read from config file:
const config = loadConfig(); // ~/.operastudio/config.json
const USER_ID = config.userId;
const WS_URL = config.serverUrl;
```

**Note**: If Tauri is planned, authentication would need to be implemented from scratch.

### 5.3 Terminal Output Streaming Implementation

**Current Status**: **NOT Implemented**

**Query Mention**: "Terminal output streaming implementation"

**Reality**:
- ❌ Terminal output streaming not implemented
- ✅ Command execution captures stdout/stderr
- ❌ No real-time streaming of command output
- ❌ No terminal emulation UI

**Current Command Execution**:
```typescript
// local-agent/src/tools/command-executor.ts
const { stdout, stderr } = await execAsync(command, { timeout });
return {
  success: true,
  result: {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode: 0
  }
};
```

**Limitations**:
- Output only returned after command completes
- No real-time streaming
- No terminal UI in browser
- Long-running commands block until completion

**Potential Implementation**:
```typescript
// Future: Stream terminal output
const stream = spawn(command);
stream.stdout.on('data', (chunk) => {
  // Send chunk to browser via WebSocket
  publishStreamChunk(requestId, chunk);
});
```

**UI Requirement**: Terminal emulation component (e.g., xterm.js) in browser

### 5.4 Architectural Bottlenecks

**Identified Bottlenecks**:

1. **Redis Pub/Sub Single Point of Failure**:
   - All tool calls go through Redis
   - If Redis fails, entire system fails
   - **Mitigation**: Redis cluster, but not implemented

2. **WebSocket Server Single Instance**:
   - Currently single server instance
   - **Mitigation**: Horizontal scaling supported, but requires load balancer

3. **No Tool Result Caching**:
   - Same tool calls executed repeatedly
   - **Mitigation**: Could cache results, but not implemented

4. **localStorage Limitations**:
   - Conversation history limited to browser storage
   - No cross-device sync
   - **Mitigation**: Could move to PostgreSQL, but not implemented

5. **No Rate Limiting on Tool Calls**:
   - Users can spam tool calls
   - **Mitigation**: Rate limiting exists for chat, but not for tools

6. **Synchronous Tool Execution**:
   - Tools execute sequentially
   - Long-running tools block other tools
   - **Mitigation**: Could parallelize, but not implemented

7. **No Tool Timeout Handling in UI**:
   - 60-second timeout exists, but UI doesn't show progress
   - **Mitigation**: Could add progress indicators, but not implemented

---

## 6. File Structure

### 6.1 Key Directories and Their Purposes

```
op1.0/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── agent/                # Agent management
│   │   │   ├── install/          # Agent installation
│   │   │   └── status/           # Agent status check
│   │   ├── chat/                 # Chat API
│   │   │   └── route.ts          # Main chat endpoint
│   │   ├── files/                # File operations
│   │   └── tools/                # Tool execution
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── setup/                    # Setup page
│
├── components/                    # React components
│   ├── agent/                    # Agent status components
│   ├── auth/                     # Authentication components
│   ├── chat/                     # Chat interface components
│   │   ├── enhanced-chat-interface.tsx  # Main chat (1081 lines)
│   │   ├── chat-input.tsx        # Message input
│   │   ├── message-renderer.tsx  # Markdown rendering
│   │   └── SearchResponse.tsx    # Search results UI
│   ├── editor/                   # Code editor components
│   │   ├── monaco-editor.tsx     # Monaco editor
│   │   └── split-view.tsx        # 50/50 split layout
│   ├── layout/                   # Layout components
│   │   ├── app-layout.tsx        # Main app layout
│   │   ├── sidebar.tsx           # Left sidebar
│   │   └── header.tsx            # Top header
│   └── ui/                       # Reusable UI components
│
├── contexts/                     # React contexts
│   └── editor-context.tsx        # Editor state management
│
├── hooks/                        # Custom React hooks
│   ├── use-agent-status.ts       # Agent connection status
│   └── use-keyboard-shortcuts.ts # Keyboard shortcuts
│
├── lib/                          # Utility libraries
│   ├── db/                       # Database utilities
│   │   ├── client.ts             # PostgreSQL connection pool
│   │   └── agent-credentials.ts  # Credential CRUD
│   ├── redis/                    # Redis utilities
│   │   ├── client.ts             # Redis connections
│   │   ├── connection-registry.ts # Agent registry
│   │   └── tool-call.ts          # Tool call pub/sub ⚠️ KEY FILE
│   ├── search/                   # Search integration
│   │   ├── braveSearch.ts        # Brave Search API
│   │   └── detectSearchIntent.ts # Search intent detection
│   ├── gemini-client.ts          # Gemini AI client factory
│   ├── gemini-config.ts          # LLM configuration
│   ├── gemini-tools.ts           # Tool definitions ⚠️ KEY FILE
│   ├── storage.ts                # localStorage utilities
│   └── types.ts                  # TypeScript types
│
├── local-agent/                  # Local agent service (separate)
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── config.ts              # Configuration management
│   │   ├── logger.ts              # File logging
│   │   ├── websocket-client.ts    # WebSocket connection
│   │   ├── tools/                 # Tool implementations
│   │   │   ├── index.ts           # Tool executor ⚠️ KEY FILE
│   │   │   ├── file-operations.ts
│   │   │   ├── command-executor.ts
│   │   │   ├── permissions.ts
│   │   │   └── ...
│   │   └── auto-start/            # Auto-start implementations
│   └── package.json
│
├── websocket-server/             # WebSocket server (separate)
│   ├── src/
│   │   ├── index.ts              # Main server entry
│   │   ├── connection-manager.ts # Connection handling ⚠️ KEY FILE
│   │   ├── redis/                 # Redis utilities
│   │   └── db/                   # Database utilities
│   └── package.json
│
├── electron-browser/             # Electron browser agent
│   ├── src/
│   │   ├── main.js               # Electron main process
│   │   ├── browser-manager.js    # Puppeteer controller
│   │   └── websocket-client.js   # WebSocket communication
│   └── package.json
│
├── database/                     # Database schema
│   └── schema.sql                # PostgreSQL schema
│
└── Configuration Files
    ├── package.json               # Main dependencies
    ├── tsconfig.json              # TypeScript config
    ├── next.config.js             # Next.js config
    ├── tailwind.config.ts         # Tailwind config
    └── middleware.ts              # Next.js middleware (Clerk)
```

### 6.2 Main Entry Points

**Browser (Next.js)**:
- **Entry**: `app/layout.tsx` (root layout)
- **Home**: `app/page.tsx`
- **Chat API**: `app/api/chat/route.ts`
- **Main Component**: `components/chat/enhanced-chat-interface.tsx`

**WebSocket Server**:
- **Entry**: `websocket-server/src/index.ts`
- **Port**: 8082 (configurable)
- **Start**: `cd websocket-server && pnpm dev`

**Local Agent**:
- **Entry**: `local-agent/src/index.ts`
- **Config**: `~/.operastudio/config.json`
- **Start**: `cd local-agent && pnpm dev`

**Electron Browser**:
- **Entry**: `electron-browser/src/main.js`
- **Start**: `cd electron-browser && npm run dev`

### 6.3 Shared Code/Utilities

**Shared Types**: `lib/types.ts`
- `Message`, `Conversation`, `ToolCall`, `ToolResult`
- Used by both browser and agent (via separate definitions)

**Shared Utilities**: `lib/utils.ts`
- `cn()` - Class name utility
- `generateConversationTitle()` - Title generation

**No True Shared Package**: Browser and agent are separate projects with separate `package.json` files. Types are duplicated, not shared.

### 6.4 Configuration Files

**Environment Variables** (`.env.local`):
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Brave Search
BRAVE_API_KEY=your_brave_api_key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5433/operastudio

# Redis
REDIS_URL=redis://localhost:6380

# WebSocket Server
WS_SERVER_URL=ws://localhost:8082
```

**Agent Configuration** (`~/.operastudio/config.json`):
```json
{
  "userId": "user_xxx",
  "sharedSecret": "64-character-hex-string",
  "serverUrl": "wss://ws.operastudio.com",
  "version": "1.0.0",
  "autoStart": true,
  "permissions": {
    "mode": "balanced",
    "allowedDirectories": ["/home/user"]
  }
}
```

---

## 7. MCP Server Recommendations

### 7.1 Current Tool Architecture vs MCP

**Current Architecture**:
- Tools defined in `lib/gemini-tools.ts` (browser)
- Tools implemented in `local-agent/src/tools/` (agent)
- Manual registration in `local-agent/src/tools/index.ts`
- No standardized interface

**MCP Architecture Benefits**:
- **Standardized Protocol**: MCP (Model Context Protocol) provides standard tool interface
- **Modularity**: Each tool can be a separate MCP server
- **Reusability**: Tools can be shared across projects
- **Type Safety**: MCP provides schema validation
- **Discovery**: Automatic tool discovery via MCP

### 7.2 Recommended MCP Implementation

**Architecture**:
```
Browser → API Route → MCP Client → MCP Server (Tool) → Execute → Response
```

**Implementation Steps**:

1. **Create MCP Server for Each Tool Category**:
   ```typescript
   // mcp-servers/file-operations/server.ts
   import { Server } from '@modelcontextprotocol/sdk/server';
   
   const server = new Server({
     name: 'file-operations',
     version: '1.0.0',
   });
   
   server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [
       {
         name: 'read_file',
         description: 'Read file contents',
         inputSchema: {
           type: 'object',
           properties: {
             path: { type: 'string' }
           }
         }
       }
     ]
   }));
   ```

2. **Replace Manual Tool Registration**:
   ```typescript
   // Current: Manual registration
   case 'read_file':
     return await executeReadFile(params);
   
   // MCP: Automatic discovery
   const mcpClient = new MCPClient('file-operations');
   const tools = await mcpClient.listTools();
   // Tools automatically available
   ```

3. **Tool Development Velocity Improvement**:
   - **Before**: 6 hours per tool (manual registration, testing)
   - **After**: 2-3 hours per tool (MCP server, auto-discovery)
   - **Benefit**: 50% reduction in development time

### 7.3 MCP Server Structure

**Recommended Structure**:
```
mcp-servers/
├── file-operations/
│   ├── server.ts
│   ├── tools/
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   └── ...
│   └── package.json
├── system-operations/
│   ├── server.ts
│   ├── tools/
│   │   ├── execute-command.ts
│   │   ├── get-system-info.ts
│   │   └── ...
│   └── package.json
└── development-tools/
    ├── server.ts
    ├── tools/
    │   ├── npm-command.ts
    │   ├── git-status.ts
    │   └── ...
    └── package.json
```

**Benefits**:
- **Modularity**: Each tool category is independent
- **Testing**: Test each MCP server independently
- **Deployment**: Deploy tools separately
- **Versioning**: Version each tool category independently

### 7.4 Integration with Current Architecture

**Migration Path**:

1. **Phase 1**: Create MCP servers alongside existing tools
   - Keep existing tools working
   - Create MCP servers for new tools
   - Test MCP integration

2. **Phase 2**: Migrate existing tools to MCP
   - Convert `local-agent/src/tools/` to MCP servers
   - Update tool executor to use MCP clients
   - Maintain backward compatibility

3. **Phase 3**: Remove manual tool registration
   - Remove switch statement in `local-agent/src/tools/index.ts`
   - Use MCP client for all tools
   - Simplify tool executor

**Code Example**:
```typescript
// lib/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client';

export class MCPToolClient {
  private clients: Map<string, Client> = new Map();
  
  async connect(serverName: string, transport: Transport) {
    const client = new Client({ name: serverName }, transport);
    await client.connect();
    this.clients.set(serverName, client);
  }
  
  async listTools(serverName: string) {
    const client = this.clients.get(serverName);
    return await client.listTools();
  }
  
  async callTool(serverName: string, toolName: string, params: any) {
    const client = this.clients.get(serverName);
    return await client.callTool({ name: toolName, arguments: params });
  }
}
```

### 7.5 Areas That Would Benefit from MCP

**High Priority**:
1. **File Operations** (8 tools) - Most frequently used
2. **System Operations** (5 tools) - Core functionality
3. **Development Tools** (5 tools) - Developer-focused

**Medium Priority**:
4. **Directory Operations** (4 tools) - Less frequently used
5. **System Health Monitoring** (5 tools) - New feature

**Low Priority**:
6. **Web Search** - Already external API, less benefit

**Expected Impact**:
- **Tool Development Time**: 6 hours → 2-3 hours (50% reduction)
- **Code Maintainability**: Improved (standardized interface)
- **Tool Reusability**: High (tools can be used in other projects)
- **Testing**: Easier (MCP provides testing utilities)

---

## 8. Summary

### 8.1 Architecture Highlights

✅ **Strengths**:
- Clean separation of concerns (browser, API, WebSocket server, agent)
- Scalable architecture (horizontal scaling supported)
- Security-focused (permission system, credential validation)
- Real-time communication (WebSocket, SSE)

⚠️ **Gaps**:
- No RAG/semantic search (mentioned but not implemented)
- No Tauri (query mentions Tauri, but Electron is used)
- No terminal output streaming
- No cross-device sync for conversations
- Single LLM provider (Gemini only, despite "multi-LLM" mention)

### 8.2 Key Integration Points

1. **Browser ↔ API**: HTTP + SSE for chat streaming
2. **API ↔ WebSocket Server**: Redis pub/sub for tool calls
3. **WebSocket Server ↔ Agent**: WebSocket for tool execution
4. **Agent ↔ File System**: Direct Node.js file system access

### 8.3 Critical Files

- `app/api/chat/route.ts` - Main chat API endpoint
- `lib/gemini-tools.ts` - Tool definitions
- `lib/redis/tool-call.ts` - Tool call routing
- `local-agent/src/tools/index.ts` - Tool executor
- `websocket-server/src/connection-manager.ts` - Connection management
- `components/chat/enhanced-chat-interface.tsx` - Main chat UI

### 8.4 Recommendations

1. **Implement MCP Servers**: Reduce tool development time from 6 hours to 2-3 hours
2. **Add RAG System**: Implement semantic search for memory (currently missing)
3. **Fix Agent Authentication**: Read credentials from config file (not hardcoded)
4. **Add Terminal Streaming**: Implement real-time command output streaming
5. **Migrate to Tauri**: If Tauri is desired, migrate from Electron
6. **Add Multi-LLM Support**: Implement OpenAI and Anthropic providers
7. **Sync Conversations**: Move conversation storage to PostgreSQL for cross-device sync

---

**Report Generated**: 2025-01-27  
**Codebase Version**: Based on current state as of report generation  
**Next Review**: After implementing MCP servers or major architectural changes

