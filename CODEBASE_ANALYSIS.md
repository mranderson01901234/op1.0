# OperaStudio Codebase Analysis

**Generated:** 2025-01-27  
**Purpose:** Comprehensive overview for implementing headless Tauri mini browser integration

---

## 1. Technology Stack Summary

### Core Framework
- **Next.js 14.2.33** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety

### Authentication & User Management
- **@clerk/nextjs 6.35.1** - Authentication provider
- User-scoped data storage (localStorage per user ID)

### AI/LLM Integration
- **@google/generative-ai 0.24.1** - Google Gemini API client
- **Model:** `gemini-2.0-flash-exp`
- **Streaming:** Server-Sent Events (SSE) via ReadableStream
- **Function Calling:** Multi-round tool execution (ReAct pattern)

### Code Editor
- **@monaco-editor/react 4.7.0** - VS Code editor component
- Language auto-detection from file extensions
- Dark theme integration

### State Management
- **React Context API** - No Zustand/Redux
  - `EditorContext` - File management
  - No global chat state management (local component state)

### Styling & UI
- **Tailwind CSS 3.4.11** - Utility-first CSS
- **Framer Motion 11.5.4** - Animation library
- **Lucide React 0.263.1** - Icon library
- **Sonner 2.0.7** - Toast notifications
- **next-themes 0.4.6** - Theme management (dark mode)

### Data Storage
- **localStorage** - Client-side conversation persistence
- **PostgreSQL** (via `pg 8.16.3`) - Server-side agent credentials
- **Redis** (via `ioredis 5.8.2`) - Distributed state & pub/sub

### Search Integration
- **Brave Search API** - Web search functionality
- Search intent detection
- Result formatting for LLM context

### Markdown & Content
- **react-markdown 10.1.0** - Markdown rendering
- **remark-gfm 4.0.1** - GitHub Flavored Markdown
- **react-syntax-highlighter 16.1.0** - Code syntax highlighting

### Utilities
- **nanoid 5.1.6** - ID generation
- **clsx 2.1.1** - Conditional classnames
- **tailwind-merge 2.5.2** - Tailwind class merging
- **class-variance-authority 0.7.0** - Component variants

### Infrastructure (Separate Services)
- **WebSocket Server** - Node.js service for agent connections
- **Local Agent** - TypeScript service running on user machines

---

## 2. Project Architecture

```
op1.0/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── agent/                # Agent management endpoints
│   │   │   ├── install/         # Agent installation API
│   │   │   └── status/          # Agent status check
│   │   ├── chat/                 # Chat API endpoints
│   │   │   ├── route.ts         # Main chat route (with search)
│   │   │   └── route-with-tools.ts  # Alternative route
│   │   ├── files/                # File operations
│   │   │   └── list/            # Directory listing
│   │   └── tools/                # Tool execution
│   │       └── execute/         # Execute tool on agent
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── setup/                     # Setup page
│
├── components/                    # React components
│   ├── agent/                    # Agent status components
│   ├── auth/                     # Authentication components
│   │   ├── auth-buttons.tsx
│   │   ├── auth-modal.tsx
│   │   ├── auth-state-listener.tsx
│   │   ├── conditional-clerk-components.tsx
│   │   └── protected-chat.tsx
│   ├── chat/                     # Chat interface components
│   │   ├── chat-input.tsx        # Message input component
│   │   ├── chat-interface.tsx    # Legacy chat (not used)
│   │   ├── enhanced-chat-interface.tsx  # Main chat component ⚠️ CRITICAL
│   │   ├── code-block.tsx        # Code block rendering
│   │   ├── file-confirmation-dialog.tsx
│   │   ├── message-list.tsx      # Message list rendering
│   │   ├── message-renderer.tsx  # Markdown message renderer
│   │   ├── message.tsx           # Individual message component
│   │   ├── SearchSources.tsx     # Search results display
│   │   └── welcome-screen.tsx    # Empty state
│   ├── editor/                    # Code editor components
│   │   ├── editor-container.tsx  # Editor wrapper
│   │   ├── monaco-editor.tsx     # Monaco editor component
│   │   └── split-view.tsx        # 50/50 split layout ⚠️ KEY COMPONENT
│   ├── layout/                    # Layout components
│   │   ├── app-layout.tsx        # Main app layout
│   │   ├── chat-panel.tsx
│   │   ├── files-panel.tsx
│   │   ├── header.tsx            # Top header bar
│   │   └── sidebar.tsx           # Left sidebar
│   ├── providers/                 # Context providers
│   │   ├── conditional-clerk-provider.tsx
│   │   └── toast-provider.tsx
│   └── ui/                        # Reusable UI components
│       ├── chat-message.tsx
│       ├── error-boundary.tsx
│       ├── loading-skeleton.tsx
│       ├── processing-indicator.tsx
│       ├── skeleton.tsx
│       └── status-badge.tsx
│
├── contexts/                      # React contexts
│   └── editor-context.tsx        # Editor state management
│
├── hooks/                         # Custom React hooks
│   ├── use-agent-status.ts       # Agent connection status
│   └── use-keyboard-shortcuts.ts # Keyboard shortcuts handler
│
├── lib/                           # Utility libraries
│   ├── db/                        # Database utilities
│   │   ├── agent-credentials.ts  # Agent credential CRUD
│   │   └── client.ts             # PostgreSQL connection pool
│   ├── redis/                     # Redis utilities
│   │   ├── client.ts              # Redis connection management
│   │   ├── connection-registry.ts # Agent registry
│   │   └── tool-call.ts           # Tool call pub/sub ⚠️ KEY FILE
│   ├── search/                    # Search integration
│   │   ├── braveSearch.ts         # Brave Search API client
│   │   └── detectSearchIntent.ts  # Search intent detection
│   ├── gemini-client.ts           # Gemini AI client factory
│   ├── gemini-config.ts           # Gemini model configuration
│   ├── gemini-tools.ts            # Tool definitions for LLM ⚠️ KEY FILE
│   ├── rate-limiter.ts            # Rate limiting utility
│   ├── storage.ts                 # localStorage utilities
│   ├── types.ts                   # TypeScript type definitions
│   └── utils.ts                   # General utilities (cn, etc.)
│
├── local-agent/                   # Local agent service (separate)
│   ├── src/                       # TypeScript source
│   │   ├── tools/                 # Tool implementations
│   │   ├── websocket-client.ts    # WS client to server
│   │   └── index.ts               # Main entry
│   └── dist/                      # Compiled JavaScript
│
├── websocket-server/              # WebSocket server (separate)
│   ├── src/                       # TypeScript source
│   │   ├── connection-manager.ts  # WS connection handling
│   │   ├── db/                    # Database utilities
│   │   └── redis/                 # Redis utilities
│   └── dist/                      # Compiled JavaScript
│
├── database/                      # Database schema
│   └── schema.sql                 # PostgreSQL schema
│
└── Configuration Files
    ├── package.json               # Dependencies
    ├── tsconfig.json              # TypeScript config
    ├── next.config.js             # Next.js config
    ├── tailwind.config.ts         # Tailwind config
    ├── postcss.config.js          # PostCSS config
    └── middleware.ts              # Next.js middleware (Clerk)
```

---

## 3. Current Features Matrix

| Feature | Status | File Location | Dependencies |
|---------|--------|---------------|--------------|
| **Chat Interface** | ✅ Complete | `components/chat/enhanced-chat-interface.tsx` | React, Framer Motion |
| **LLM Integration** | ✅ Complete | `app/api/chat/route.ts` | @google/generative-ai |
| **Streaming Responses** | ✅ Complete | `app/api/chat/route.ts` | ReadableStream, SSE |
| **Function Calling** | ✅ Complete | `lib/gemini-tools.ts` | Gemini API |
| **Tool Execution** | ✅ Complete | `lib/redis/tool-call.ts` | Redis pub/sub |
| **Web Search** | ✅ Complete | `lib/search/braveSearch.ts` | Brave Search API |
| **Monaco Editor** | ✅ Complete | `components/editor/monaco-editor.tsx` | @monaco-editor/react |
| **Split View Layout** | ✅ Complete | `components/editor/split-view.tsx` | React Context |
| **File Management** | ✅ Complete | `contexts/editor-context.tsx` | React Context |
| **Authentication** | ✅ Complete | `components/auth/*` | @clerk/nextjs |
| **Conversation Persistence** | ✅ Complete | `lib/storage.ts` | localStorage |
| **Agent Status** | ✅ Complete | `hooks/use-agent-status.ts` | Redis |
| **Message Rendering** | ✅ Complete | `components/chat/message-renderer.tsx` | react-markdown |
| **Code Highlighting** | ✅ Complete | `components/chat/code-block.tsx` | react-syntax-highlighter |
| **Search Results Display** | ✅ Complete | `components/chat/SearchSources.tsx` | React |
| **Scroll Positioning** | ✅ Complete | `components/chat/enhanced-chat-interface.tsx` | React refs, useLayoutEffect |
| **Rate Limiting** | ✅ Complete | `lib/rate-limiter.ts` | In-memory cache |
| **Error Handling** | ✅ Complete | `components/ui/error-boundary.tsx` | React Error Boundary |
| **Toast Notifications** | ✅ Complete | `components/providers/toast-provider.tsx` | Sonner |
| **Dark Theme** | ✅ Complete | `tailwind.config.ts` | next-themes |
| **Keyboard Shortcuts** | ✅ Complete | `hooks/use-keyboard-shortcuts.ts` | React hooks |
| **Tauri Integration** | ❌ **NOT IMPLEMENTED** | N/A | N/A |

---

## 4. Key Files to Review

### Critical Files (Must Understand)

1. **`components/chat/enhanced-chat-interface.tsx`** (973 lines)
   - Main chat component with complex scroll positioning logic
   - Handles message streaming, tool calls, search results
   - ⚠️ CRITICAL: Scroll positioning system (see SCROLL_POSITIONING_LOGIC.md)

2. **`app/api/chat/route.ts`** (308 lines)
   - Main chat API endpoint
   - Handles streaming, function calling, search integration
   - Tool execution via Redis pub/sub

3. **`lib/gemini-tools.ts`** (411 lines)
   - Tool definitions for LLM function calling
   - Maps to local agent tool implementations
   - **Where to add new tools**

4. **`lib/redis/tool-call.ts`** (104 lines)
   - Tool call pub/sub system
   - Request/response pattern via Redis channels
   - **How tools communicate with agent**

5. **`components/editor/split-view.tsx`** (177 lines)
   - 50/50 split layout implementation
   - Chat left, Monaco editor right
   - **Where browser would integrate**

6. **`contexts/editor-context.tsx`** (60 lines)
   - Editor state management
   - Open files, active file tracking
   - **State management pattern to follow**

### Important Supporting Files

7. **`lib/gemini-client.ts`** - Gemini client factory
8. **`lib/gemini-config.ts`** - LLM configuration & system prompt
9. **`lib/storage.ts`** - Conversation persistence
10. **`lib/types.ts`** - TypeScript type definitions
11. **`components/chat/message-renderer.tsx`** - Markdown rendering
12. **`components/chat/SearchSources.tsx`** - Search results UI
13. **`lib/search/braveSearch.ts`** - Search API integration
14. **`app/layout.tsx`** - Root layout with providers
15. **`components/layout/app-layout.tsx`** - Main app layout

---

## 5. Data Flow Diagrams

### User Message Flow: Input → LLM → Response Display

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Types Message                                           │
│    components/chat/chat-input.tsx                               │
│    ↓ onSubmit                                                    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleSendMessage()                                          │
│    components/chat/enhanced-chat-interface.tsx                 │
│    - Creates user Message object                                │
│    - Updates messages state                                     │
│    - Builds editorContext (open files, active file)            │
│    - Calls /api/chat                                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. POST /api/chat                                                │
│    app/api/chat/route.ts                                        │
│    - Authenticates user (Clerk)                                 │
│    - Rate limiting check                                        │
│    - Checks agent connection status                             │
│    - Detects search intent                                       │
│    - Enhances message with editor context                       │
│    - Adds search results if needed                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Gemini API Call                                              │
│    lib/gemini-client.ts                                         │
│    - Creates chat with history                                  │
│    - Streams response via sendMessageStream()                  │
│    - Processes function calls if any                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Function Call Handling (if needed)                           │
│    app/api/chat/route.ts (lines 156-249)                        │
│    - Detects function calls in stream                           │
│    - Sends tool_call event to client                            │
│    - Calls sendToolCall() → Redis pub/sub                       │
│    - Waits for tool_result                                      │
│    - Sends result back to Gemini                                │
│    - Continues streaming                                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Streaming Response                                            │
│    ReadableStream → SSE                                          │
│    - Sends search_results event (if any)                        │
│    - Sends tool_call events                                     │
│    - Sends content chunks                                        │
│    - Sends [DONE] when complete                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Client Processing                                            │
│    components/chat/enhanced-chat-interface.tsx                  │
│    - Reads SSE stream                                            │
│    - Updates streamingContent state                             │
│    - Updates currentToolCall state                              │
│    - Updates currentSearchResults state                          │
│    - Scrolls to bottom during streaming                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Message Completion                                           │
│    components/chat/enhanced-chat-interface.tsx                  │
│    - Creates assistant Message object                           │
│    - Adds to messages array                                     │
│    - Saves conversation to localStorage                          │
│    - Clears streaming state                                     │
│    - Final scroll positioning                                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Message Rendering                                           │
│    components/chat/message-renderer.tsx                         │
│    - Renders markdown with react-markdown                       │
│    - Highlights code blocks                                     │
│    - Renders search sources (if any)                            │
│    - Shows tool call indicators                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Execution Flow: LLM → Agent → Result

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LLM Requests Tool                                            │
│    Gemini API detects function call                            │
│    Example: read_file({ path: "/home/user/file.txt" })         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. API Processes Function Call                                  │
│    app/api/chat/route.ts                                        │
│    - Extracts function call from stream                         │
│    - Sends tool_call event to client                           │
│    - Calls sendToolCall(userId, { tool, params })              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Redis Pub/Sub                                                │
│    lib/redis/tool-call.ts                                       │
│    - Generates requestId (nanoid)                               │
│    - Subscribes to response channel                             │
│    - Publishes to agent:${userId}:commands                      │
│    - Sets 60s timeout                                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. WebSocket Server Receives                                    │
│    websocket-server/src/connection-manager.ts                   │
│    - Receives tool_call message                                 │
│    - Looks up agent connection                                  │
│    - Forwards to agent via WebSocket                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Local Agent Executes                                         │
│    local-agent/src/tools/file-operations.ts                     │
│    - Validates permissions                                       │
│    - Executes file operation                                     │
│    - Returns result                                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Agent Sends Response                                         │
│    local-agent/src/websocket-client.ts                           │
│    - Publishes to response:${requestId} channel                 │
│    - Includes success/error status                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. API Receives Response                                        │
│    lib/redis/tool-call.ts                                       │
│    - Receives on subscribed channel                             │
│    - Parses JSON response                                       │
│    - Resolves Promise                                           │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. API Sends to LLM                                             │
│    app/api/chat/route.ts                                        │
│    - Formats as functionResponse                                │
│    - Sends to Gemini via sendMessageStream()                    │
│    - LLM continues generating response                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Client Receives Result                                       │
│    components/chat/enhanced-chat-interface.tsx                  │
│    - Receives tool_result event                                 │
│    - Updates UI (clears tool call indicator)                    │
│    - Syncs editor if write_file executed                        │
└─────────────────────────────────────────────────────────────────┘
```

### File Operations Flow (if implemented)

```
┌─────────────────────────────────────────────────────────────────┐
│ User Opens File                                                  │
│ components/layout/files-panel.tsx (or similar)                   │
│ - Calls window.__operaStudioOpenFile(path)                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Split View Handles                                               │
│ components/editor/split-view.tsx                                │
│ - Checks if file already open                                   │
│ - Calls onFileRead(path) if provided                            │
│ - Adds to openFiles array                                        │
│ - Sets as active file                                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Editor Context Updates                                           │
│ contexts/editor-context.tsx                                     │
│ - Updates openFiles state                                       │
│ - Updates activeFileIndex                                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Monaco Editor Renders                                            │
│ components/editor/monaco-editor.tsx                             │
│ - Receives file content                                          │
│ - Auto-detects language                                          │
│ - Renders with syntax highlighting                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ User Edits File                                                  │
│ components/editor/monaco-editor.tsx                             │
│ - onChange callback fires                                        │
│ - Updates file content in context                               │
│ - Marks file as isDirty                                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ User Saves (Ctrl+S)                                              │
│ components/editor/monaco-editor.tsx                             │
│ - onSave callback fires                                          │
│ - Calls onFileSave(path, content)                               │
│ - Marks file as clean (isDirty = false)                         │
└─────────────────────────────────────────────────────────────────┘
```

### State Updates Propagation

```
┌─────────────────────────────────────────────────────────────────┐
│ State Management Pattern                                         │
│                                                                  │
│ 1. Component State (useState)                                    │
│    - Local UI state (messages, isLoading, etc.)                  │
│    - No global state management library                          │
│                                                                  │
│ 2. React Context                                                 │
│    - EditorContext: File management                              │
│    - ConditionalClerkProvider: Auth state                        │
│                                                                  │
│ 3. localStorage                                                  │
│    - Conversation persistence                                    │
│    - User-scoped (per userId)                                   │
│                                                                  │
│ 4. Server State                                                  │
│    - Redis: Agent connections, tool calls                        │
│    - PostgreSQL: Agent credentials                               │
│                                                                  │
│ 5. Cross-Component Communication                                 │
│    - Custom events (window.dispatchEvent)                        │
│    - Global functions (window.__operaStudio*)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Integration Points for New Features

### Where Mini Browser Feature Would Integrate

#### 1. **UI Component Location**
```
components/
└── browser/                          # NEW DIRECTORY
    ├── browser-view.tsx              # Main browser component
    ├── browser-toolbar.tsx           # URL bar, navigation controls
    └── browser-tabs.tsx             # Tab management (optional)
```

**Integration Point:** `components/editor/split-view.tsx`
- Currently: Chat (50%) + Monaco Editor (50%)
- New: Chat (33%) + Browser (33%) + Monaco Editor (33%) OR
- New: Chat (50%) + Browser/Editor Tabs (50%)

#### 2. **State Management**
**Pattern to Follow:** `contexts/editor-context.tsx`

Create: `contexts/browser-context.tsx`
```typescript
interface BrowserContextType {
  openTabs: BrowserTab[];
  activeTabIndex: number;
  setOpenTabs: React.Dispatch<React.SetStateAction<BrowserTab[]>>;
  setActiveTabIndex: React.Dispatch<React.SetStateAction<number>>;
}
```

#### 3. **API/IPC Communication Layer**

**Option A: Tauri IPC (Recommended)**
- Create: `lib/tauri/browser.ts`
- Pattern: Similar to `lib/redis/tool-call.ts` (request/response)
- Commands:
  - `navigate(url: string)`
  - `getContent()`
  - `executeScript(script: string)`
  - `screenshot()`

**Option B: API Route (If Tauri not available)**
- Create: `app/api/browser/navigate/route.ts`
- Proxy requests through Next.js API

#### 4. **Tool Integration**

Add to `lib/gemini-tools.ts`:
```typescript
{
  name: "navigate_browser",
  description: "Navigate to a URL in the headless browser",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to" },
      wait_for: { type: "string", description: "Wait for selector or event" }
    },
    required: ["url"]
  }
}
```

#### 5. **Chat System Integration**

**Display Browser Content:**
- Add new message type: `browser_snapshot`
- Render in `components/chat/message-renderer.tsx`
- Show screenshot or HTML content

**Browser Actions in Chat:**
- User can ask: "Navigate to example.com and show me the page"
- LLM calls `navigate_browser` tool
- Browser component updates
- Screenshot/content sent back to LLM
- LLM describes page content

#### 6. **Split View Integration**

Modify `components/editor/split-view.tsx`:
```typescript
interface SplitViewProps {
  chatComponent: React.ReactNode;
  browserComponent?: React.ReactNode;  // NEW
  editorComponent?: React.ReactNode;   // Rename from onFileRead/onFileSave
  layout?: 'chat-editor' | 'chat-browser' | 'chat-browser-editor';
}
```

---

## 7. Existing Patterns to Follow

### How to Add a New Tool

**Step 1:** Define tool in `lib/gemini-tools.ts`
```typescript
{
  name: "my_new_tool",
  description: "What the tool does",
  parameters: {
    type: "object",
    properties: {
      param1: { type: "string", description: "..." }
    },
    required: ["param1"]
  }
}
```

**Step 2:** Implement tool in `local-agent/src/tools/`
```typescript
// local-agent/src/tools/my-tool.ts
export async function myNewTool(params: { param1: string }) {
  // Implementation
  return { success: true, result: "..." };
}
```

**Step 3:** Register in `local-agent/src/tools/index.ts`
```typescript
import { myNewTool } from './my-tool';

export const tools = {
  my_new_tool: myNewTool,
  // ... other tools
};
```

**Step 4:** Tool automatically available to LLM when agent connected

### How to Add a New UI Component

**Pattern:** Follow `components/chat/message-renderer.tsx`

1. Create component file: `components/browser/browser-view.tsx`
2. Use TypeScript with proper types
3. Use Tailwind classes (see `tailwind.config.ts` for theme)
4. Handle loading/error states
5. Use Framer Motion for animations (if needed)
6. Export as named export

**Example Structure:**
```typescript
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BrowserViewProps {
  url: string;
  onNavigate?: (url: string) => void;
}

export function BrowserView({ url, onNavigate }: BrowserViewProps) {
  // Component implementation
}
```

### How to Add IPC Commands (Tauri)

**Pattern:** Similar to Redis tool calls

1. Create Tauri command in Rust backend
2. Create TypeScript wrapper: `lib/tauri/browser.ts`
```typescript
import { invoke } from '@tauri-apps/api/tauri';

export async function navigateBrowser(url: string) {
  return invoke('navigate_browser', { url });
}

export async function getBrowserContent() {
  return invoke('get_browser_content');
}
```

3. Use in components:
```typescript
import { navigateBrowser } from '@/lib/tauri/browser';

const handleNavigate = async () => {
  const result = await navigateBrowser('https://example.com');
  // Handle result
};
```

### Error Handling Pattern

**API Routes:** `app/api/chat/route.ts` (lines 278-291)
```typescript
try {
  // ... logic
} catch (error: any) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({
      error: error?.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

**Components:** `components/ui/error-boundary.tsx`
```typescript
// React Error Boundary for component errors
```

**Toast Notifications:** `components/chat/enhanced-chat-interface.tsx`
```typescript
import { toast } from "sonner";

toast.error("Failed to send message");
toast.success("Message sent");
toast.info("Request cancelled");
```

---

## 8. Dependencies & Setup

### How to Run Locally

```bash
# 1. Install dependencies
npm install
# OR
pnpm install

# 2. Setup environment variables
# Create .env.local (see below)

# 3. Start infrastructure (if needed)
docker-compose up -d  # PostgreSQL + Redis

# 4. Run database migrations
psql postgresql://postgres:devpassword@localhost:5433/operastudio \
  < database/schema.sql

# 5. Start development server
npm run dev
# OR
pnpm dev

# 6. (Optional) Start WebSocket server
cd websocket-server && pnpm dev

# 7. (Optional) Start local agent
cd local-agent && pnpm dev
```

### Required Environment Variables

**`.env.local` (not committed, create from template):**
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Brave Search (optional)
BRAVE_API_KEY=your_brave_api_key

# Database (if using)
DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/operastudio

# Redis (if using)
REDIS_URL=redis://localhost:6380

# WebSocket Server (if using)
WS_SERVER_URL=ws://localhost:8082
```

### Build Scripts

```bash
# Development
npm run dev          # Start Next.js dev server (port 3000)

# Production
npm run build        # Build Next.js app
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

### Project Structure Commands

```bash
# Type checking
npx tsc --noEmit

# Build all services
cd websocket-server && pnpm build
cd ../local-agent && pnpm build
cd .. && pnpm build
```

---

## 9. Specific Questions Answered

### 1. Is there already any Tauri/Electron code in this project?

**Answer:** ❌ **NO**

- No Tauri configuration files (`tauri.conf.json` not found)
- No Electron code
- No desktop app framework integration
- **This would be a NEW integration**

### 2. How is the 50/50 split view currently implemented?

**Answer:** See `components/editor/split-view.tsx`

**Implementation:**
- Uses CSS flexbox: `flex h-full`
- Left side (Chat): `w-1/2` when files open, `w-full` when no files
- Right side (Editor): `w-1/2` when files open, hidden otherwise
- Transition: `transition-all duration-300 ease-in-out`
- Border separator: `border-l border-border`

**Key Code:**
```typescript
<div className="flex h-full overflow-hidden">
  {/* Chat - 50% */}
  <div className={cn(
    "transition-all duration-300 ease-in-out overflow-hidden",
    hasOpenFiles ? "w-1/2" : "w-full"
  )}>
    {chatComponent}
  </div>

  {/* Editor - 50% */}
  {hasOpenFiles && (
    <div className="w-1/2 flex flex-col border-l border-border overflow-hidden">
      {/* Tabs + Monaco Editor */}
    </div>
  )}
</div>
```

### 3. How are external tools (like web search) currently integrated?

**Answer:** See `lib/search/braveSearch.ts` and `app/api/chat/route.ts`

**Flow:**
1. **Search Intent Detection:** `lib/search/detectSearchIntent.ts`
   - Analyzes user message
   - Determines if search needed
   - Returns boolean + cleaned query

2. **Search Execution:** `lib/search/braveSearch.ts`
   - Calls Brave Search API
   - Formats results
   - Returns structured data

3. **LLM Integration:** `app/api/chat/route.ts` (lines 104-135)
   - Adds search results to message context
   - Formats for LLM consumption
   - LLM uses results in response

4. **UI Display:** `components/chat/SearchSources.tsx`
   - Renders search results below message
   - Clickable source links
   - Citation highlighting

**Pattern to Follow for Browser:**
- Similar detection: "navigate to X", "show me X website"
- Execute browser navigation
- Capture content/screenshot
- Add to LLM context
- Display in UI

### 4. What's the current authentication/API key management system?

**Answer:** Clerk + Environment Variables

**Authentication:**
- **Clerk** handles user authentication
- Protected routes via `middleware.ts`
- User ID available via `useUser()` hook
- User-scoped data storage (localStorage per userId)

**API Keys:**
- Stored in environment variables (`.env.local`)
- `GEMINI_API_KEY` - Gemini AI
- `BRAVE_API_KEY` - Brave Search
- `CLERK_SECRET_KEY` - Clerk backend
- No user-specific API key storage (all users share keys)

**Agent Credentials:**
- Stored in PostgreSQL (`database/schema.sql`)
- Per-user agent credentials
- Shared secret for agent authentication
- Generated via `/api/agent/install`

### 5. How are long-running operations handled (streaming, progress updates)?

**Answer:** Server-Sent Events (SSE) + State Updates

**Streaming:**
- Uses `ReadableStream` API
- Sends SSE events: `data: {JSON}\n\n`
- Client reads via `response.body.getReader()`
- Updates `streamingContent` state incrementally

**Progress Updates:**
- Tool calls: `type: 'tool_call'` event
- Tool results: `type: 'tool_result'` event
- Errors: `type: 'tool_error'` event
- Search results: `type: 'search_results'` event

**UI Feedback:**
- `ProcessingIndicator` component during loading
- `currentToolCall` state shows active tool
- Streaming content updates in real-time
- Scroll position maintained during streaming

**Pattern for Browser:**
- Similar SSE events for navigation progress
- `type: 'browser_navigating'` event
- `type: 'browser_content'` event
- `type: 'browser_screenshot'` event

### 6. Is there existing WebSocket infrastructure?

**Answer:** ✅ **YES, but separate service**

**WebSocket Server:**
- Location: `websocket-server/` directory
- Purpose: Connects local agents to cloud
- Port: 8082 (configurable)
- Protocol: WebSocket (not SSE)

**Not Used For:**
- Chat streaming (uses SSE/HTTP)
- Browser communication (not implemented)

**Could Be Used For:**
- Real-time browser updates (if needed)
- Bi-directional communication with Tauri app

**Current Pattern:**
- Chat: HTTP + SSE (one-way server → client)
- Tools: Redis pub/sub (request/response)
- Agent: WebSocket (bi-directional)

### 7. How is chat history persisted?

**Answer:** localStorage (client-side)

**Implementation:** `lib/storage.ts`

**Storage:**
- Key format: `operastudio_conversations_${userId}`
- Stores array of `Conversation` objects
- Max 50 conversations per user
- JSON serialization

**Conversation Structure:**
```typescript
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Operations:**
- `getConversations(userId)` - Get all conversations
- `saveConversation(conversation, userId)` - Save/update
- `deleteConversation(id, userId)` - Delete one
- `getConversation(id, userId)` - Get single conversation

**Limitations:**
- Client-side only (not synced to server)
- Limited by browser storage (~5-10MB)
- Lost if localStorage cleared
- No cross-device sync

**Future Consideration:**
- Could move to PostgreSQL for persistence
- Could add sync via API

---

## 10. Code Examples

### How to Add a New Message to Chat

```typescript
// In components/chat/enhanced-chat-interface.tsx

const userMessage: Message = {
  id: `msg_${Date.now()}`,
  role: "user",
  content: "Hello, world!",
  timestamp: new Date(),
};

setMessages(prev => [...prev, userMessage]);
```

### How to Call the LLM with Context

```typescript
// In app/api/chat/route.ts

const { messages, editorContext, searchMode } = await req.json();

// Build enhanced message with context
let enhancedMessage = lastMessage.content;

if (editorContext?.activeFile) {
  enhancedMessage = `${lastMessage.content}\n\n---EDITOR CONTEXT---\nCurrently viewing: ${editorContext.activeFile.path}\n\n\`\`\`\n${editorContext.activeFile.content}\n\`\`\`\n`;
}

// Start chat with history
const chat = model.startChat({ history: cleanedHistory });

// Stream response
const result = await chat.sendMessageStream(enhancedMessage);
```

### How to Render a Custom Message Type

```typescript
// In components/chat/message-renderer.tsx

// Add new message type
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'browser';  // NEW
  content: string;
  browserData?: {                          // NEW
    url: string;
    screenshot?: string;
    html?: string;
  };
}

// Render in component
{message.role === 'browser' && message.browserData && (
  <div className="browser-message">
    <img src={message.browserData.screenshot} alt={message.browserData.url} />
    <p>Navigated to: {message.browserData.url}</p>
  </div>
)}
```

### How to Add a New UI Component to Split View

```typescript
// Modify components/editor/split-view.tsx

interface SplitViewProps {
  chatComponent: React.ReactNode;
  browserComponent?: React.ReactNode;  // NEW
  editorComponent?: React.ReactNode;
  layout?: 'chat-editor' | 'chat-browser' | 'chat-browser-editor';
}

export function SplitView({ 
  chatComponent, 
  browserComponent,
  editorComponent,
  layout = 'chat-editor' 
}: SplitViewProps) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat - Always visible */}
      <div className={cn(
        layout === 'chat-editor' ? 'w-1/2' : 'w-1/3'
      )}>
        {chatComponent}
      </div>

      {/* Browser - Conditional */}
      {layout.includes('browser') && browserComponent && (
        <div className={cn(
          layout === 'chat-browser-editor' ? 'w-1/3' : 'w-1/2',
          'border-l border-border'
        )}>
          {browserComponent}
        </div>
      )}

      {/* Editor - Conditional */}
      {layout.includes('editor') && editorComponent && (
        <div className={cn(
          layout === 'chat-browser-editor' ? 'w-1/3' : 'w-1/2',
          'border-l border-border'
        )}>
          {editorComponent}
        </div>
      )}
    </div>
  );
}
```

### How to Handle Errors

```typescript
// API Route Error Handling
try {
  // ... logic
} catch (error: any) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({
      error: error?.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

// Component Error Handling
try {
  const result = await someAsyncOperation();
} catch (error: any) {
  console.error("Error:", error);
  toast.error(error.message || "Operation failed");
  // Update UI state to show error
  setError(error.message);
}

// Error Boundary (for React errors)
<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

---

## 11. Integration Recommendations for Mini Browser

### Architecture Decision: Tauri vs. API Proxy

**Option A: Tauri IPC (Recommended for Desktop)**
- Direct browser control from Rust backend
- Better performance
- No network overhead
- Requires Tauri setup

**Option B: API Proxy (If Tauri not available)**
- Browser runs in Next.js API route
- Uses Puppeteer/Playwright server-side
- More complex, requires server resources

### Suggested Implementation Steps

1. **Phase 1: Tauri Setup**
   - Add Tauri dependencies
   - Create `src-tauri/` directory
   - Implement Rust commands for browser control

2. **Phase 2: TypeScript Wrapper**
   - Create `lib/tauri/browser.ts`
   - Wrap Tauri commands
   - Add error handling

3. **Phase 3: Browser Component**
   - Create `components/browser/browser-view.tsx`
   - Implement UI (toolbar, viewport)
   - Connect to Tauri commands

4. **Phase 4: Tool Integration**
   - Add `navigate_browser` tool to `lib/gemini-tools.ts`
   - Update chat API to handle browser tool calls
   - Display browser content in chat

5. **Phase 5: Split View Integration**
   - Modify `split-view.tsx` to support browser
   - Add layout options
   - Handle tab switching

6. **Phase 6: State Management**
   - Create `contexts/browser-context.tsx`
   - Manage browser tabs/history
   - Persist browser state

### Key Integration Points Summary

| Component | File | Integration Method |
|-----------|------|-------------------|
| **Browser UI** | `components/browser/browser-view.tsx` | New component |
| **Split Layout** | `components/editor/split-view.tsx` | Modify props + layout logic |
| **Tool Definition** | `lib/gemini-tools.ts` | Add new tool object |
| **Tool Execution** | `app/api/chat/route.ts` | Add browser tool handler |
| **State Management** | `contexts/browser-context.tsx` | New context (follow editor-context pattern) |
| **Tauri Commands** | `lib/tauri/browser.ts` | New wrapper file |
| **Message Rendering** | `components/chat/message-renderer.tsx` | Add browser message type |

---

## 12. Critical Notes & Warnings

### ⚠️ Scroll Positioning Logic

**DO NOT MODIFY** scroll positioning code in `enhanced-chat-interface.tsx` without reading:
- `SCROLL_POSITIONING_LOGIC.md` (if exists)
- Critical sections marked with `⚠️ CRITICAL` comments
- Test all scenarios before changing

### State Management Pattern

- **No global state library** (Zustand/Redux)
- Uses React Context + local state
- Follow existing patterns in `editor-context.tsx`

### Authentication Required

- All API routes require Clerk authentication
- User ID available via `await auth()` in API routes
- User ID available via `useUser()` hook in components

### Tool Execution Flow

- Tools execute on **local agent** (not server)
- Requires agent connection via WebSocket
- Tools communicate via Redis pub/sub
- 60-second timeout per tool call

### File System Access

- File operations require **local agent** connection
- No direct file system access from browser
- All file ops go through agent → WebSocket → Redis → API

---

## Conclusion

This codebase is a **production-ready Next.js application** with:
- ✅ Complete chat interface with streaming
- ✅ LLM integration (Gemini) with function calling
- ✅ Tool execution system (via local agent)
- ✅ Monaco editor integration
- ✅ Split view layout
- ✅ Authentication (Clerk)
- ✅ Search integration (Brave)
- ❌ **No Tauri integration** (needs to be added)

The architecture is well-structured and follows React/Next.js best practices. Adding a mini browser feature would follow existing patterns for:
- Tool integration
- UI components
- State management
- Split view layout

**Next Steps:**
1. Set up Tauri project structure
2. Implement browser control commands in Rust
3. Create TypeScript wrapper layer
4. Build browser UI component
5. Integrate into split view
6. Add browser tool to LLM
7. Test end-to-end flow

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27

