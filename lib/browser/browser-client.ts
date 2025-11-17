import { nanoid } from "nanoid";

export interface BrowserNavigateParams {
  url: string;
}

export interface BrowserNavigateResponse {
  success: boolean;
  url: string;
  title: string;
  error?: string;
}

export interface BrowserContentResponse {
  success: boolean;
  html: string;
  text: string;
  url: string;
  error?: string;
}

export interface BrowserScreenshotResponse {
  success: boolean;
  screenshot: string; // base64
  error?: string;
}

export interface BrowserScriptResponse {
  success: boolean;
  result: any;
  error?: string;
}

const BROWSER_COMMAND_TIMEOUT = 30000; // 30 seconds

// Simple in-memory promise store (in production, use Redis pub/sub)
const pendingCommands = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

// WebSocket connection (will be established via middleware or API route)
let wsConnection: WebSocket | null = null;

export function setBrowserWebSocket(ws: WebSocket) {
  wsConnection = ws;

  // Handle incoming messages
  ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'browser_response' && message.request_id) {
        const pending = pendingCommands.get(message.request_id);

        if (pending) {
          clearTimeout(pending.timeout);
          pendingCommands.delete(message.request_id);

          if (message.success) {
            pending.resolve(message);
          } else {
            pending.reject(new Error(message.error || 'Browser command failed'));
          }
        }
      }
    } catch (error) {
      console.error('[Browser Client] Message parse error:', error);
    }
  });
}

async function sendBrowserCommand<T = any>(
  userId: string,
  command: {
    type: 'navigate' | 'get_content' | 'screenshot' | 'execute_script' | 'close_tab';
    [key: string]: any;
  }
): Promise<T> {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected. Is the browser agent running?');
  }

  const requestId = nanoid();

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCommands.delete(requestId);
      reject(new Error('Browser command timeout'));
    }, BROWSER_COMMAND_TIMEOUT);

    pendingCommands.set(requestId, { resolve, reject, timeout });

    // Send command via WebSocket
    wsConnection!.send(JSON.stringify({
      ...command,
      request_id: requestId,
      userId
    }));
  });
}

// Convenience functions
export async function navigateBrowser(userId: string, url: string): Promise<BrowserNavigateResponse> {
  return sendBrowserCommand<BrowserNavigateResponse>(userId, {
    type: 'navigate',
    url
  });
}

export async function getBrowserContent(userId: string): Promise<BrowserContentResponse> {
  return sendBrowserCommand<BrowserContentResponse>(userId, {
    type: 'get_content'
  });
}

export async function getBrowserScreenshot(userId: string): Promise<BrowserScreenshotResponse> {
  return sendBrowserCommand<BrowserScreenshotResponse>(userId, {
    type: 'screenshot'
  });
}

export async function executeBrowserScript(userId: string, script: string): Promise<BrowserScriptResponse> {
  return sendBrowserCommand<BrowserScriptResponse>(userId, {
    type: 'execute_script',
    script
  });
}

export async function closeBrowserTab(userId: string): Promise<{ success: boolean }> {
  return sendBrowserCommand(userId, {
    type: 'close_tab'
  });
}

// Check if browser agent is connected
export function isBrowserAgentConnected(): boolean {
  return wsConnection !== null && wsConnection.readyState === WebSocket.OPEN;
}
