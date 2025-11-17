# Browser Agent Integration Guide

This guide explains how to integrate the Electron browser agent with your OperaStudio web app.

## Overview

The integration enables your LLM to control a headless browser running on the user's local machine for fast web automation.

## Architecture

```
User's Machine                          Your Backend
┌─────────────────┐                    ┌──────────────────┐
│ Electron App    │◄──────WebSocket────┤  Next.js App     │
│ + Headless      │    (port 8082)     │  + WebSocket     │
│   Chrome        │                    │    Server        │
└─────────────────┘                    └──────────────────┘
                                               │
                                               ▼
                                       ┌──────────────────┐
                                       │   Gemini API     │
                                       │  (with browser   │
                                       │     tools)       │
                                       └──────────────────┘
```

## Step 1: Add Browser Tools to Gemini

Create or update `lib/gemini-tools.ts`:

```typescript
export const tools = [
  {
    functionDeclarations: [
      // ... your existing tools ...

      // BROWSER AUTOMATION TOOLS
      {
        name: "navigate_browser",
        description: "Navigate to a URL in the headless browser running on the user's machine. This opens the page and automatically extracts its content. Use this when the user asks to visit a website, view a page, or browse to a URL. The browser runs locally on the user's computer for fast performance.",
        parameters: {
          type: "object" as const,
          properties: {
            url: {
              type: "string" as const,
              description: "The URL to navigate to (must include http:// or https://). Examples: 'https://example.com', 'https://github.com/user/repo'"
            }
          },
          required: ["url"]
        }
      },
      {
        name: "get_browser_content",
        description: "Get the HTML and text content of the currently loaded page in the browser. Use this to read or analyze the page after navigation. Returns both raw HTML and extracted text content.",
        parameters: {
          type: "object" as const,
          properties: {}
        }
      },
      {
        name: "screenshot_browser",
        description: "Take a screenshot of the current browser page and return it as a base64-encoded PNG image. Use this when the user wants to see what a page looks like visually. The screenshot captures the viewport (1920x1080) of the current page.",
        parameters: {
          type: "object" as const,
          properties: {}
        }
      },
      {
        name: "execute_browser_script",
        description: "Execute JavaScript code in the context of the currently loaded browser page. Use this for advanced interactions like clicking buttons, filling forms, extracting specific data, or manipulating the DOM. The script runs with full access to the page's JavaScript environment.",
        parameters: {
          type: "object" as const,
          properties: {
            script: {
              type: "string" as const,
              description: "JavaScript code to execute. Can access DOM, return values, and use modern JS features. Examples: 'document.querySelector(\"h1\").textContent', 'document.querySelectorAll(\"a\").length'"
            }
          },
          required: ["script"]
        }
      },
      {
        name: "close_browser_tab",
        description: "Close the currently active browser tab/page. Use this to clean up after browsing or when switching to a different page. The browser instance remains active for future navigation.",
        parameters: {
          type: "object" as const,
          properties: {}
        }
      }
    ]
  }
];
```

## Step 2: Update Chat API to Handle Browser Tools

In `app/api/chat/route.ts`, add browser tool handling:

```typescript
import { navigateBrowser, getBrowserContent, getBrowserScreenshot, executeBrowserScript, closeBrowserTab } from "@/lib/browser/browser-client";

// Inside your function call handling loop (around line 156-249):

// BROWSER: Navigate
if (call.name === 'navigate_browser') {
  const { url } = call.args as { url: string };

  encoder.enqueue(
    `data: ${JSON.stringify({
      type: 'tool_call',
      tool: 'navigate_browser',
      args: { url }
    })}\n\n`
  );

  try {
    const result = await navigateBrowser(userId, url);

    if (result.success) {
      // Send navigation success
      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'browser_navigate',
          url: result.url,
          title: result.title
        })}\n\n`
      );

      // Auto-fetch content after navigation
      const content = await getBrowserContent(userId);

      const toolResponse = {
        name: call.name,
        response: {
          success: true,
          url: result.url,
          title: result.title,
          text_content: content.text.substring(0, 10000) // Limit to 10k chars for LLM
        }
      };

      functionResponses.push(toolResponse);

      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'tool_result',
          tool: 'navigate_browser',
          result: toolResponse.response
        })}\n\n`
      );
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    encoder.enqueue(
      `data: ${JSON.stringify({
        type: 'tool_error',
        tool: 'navigate_browser',
        error: error.message
      })}\n\n`
    );
  }
}

// BROWSER: Get Content
if (call.name === 'get_browser_content') {
  encoder.enqueue(
    `data: ${JSON.stringify({
      type: 'tool_call',
      tool: 'get_browser_content',
      args: {}
    })}\n\n`
  );

  try {
    const result = await getBrowserContent(userId);

    if (result.success) {
      const toolResponse = {
        name: call.name,
        response: {
          success: true,
          url: result.url,
          html_length: result.html.length,
          text_content: result.text.substring(0, 10000) // Limit for LLM
        }
      };

      functionResponses.push(toolResponse);

      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'tool_result',
          tool: 'get_browser_content',
          result: toolResponse.response
        })}\n\n`
      );
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    encoder.enqueue(
      `data: ${JSON.stringify({
        type: 'tool_error',
        tool: 'get_browser_content',
        error: error.message
      })}\n\n`
    );
  }
}

// BROWSER: Screenshot
if (call.name === 'screenshot_browser') {
  encoder.enqueue(
    `data: ${JSON.stringify({
      type: 'tool_call',
      tool: 'screenshot_browser',
      args: {}
    })}\n\n`
  );

  try {
    const result = await getBrowserScreenshot(userId);

    if (result.success) {
      // Send screenshot to frontend
      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'browser_screenshot',
          screenshot: result.screenshot
        })}\n\n`
      );

      const toolResponse = {
        name: call.name,
        response: {
          success: true,
          message: "Screenshot captured successfully"
        }
      };

      functionResponses.push(toolResponse);

      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'tool_result',
          tool: 'screenshot_browser',
          result: toolResponse.response
        })}\n\n`
      );
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    encoder.enqueue(
      `data: ${JSON.stringify({
        type: 'tool_error',
        tool: 'screenshot_browser',
        error: error.message
      })}\n\n`
    );
  }
}

// BROWSER: Execute Script
if (call.name === 'execute_browser_script') {
  const { script } = call.args as { script: string };

  encoder.enqueue(
    `data: ${JSON.stringify({
      type: 'tool_call',
      tool: 'execute_browser_script',
      args: { script }
    })}\n\n`
  );

  try {
    const result = await executeBrowserScript(userId, script);

    if (result.success) {
      const toolResponse = {
        name: call.name,
        response: {
          success: true,
          result: result.result
        }
      };

      functionResponses.push(toolResponse);

      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'tool_result',
          tool: 'execute_browser_script',
          result: toolResponse.response
        })}\n\n`
      );
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    encoder.enqueue(
      `data: ${JSON.stringify({
        type: 'tool_error',
        tool: 'execute_browser_script',
        error: error.message
      })}\n\n`
    );
  }
}

// BROWSER: Close Tab
if (call.name === 'close_browser_tab') {
  encoder.enqueue(
    `data: ${JSON.stringify({
      type: 'tool_call',
      tool: 'close_browser_tab',
      args: {}
    })}\n\n`
  );

  try {
    const result = await closeBrowserTab(userId);

    if (result.success) {
      const toolResponse = {
        name: call.name,
        response: {
          success: true,
          message: "Browser tab closed"
        }
      };

      functionResponses.push(toolResponse);

      encoder.enqueue(
        `data: ${JSON.stringify({
          type: 'tool_result',
          tool: 'close_browser_tab',
          result: toolResponse.response
        })}\n\n`
      );
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    encoder.enqueue(
      `data: ${JSON.stringify({
        type: 'tool_error',
        tool: 'close_browser_tab',
        error: error.message
      })}\n\n`
    );
  }
}
```

## Step 3: Add Browser View Component

Create `components/browser/browser-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import Image from "next/image";

interface BrowserViewProps {
  url?: string;
  screenshot?: string;
  title?: string;
  onClose?: () => void;
}

export function BrowserView({
  url,
  screenshot,
  title,
  onClose
}: BrowserViewProps) {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-background">
        <div className="text-center">
          <p className="text-sm">No page loaded</p>
          <p className="text-xs mt-2">Browser features available when agent is running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Close browser view"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Screenshot */}
      <div className="flex-1 overflow-auto p-4">
        {screenshot ? (
          <div className="relative w-full">
            <Image
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser screenshot"
              width={1920}
              height={1080}
              className="w-full h-auto border rounded-lg shadow-lg"
              priority
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Page loaded - use screenshot tool to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 4: Update Chat Interface

In `components/chat/enhanced-chat-interface.tsx`:

```typescript
import { BrowserView } from "@/components/browser/browser-view";

// Add browser state
const [browserState, setBrowserState] = useState<{
  url?: string;
  title?: string;
  screenshot?: string;
}>({});

// In handleSendMessage, handle browser events from SSE stream:
if (event.type === 'browser_navigate') {
  setBrowserState(prev => ({
    ...prev,
    url: event.url,
    title: event.title
  }));
}

if (event.type === 'browser_screenshot') {
  setBrowserState(prev => ({
    ...prev,
    screenshot: event.screenshot
  }));
}

// In your JSX, add browser view panel:
<div className="flex h-full">
  {/* Chat panel */}
  <div className={browserState.url ? "w-1/2" : "w-full"}>
    {/* Your existing chat UI */}
  </div>

  {/* Browser panel */}
  {browserState.url && (
    <div className="w-1/2">
      <BrowserView
        url={browserState.url}
        title={browserState.title}
        screenshot={browserState.screenshot}
        onClose={() => setBrowserState({})}
      />
    </div>
  )}
</div>
```

## Step 5: WebSocket Server Updates

Your WebSocket server needs to route browser commands. In `websocket-server/src/connection-manager.ts`:

```typescript
// When receiving browser_response from Electron app, forward to web app
handleMessage(connectionId: string, message: any) {
  if (message.type === 'browser_response') {
    const userId = this.connections.get(connectionId)?.userId;
    if (!userId) return;

    // Find web app connection for this user
    const webAppConnection = this.findWebAppConnection(userId);
    if (webAppConnection) {
      webAppConnection.send(JSON.stringify(message));
    }
  }

  // When web app sends browser command, forward to Electron app
  if (message.type?.startsWith('browser_')) {
    const userId = this.connections.get(connectionId)?.userId;
    if (!userId) return;

    // Find browser agent connection for this user
    const browserAgent = this.findBrowserAgent(userId);
    if (browserAgent) {
      browserAgent.send(JSON.stringify(message));
    } else {
      // Send error back
      const webAppConnection = this.connections.get(connectionId);
      webAppConnection?.send(JSON.stringify({
        type: 'browser_error',
        error: 'Browser agent not connected. Please install the browser agent.'
      }));
    }
  }
}

private findBrowserAgent(userId: string): WebSocket | null {
  for (const [connId, conn] of this.connections) {
    if (conn.userId === userId && conn.clientType === 'browser_agent') {
      return conn.socket;
    }
  }
  return null;
}

private findWebAppConnection(userId: string): WebSocket | null {
  for (const [connId, conn] of this.connections) {
    if (conn.userId === userId && conn.clientType === 'web_app') {
      return conn.socket;
    }
  }
  return null;
}
```

## Step 6: Silent Installer Component

Create `components/browser/enable-browser-button.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnableBrowserButton() {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'installed'>('idle');

  const handleEnable = () => {
    setStatus('downloading');

    const platform = navigator.platform.toLowerCase();
    let downloadUrl;

    if (platform.includes('win')) {
      downloadUrl = '/downloads/operastudio-browser-windows.exe';
    } else if (platform.includes('mac')) {
      downloadUrl = '/downloads/operastudio-browser-macos.dmg';
    } else {
      downloadUrl = '/downloads/operastudio-browser-linux.AppImage';
    }

    // Trigger download
    window.location.href = downloadUrl;

    // Show install instructions
    setTimeout(() => {
      alert('Browser agent downloaded! Please run the installer to enable browser features.');
    }, 2000);
  };

  if (status === 'installed') {
    return (
      <Button disabled variant="outline" size="sm">
        <Check className="w-4 h-4 mr-2" />
        Browser Enabled
      </Button>
    );
  }

  if (status === 'downloading') {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Downloading...
      </Button>
    );
  }

  return (
    <Button onClick={handleEnable} variant="default" size="sm">
      <Download className="w-4 h-4 mr-2" />
      Enable Browser (50MB)
    </Button>
  );
}
```

## Testing

### 1. Start all services:

```bash
# Terminal 1: WebSocket server
cd websocket-server && pnpm dev

# Terminal 2: Next.js web app
pnpm dev

# Terminal 3: Electron browser agent
cd electron-browser && npm run dev
```

### 2. Test browser navigation:

In your web app chat, type:
```
Navigate to https://example.com and tell me what you see
```

The LLM should:
1. Call `navigate_browser` tool
2. Browser agent navigates to URL
3. Content is extracted automatically
4. LLM summarizes the page

### 3. Test screenshot:

```
Take a screenshot of the current page
```

The screenshot should appear in the browser view panel.

## Deployment Checklist

- [ ] Build Electron app for all platforms (Windows, macOS, Linux)
- [ ] Get code signing certificates
- [ ] Host installers on CDN or GitHub Releases
- [ ] Add auto-update mechanism
- [ ] Create installation instructions/video
- [ ] Test silent install flow
- [ ] Monitor browser agent connection status
- [ ] Add browser agent health check API endpoint

## Next Steps

1. **Test locally** with the steps above
2. **Build production** Electron apps with code signing
3. **Deploy installers** to CDN
4. **Add UI indicators** for browser agent status
5. **Implement auto-install** trigger on first login
6. **Monitor adoption** and iterate on UX

You now have a complete Electron-based browser agent ready to integrate with your OperaStudio web app!
