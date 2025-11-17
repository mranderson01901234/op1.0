# Opera Studio - Web Browser Integration Architecture

**Status:** Production-Ready Web Application
**Last Updated:** 2025-11-17
**Architecture:** Pure Web-Based (No Desktop/Electron Dependencies)

---

## 🎯 Overview

Opera Studio is a **web-based AI coding assistant** that integrates browser capabilities directly into the chat interface. This document describes the browser integration strategy for the **web application only** - all desktop/Electron builds have been deprecated.

---

## 🏗️ Current Architecture

### Tech Stack

**Frontend (Client-Side)**
- Next.js 14.2.33 (App Router)
- React 18.3.1 + TypeScript 5.6.3
- Tailwind CSS 3.4.11
- Monaco Editor (Code editing)
- Framer Motion (Animations)
- Clerk (Authentication)

**Backend (Server-Side)**
- Next.js API Routes
- Google Gemini API (LLM)
- Redis (Pub/Sub messaging)
- PostgreSQL (Database)
- Brave Search API (Web search)

**Browser Integration Options**
- Option A: WebViewer Component (iframe-based, implemented)
- Option B: CheerpX (WASM-based browser, not implemented)
- Option C: Puppeteer-based Screenshots (server-side, not implemented)

---

## 📂 Current Component Structure

```
op1.0/
├── app/
│   ├── page.tsx                    # Main page with chat interface
│   ├── layout.tsx                  # Root layout with providers
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── chat/route.ts          # Main chat API endpoint
│       ├── agent/                 # Agent management
│       ├── files/                 # File operations
│       └── tools/                 # Tool execution
│
├── components/
│   ├── chat/                      # Chat interface
│   │   ├── enhanced-chat-interface.tsx
│   │   ├── message-renderer.tsx
│   │   ├── chat-input.tsx
│   │   ├── SearchResponse.tsx     # Web search UI
│   │   ├── SearchTabs.tsx
│   │   └── SourceCard.tsx
│   │
│   ├── editor/                    # Code editor & viewers
│   │   ├── split-view.tsx         # Main split layout
│   │   ├── monaco-editor.tsx      # Code editor
│   │   └── web-viewer.tsx         # Web content viewer ✅
│   │
│   ├── layout/                    # App layout
│   │   ├── app-layout.tsx
│   │   ├── chat-panel.tsx
│   │   ├── files-panel.tsx
│   │   └── header.tsx
│   │
│   └── auth/                      # Authentication
│       ├── auth-buttons.tsx
│       └── auth-modal.tsx
│
├── lib/
│   ├── gemini-client.ts           # Gemini API integration
│   ├── gemini-tools.ts            # Tool definitions (27 tools)
│   ├── types.ts                   # TypeScript types
│   ├── storage.ts                 # Database operations
│   └── search/                    # Web search integration
│       ├── brave-search.ts
│       └── search-types.ts
│
└── contexts/
    └── editor-context.tsx         # Editor state management
```

---

## 🌐 Web Browser Integration: Current Implementation

### WebViewer Component (✅ Implemented)

**Location:** `components/editor/web-viewer.tsx`

**Functionality:**
- Displays web content in an iframe
- Opens URLs in the split-view editor panel
- Responsive and styled with glassmorphism

**Usage:**
```typescript
<WebViewer url="https://example.com" title="Example Site" />
```

**How It Works:**
1. User clicks a search result link
2. Link calls `window.__operaStudioOpenFile()` with URL
3. EditorContext creates a new tab with type 'url'
4. WebViewer renders the URL in an iframe

**Current Flow:**
```
SearchResponse Component
  → SourceCard (clickable)
    → window.__operaStudioOpenFile(url)
      → EditorContext.openTabs
        → SplitView renders WebViewer
          → iframe displays website
```

---

## 🎨 UI/UX Integration

### Split-View Layout

**Current Behavior:**
- Left side: Chat interface (50% width when split)
- Right side: Editor/Viewer (50% width when split)
- Smooth transitions (300ms)
- Glassmorphism styling with orange accents

**Tab System:**
- File tabs: Show Monaco editor
- URL tabs: Show WebViewer (iframe)
- Tabs have close buttons, dirty state indicators
- Active tab highlighted with orange accent

### Search Integration

**Components:**
- `SearchResponse.tsx` - Main search results display
- `SearchTabs.tsx` - All/Web/News/Videos tabs
- `SourceCard.tsx` - Clickable search result cards
- `VideoCards.tsx` - Video search results
- `RelatedQuestions.tsx` - Follow-up suggestions

**User Flow:**
1. User asks a question
2. Gemini triggers web search (Brave API)
3. SearchResponse component displays results
4. User clicks a source card
5. WebViewer opens in split-view
6. User can browse while chatting

---

## 🔧 Tool Definitions (Gemini)

**Location:** `lib/gemini-tools.ts`

**Currently Implemented (27 Tools):**

**File Operations (8):**
- read_file, write_file, delete_file
- move_file, copy_file, get_file_info
- search_files, search_content

**Directory Operations (4):**
- list_directory, create_directory
- delete_directory, get_directory_size

**System Operations (5):**
- execute_command, get_system_info
- get_process_list, get_environment_variables
- get_current_directory

**System Health (5):**
- get_system_health, get_cpu_usage
- get_memory_usage, get_disk_space
- get_network_info

**Development Tools (5):**
- run_npm_command, git_status
- git_diff, install_package

**Web Search (Integrated via Brave API):**
- Automatic web search detection
- No explicit tool call needed
- Results displayed in SearchResponse component

---

## 🚀 Proposed Enhancements

### Option 1: Enhanced WebViewer (Recommended)

**What to Add:**
- URL bar for navigation
- Back/forward buttons
- Refresh button
- New tab button
- Screenshot capture (via proxy service)
- Basic browser controls

**Effort:** Low (2-3 hours)
**Value:** High - Better UX without external dependencies

### Option 2: CheerpX Integration

**What It Is:**
- WASM-based x86 virtualization
- Runs actual Chromium in the browser
- Full browser experience in web app

**Pros:**
- Real browser, not iframe
- Full JS execution
- No CORS issues

**Cons:**
- ~40MB download (chromium-disk.ext2)
- 2-4 second initial load
- Complex setup
- Memory intensive (~200MB)

**Effort:** High (1-2 days)
**Value:** Medium - Cool but heavy

### Option 3: Server-Side Screenshots

**What It Is:**
- Puppeteer on server
- Take screenshots on demand
- Return as base64 images

**Pros:**
- No CORS issues
- Can interact with any site
- Lightweight for client

**Cons:**
- Server resource intensive
- No real-time interaction
- Latency for each action

**Effort:** Medium (4-6 hours)
**Value:** Medium - Good for specific use cases

---

## 🎯 Recommended Implementation Plan

### Phase 1: Enhance Current WebViewer (2-3 hours)

**File:** `components/editor/web-viewer.tsx`

**Add Features:**
```typescript
interface WebViewerProps {
  url: string;
  title: string;
  onNavigate?: (newUrl: string) => void;
}

// Add UI controls:
- URL bar (editable)
- Back/forward buttons (using iframe history API)
- Refresh button
- Open in new tab button
- Loading indicator
```

**Benefits:**
- Improves existing functionality
- No new dependencies
- Works in all browsers
- Low maintenance

### Phase 2: Add Screenshot Tool (Optional, 4-6 hours)

**New API Route:** `app/api/screenshot/route.ts`

```typescript
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  const { url } = await request.json();

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  const screenshot = await page.screenshot({ encoding: 'base64' });
  await browser.close();

  return Response.json({ screenshot });
}
```

**New Gemini Tool:**
```typescript
{
  name: "screenshot_website",
  description: "Capture a screenshot of any website",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to screenshot"
      }
    }
  }
}
```

### Phase 3: Gemini Browser Control (Optional, 6-8 hours)

**New Tools:**
- `navigate_browser` - Change URL in WebViewer
- `click_element` - Simulate click (via postMessage)
- `fill_form` - Fill input fields
- `extract_content` - Get text/HTML from iframe

**Implementation:**
- Use iframe postMessage API
- Add event listeners in WebViewer
- Handle cross-origin limitations

---

## 📋 Implementation Checklist

### Immediate Tasks (Next Session)

- [ ] Update `web-viewer.tsx` with URL bar
- [ ] Add navigation controls (back/forward/refresh)
- [ ] Add "Open in new tab" button
- [ ] Add loading state indicator
- [ ] Test with various websites
- [ ] Handle CORS errors gracefully

### Optional Enhancements

- [ ] Add screenshot API route
- [ ] Add screenshot Gemini tool
- [ ] Implement browser control tools
- [ ] Add browser history tracking
- [ ] Add bookmark functionality
- [ ] Add multiple browser tabs

### Testing

- [ ] Test iframe navigation
- [ ] Test CORS handling
- [ ] Test mobile responsiveness
- [ ] Test with different websites
- [ ] Test performance with multiple tabs
- [ ] Test memory usage

---

## 🔒 Security Considerations

### iframe Security

**Current Setup:**
```html
<iframe
  src={url}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  className="w-full h-full border-0"
/>
```

**Recommendations:**
- Keep restrictive sandbox attributes
- Add CSP headers for iframe content
- Validate URLs before loading
- Implement URL blocklist (phishing, malware)
- Rate limit iframe loads

### Server-Side Screenshots

**If Implementing:**
- Rate limit per user (prevent abuse)
- Validate URLs (block internal IPs)
- Set timeout limits (30s max)
- Run Puppeteer in container/sandbox
- Monitor resource usage

---

## 🌟 Best Practices

### Performance

- Lazy load WebViewer component
- Limit number of open tabs (max 10)
- Implement tab unloading for inactive tabs
- Cache screenshots (if implementing)

### UX

- Show loading indicators
- Handle errors gracefully
- Provide fallback for blocked iframes
- Add "Open in new window" option
- Remember last viewed URL per session

### Accessibility

- Add keyboard shortcuts (Cmd+T for new tab)
- Support tab navigation
- Proper ARIA labels
- Focus management

---

## 🚫 What NOT to Do

### ❌ Deprecated/Obsolete Approaches

1. **Electron Browser Agent** - Desktop app, not web-based
2. **Tauri Browser Agent** - Desktop app, not web-based
3. **Local Puppeteer Agent** - Requires desktop install
4. **CheerpX** - Heavy, slow initial load (unless specific need)

### ❌ Anti-Patterns to Avoid

- Loading too many iframes simultaneously
- Unrestricted iframe sandbox permissions
- No CORS error handling
- Synchronous screenshot generation
- Unlimited browser tabs

---

## 📊 Success Metrics

### User Experience
- Time to open URL < 500ms
- Smooth transitions (60fps)
- No jank during navigation
- Clear error messages

### Performance
- Memory usage < 100MB per tab
- CPU usage < 10% idle
- Page load time < 3s average

### Reliability
- 99.9% uptime for iframe viewer
- Graceful degradation on CORS errors
- No crashes from malformed URLs

---

## 🎓 Resources

### Documentation
- [Next.js iframe docs](https://nextjs.org/docs/app/building-your-application/routing)
- [iframe sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

### Current Implementation Files
- `components/editor/web-viewer.tsx` - WebViewer component
- `components/editor/split-view.tsx` - Layout management
- `contexts/editor-context.tsx` - State management
- `components/chat/SearchResponse.tsx` - Search integration

---

## 🏁 Conclusion

The current **web-based architecture** is clean, modern, and extensible. The WebViewer component provides basic browser functionality that can be enhanced incrementally.

**Recommended Next Steps:**
1. Enhance WebViewer with navigation controls (2-3 hours)
2. Test thoroughly with real-world usage
3. Consider screenshot API if needed (optional)
4. Monitor performance and iterate

**Avoid:**
- Desktop/Electron builds (deprecated)
- Heavy WASM solutions unless justified
- Over-engineering the browser experience

Focus on **incremental improvements** to the existing iframe-based solution rather than wholesale replacements.
