# Opera Studio - Optimal Browser Architecture

**Vision:** Production-grade, AI-controlled browser integration with zero iframe limitations
**Target:** Enterprise-ready, scalable, real browser automation
**Timeline:** 2-3 weeks for full implementation

---

## 🎯 The Optimal Solution: Hybrid Browser Cloud Architecture

Since iframe limitations are blocking you, here's the **best-in-class solution** used by companies like Perplexity, Browse AI, and Browserless:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Opera Studio Web App                     │
│  (Next.js + React + Gemini AI)                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ WebSocket + REST API
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Browser Control Service                         │
│  (Node.js + Puppeteer/Playwright + Redis)                   │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Session   │  │  Session   │  │  Session   │           │
│  │  Manager   │  │   Pool     │  │   Proxy    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Chrome DevTools Protocol
                   │
┌──────────────────▼──────────────────────────────────────────┐
│           Browser Instance Pool (Docker)                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Chrome 1 │  │ Chrome 2 │  │ Chrome 3 │  │ Chrome N │   │
│  │ (User A) │  │ (User B) │  │ (User C) │  │ (Pool)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ Screenshot/Video Stream
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Real-Time Streaming Layer                       │
│  (WebRTC or Canvas Streaming)                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
              User's Browser
```

---

## 🔧 Tech Stack (Production-Grade)

### Browser Automation Engine
**Playwright** (not Puppeteer) - Industry standard
- Multi-browser support (Chromium, Firefox, WebKit)
- Better API, more reliable
- Built-in video recording
- Network interception
- Auto-wait for elements
- Parallel execution

### Browser Instance Management
**Docker + Browserless.io approach**
- Isolated browser containers
- Auto-scaling based on demand
- Session persistence
- Resource limits per instance
- Health monitoring

### Real-Time Communication
**WebSocket (Socket.io) + WebRTC**
- Bi-directional communication
- Real-time browser events
- Screen streaming (60fps)
- Low latency (<100ms)

### Session Management
**Redis + PostgreSQL**
- Session state in Redis (fast)
- History/logs in PostgreSQL (persistent)
- Multi-user support
- Session sharing/collaboration

### Streaming Technology
**Option A: WebRTC** (Best for real-time)
- Peer-to-peer video streaming
- Ultra-low latency
- High frame rate (60fps)
- Interactive in real-time

**Option B: Canvas Streaming** (Best for control)
- Server captures screenshots (10fps+)
- Sends via WebSocket
- Client renders on canvas
- Full Gemini AI control

---

## 🏗️ Implementation Plan

### Phase 1: Browser Control Service (Week 1)

**New Microservice: `browser-service/`**

```
browser-service/
├── src/
│   ├── server.ts              # Main server (Express + Socket.io)
│   ├── browser-manager.ts     # Playwright instance pool
│   ├── session-manager.ts     # User session handling
│   ├── streaming/
│   │   ├── webrtc-streamer.ts # WebRTC streaming
│   │   └── canvas-streamer.ts # Canvas streaming
│   ├── ai-controller.ts       # Gemini AI browser control
│   └── types.ts
├── docker/
│   └── Dockerfile            # Browser container config
├── package.json
└── tsconfig.json
```

**Core Dependencies:**
```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "ioredis": "^5.3.0",
    "pg": "^8.11.0",
    "sharp": "^0.33.0",        // Fast image processing
    "node-webrtc": "^0.4.7",   // WebRTC streaming
    "winston": "^3.11.0"       // Logging
  }
}
```

### Phase 2: Browser Instance Pool (Week 1)

**Docker Setup:**

```dockerfile
# Dockerfile for browser instances
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Security hardening
RUN groupadd -r pwuser && useradd -r -g pwuser -G audio,video pwuser
USER pwuser

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  browser-service:
    build: ./browser-service
    ports:
      - "3100:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/opera
      - MAX_CONCURRENT_SESSIONS=50
      - SESSION_TIMEOUT=300000
    volumes:
      - ./browser-data:/app/data
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
      replicas: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

### Phase 3: AI-Controlled Browser (Week 2)

**Gemini Integration:**

```typescript
// browser-service/src/ai-controller.ts

export class AIBrowserController {
  private page: Page;
  private gemini: GeminiClient;

  async executeAICommand(command: AICommand) {
    switch (command.action) {
      case 'navigate':
        await this.navigate(command.url);
        break;

      case 'click':
        const element = await this.findElementByAI(command.description);
        await element.click();
        break;

      case 'fill_form':
        await this.fillFormByAI(command.formData);
        break;

      case 'extract_data':
        const data = await this.extractDataByAI(command.schema);
        return data;

      case 'scroll':
        await this.smartScroll(command.direction);
        break;

      case 'wait_for':
        await this.waitForCondition(command.condition);
        break;
    }
  }

  async findElementByAI(description: string): Promise<Locator> {
    // Use Gemini vision to identify elements
    const screenshot = await this.page.screenshot({ encoding: 'base64' });

    const prompt = `
      Given this screenshot, find the element that matches: "${description}"
      Return the CSS selector or XPath.
    `;

    const result = await this.gemini.analyze(screenshot, prompt);
    return this.page.locator(result.selector);
  }

  async extractDataByAI(schema: any): Promise<any> {
    // AI-powered data extraction
    const html = await this.page.content();

    const prompt = `
      Extract data from this HTML according to the schema:
      ${JSON.stringify(schema)}

      HTML:
      ${html}
    `;

    const data = await this.gemini.extract(prompt);
    return data;
  }
}
```

**New Gemini Tools:**

```typescript
// lib/gemini-tools.ts - ADD THESE TOOLS

export const browserTools = [
  {
    name: "browser_navigate",
    description: "Navigate browser to a URL with full JavaScript execution",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        wait_until: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle"],
          default: "networkidle"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "browser_click",
    description: "Click an element on the page using AI vision to find it",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Natural language description of element to click (e.g., 'the blue Login button', 'the search icon in the header')"
        }
      },
      required: ["description"]
    }
  },
  {
    name: "browser_extract_data",
    description: "Extract structured data from current page using AI",
    parameters: {
      type: "object",
      properties: {
        schema: {
          type: "object",
          description: "JSON schema of data to extract"
        }
      },
      required: ["schema"]
    }
  },
  {
    name: "browser_fill_form",
    description: "Fill out a form on the page",
    parameters: {
      type: "object",
      properties: {
        fields: {
          type: "object",
          description: "Key-value pairs of field labels and values"
        }
      },
      required: ["fields"]
    }
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of current page or specific element",
    parameters: {
      type: "object",
      properties: {
        full_page: { type: "boolean", default: false },
        element_description: { type: "string" }
      }
    }
  },
  {
    name: "browser_execute_script",
    description: "Execute JavaScript in the browser context",
    parameters: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" }
      },
      required: ["script"]
    }
  },
  {
    name: "browser_get_content",
    description: "Get text content, HTML, or specific data from page",
    parameters: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["text", "html", "markdown"],
          default: "text"
        }
      }
    }
  }
];
```

### Phase 4: Real-Time Streaming (Week 2)

**WebRTC Streaming:**

```typescript
// browser-service/src/streaming/webrtc-streamer.ts

import { RTCPeerConnection, RTCVideoSource, nonstandard } from 'node-webrtc';

export class WebRTCStreamer {
  private peerConnection: RTCPeerConnection;
  private videoSource: RTCVideoSource;

  async startStream(page: Page, socket: Socket) {
    // Create video source
    this.videoSource = new nonstandard.RTCVideoSource();
    const track = this.videoSource.createTrack();

    // Setup peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.addTrack(track);

    // Capture browser screenshots and send to video stream
    const captureInterval = setInterval(async () => {
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80
      });

      const frame = this.convertToVideoFrame(screenshot);
      this.videoSource.onFrame(frame);
    }, 16); // ~60fps

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    return this.peerConnection;
  }
}
```

**Canvas Streaming (Simpler, more control):**

```typescript
// browser-service/src/streaming/canvas-streamer.ts

export class CanvasStreamer {
  private streamInterval: NodeJS.Timeout;

  async startStream(page: Page, socket: Socket, fps: number = 30) {
    const interval = 1000 / fps;

    this.streamInterval = setInterval(async () => {
      try {
        // Capture screenshot
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 75,
          encoding: 'base64'
        });

        // Send to client
        socket.emit('browser-frame', {
          frame: screenshot,
          timestamp: Date.now(),
          viewport: await page.viewportSize()
        });
      } catch (error) {
        console.error('Streaming error:', error);
      }
    }, interval);
  }

  stopStream() {
    clearInterval(this.streamInterval);
  }
}
```

### Phase 5: Frontend Integration (Week 3)

**New Component: `components/browser/browser-canvas.tsx`**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface BrowserCanvasProps {
  sessionId: string;
  onReady?: () => void;
}

export function BrowserCanvas({ sessionId, onReady }: BrowserCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Connect to browser service
    const newSocket = io('http://localhost:3100', {
      query: { sessionId }
    });

    newSocket.on('connect', () => {
      console.log('Connected to browser service');
      newSocket.emit('start-session', { sessionId });
    });

    newSocket.on('browser-frame', (data: { frame: string, viewport: any }) => {
      renderFrame(data.frame, data.viewport);
    });

    newSocket.on('session-ready', () => {
      setIsStreaming(true);
      onReady?.();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const renderFrame = (frameData: string, viewport: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = `data:image/jpeg;base64,${frameData}`;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !socket) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Send click to browser service
    socket.emit('browser-click', {
      x: x / canvas.width,  // Normalized coordinates
      y: y / canvas.height
    });
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent) => {
    if (!socket) return;

    socket.emit('browser-keypress', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey
    });
  };

  return (
    <div className="relative h-full w-full bg-slate-950">
      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Initializing browser...</p>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onKeyDown={handleCanvasKeyDown}
        tabIndex={0}
      />
    </div>
  );
}
```

**Integration with Chat:**

```typescript
// components/browser/browser-panel.tsx

'use client';

import { useState } from 'react';
import { BrowserCanvas } from './browser-canvas';
import { Globe, X, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

export function BrowserPanel({ onClose }: { onClose: () => void }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [url, setUrl] = useState('https://google.com');
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Browser Controls */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/30 backdrop-blur-md border-b border-slate-800/50">
        <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </button>
        <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
        <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <Globe className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none"
            placeholder="Enter URL..."
          />
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
        </button>
      </div>

      {/* Browser Canvas */}
      <div className="flex-1 overflow-hidden">
        <BrowserCanvas
          sessionId={sessionId}
          onReady={() => setIsReady(true)}
        />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-900/30 backdrop-blur-md border-t border-slate-800/50 text-xs text-slate-500">
        {isReady ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Ready • AI-Controlled Browser
          </span>
        ) : (
          'Connecting...'
        )}
      </div>
    </div>
  );
}
```

---

## 🚀 Advanced Features

### 1. Multi-Tab Support

```typescript
// Session can manage multiple browser tabs
const session = await browserService.createSession(userId);
const tab1 = await session.newTab('https://google.com');
const tab2 = await session.newTab('https://github.com');

// AI can work across tabs
await gemini.execute("Compare the search results from both tabs");
```

### 2. Session Recording & Replay

```typescript
// Record all browser interactions
await browserService.startRecording(sessionId);

// Later: Replay for debugging or demo
await browserService.replay(recordingId);
```

### 3. Collaborative Browsing

```typescript
// Multiple users share the same browser session
await browserService.shareSession(sessionId, [user1Id, user2Id]);

// All users see the same screen, can take turns controlling
```

### 4. AI-Powered Automation Workflows

```typescript
const workflow = {
  name: "Research Product Pricing",
  steps: [
    { action: "navigate", url: "https://amazon.com" },
    { action: "fill_form", fields: { search: "wireless headphones" } },
    { action: "click", description: "search button" },
    { action: "extract_data", schema: productSchema },
    { action: "navigate", url: "https://bestbuy.com" },
    { action: "fill_form", fields: { search: "wireless headphones" } },
    { action: "extract_data", schema: productSchema },
    { action: "compare_results" }
  ]
};

await gemini.executeWorkflow(workflow);
```

---

## 📊 Scaling Strategy

### Horizontal Scaling

```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: browser-service
spec:
  replicas: 10  # Auto-scale 10-100 based on load
  template:
    spec:
      containers:
      - name: browser
        image: opera-studio/browser-service:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
```

### Load Balancing

- **Sticky Sessions:** Route user to same browser instance
- **Session Migration:** Move session to different instance if needed
- **Health Checks:** Auto-restart unhealthy containers

### Cost Optimization

- **Warm Pool:** Keep 5-10 browsers ready (instant start)
- **Auto-Shutdown:** Close idle sessions after 5 minutes
- **Resource Limits:** Max 2GB RAM per browser instance
- **Spot Instances:** Use AWS spot instances for cost savings

---

## 💰 Cost Estimation

### Infrastructure Costs (AWS)

**Small Scale (100 concurrent users):**
- EC2: 5x t3.large = $365/month
- Redis: ElastiCache = $50/month
- RDS PostgreSQL: db.t3.medium = $70/month
- **Total: ~$500/month**

**Medium Scale (1,000 concurrent users):**
- ECS Fargate: 50 containers = $2,000/month
- Redis: ElastiCache (cluster) = $200/month
- RDS PostgreSQL: db.r5.large = $350/month
- **Total: ~$2,500/month**

**Large Scale (10,000 concurrent users):**
- EKS + EC2 Auto-Scaling = $8,000/month
- Redis Cluster = $800/month
- RDS Multi-AZ = $1,200/month
- **Total: ~$10,000/month**

---

## ⚡ Performance Targets

### Response Times
- Session creation: < 2s
- First frame: < 500ms
- Frame rate: 30fps (canvas) or 60fps (WebRTC)
- Click-to-action: < 200ms
- AI command execution: < 3s average

### Resource Usage
- CPU per session: 0.5-1.0 cores
- Memory per session: 1-2GB
- Network bandwidth: 5-10 Mbps per stream

### Reliability
- Uptime: 99.9%
- Session recovery: < 5s
- Auto-reconnect: < 3 retries

---

## 🎓 Inspiration & References

**Similar Production Systems:**
- **Browserless.io** - Browser automation as a service
- **Perplexity Pro** - AI-powered web browsing
- **Browse.ai** - No-code web scraping
- **Playwright** - Microsoft's browser automation
- **Puppeteer** - Google's Chrome automation

**Best Practices Borrowed From:**
- Vercel's infrastructure scaling
- Linear's real-time collaboration
- Figma's canvas rendering
- Loom's video streaming

---

## 🏁 Implementation Timeline

### Week 1: Browser Service Core
- [ ] Setup browser-service microservice
- [ ] Implement Playwright browser pool
- [ ] Build session manager
- [ ] Add Redis caching
- [ ] Create Docker containers

### Week 2: AI Integration
- [ ] Add Gemini browser tools
- [ ] Implement AI element detection
- [ ] Build data extraction
- [ ] Add screenshot analysis
- [ ] Create workflow engine

### Week 3: Streaming & Frontend
- [ ] Canvas streaming implementation
- [ ] BrowserCanvas component
- [ ] BrowserPanel UI
- [ ] Mouse/keyboard forwarding
- [ ] Session management UI

### Week 4: Polish & Deploy
- [ ] Load testing
- [ ] Error handling
- [ ] Monitoring/logging
- [ ] Documentation
- [ ] Production deployment

---

## 🎯 Success Metrics

### User Experience
- Can browse any website without iframe limitations ✅
- AI can control browser automatically ✅
- Real-time interaction (< 200ms latency) ✅
- 60fps smooth streaming ✅

### Technical
- Handle 1,000+ concurrent sessions ✅
- 99.9% uptime ✅
- Auto-scaling based on demand ✅
- Session persistence across crashes ✅

### Business
- Production-ready for enterprise customers ✅
- Competitive with Perplexity Pro ✅
- Scalable to millions of users ✅
- Cost-effective infrastructure ✅

---

## 🚀 This Is The Optimal Solution

No shortcuts. No minimal implementations. This is production-grade browser automation that:

1. **Eliminates iframe limitations** - Real browser, full control
2. **Enables true AI automation** - Gemini can do anything a human can
3. **Scales to enterprise** - Handle thousands of concurrent users
4. **Provides amazing UX** - Real-time, smooth, responsive
5. **Future-proof architecture** - Built on industry standards

Ready to build this? Let's start with Week 1.
