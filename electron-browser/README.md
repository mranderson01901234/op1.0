# OperaStudio Browser Agent - Electron Edition

A headless browser agent that runs on the user's local machine and connects to your web app via WebSocket for fast, local browser automation.

## Quick Start

### 1. Install Dependencies

```bash
cd electron-browser
npm install
```

### 2. Run in Development

```bash
# Set environment variables
export WS_URL="ws://localhost:8082"
export USER_ID="your-user-id"

# Start the app
npm run dev
```

The app will:
- Start in the system tray (no visible window)
- Initialize headless Chrome
- Connect to WebSocket server at `ws://localhost:8082`
- Listen for browser commands from your web app

### 3. Build for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

Output will be in `dist/` directory.

## Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   Web App       │◄──────────────────────────►│  Electron App    │
│ (Next.js)       │    Browser Commands         │  (This folder)   │
└─────────────────┘                             └──────────────────┘
                                                         │
                                                         ▼
                                                 ┌──────────────────┐
                                                 │  Headless Chrome │
                                                 │   (Puppeteer)    │
                                                 └──────────────────┘
```

## WebSocket Protocol

### Authentication (Client → Server)

```json
{
  "type": "auth",
  "userId": "user_123",
  "clientType": "browser_agent"
}
```

### Browser Commands (Server → Client)

#### Navigate
```json
{
  "type": "navigate",
  "request_id": "req_abc123",
  "url": "https://example.com"
}
```

#### Get Content
```json
{
  "type": "get_content",
  "request_id": "req_abc124"
}
```

#### Screenshot
```json
{
  "type": "screenshot",
  "request_id": "req_abc125"
}
```

#### Execute Script
```json
{
  "type": "execute_script",
  "request_id": "req_abc126",
  "script": "document.title"
}
```

#### Close Tab
```json
{
  "type": "close_tab",
  "request_id": "req_abc127"
}
```

### Browser Responses (Client → Server)

```json
{
  "type": "browser_response",
  "request_id": "req_abc123",
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "screenshot": "base64_encoded_image..."
}
```

## File Structure

```
electron-browser/
├── src/
│   ├── main.js              # Electron main process
│   ├── browser-manager.js   # Puppeteer browser controller
│   └── websocket-client.js  # WebSocket communication
├── assets/                  # App icons
├── dist/                    # Build output
├── package.json
└── README.md
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_URL` | `ws://localhost:8082` | WebSocket server URL |
| `USER_ID` | `demo-user` | User identifier for agent assignment |

### Future: Config File

Create `~/.operastudio/config.json`:

```json
{
  "wsUrl": "wss://your-domain.com",
  "userId": "user_abc123",
  "autoStart": true
}
```

## Development

### Testing Locally

1. Start WebSocket server:
```bash
cd websocket-server
pnpm dev
```

2. Start Electron app:
```bash
cd electron-browser
npm run dev
```

3. Send test command via WebSocket:
```javascript
const ws = new WebSocket('ws://localhost:8082');

ws.onopen = () => {
  // Send navigate command
  ws.send(JSON.stringify({
    type: 'navigate',
    request_id: 'test_123',
    url: 'https://example.com'
  }));
};

ws.onmessage = (event) => {
  console.log('Response:', JSON.parse(event.data));
};
```

### Debugging

Enable Chrome DevTools for the hidden window:

```javascript
// In src/main.js
mainWindow.webContents.openDevTools();
```

View console logs:
```bash
# The app logs to console
tail -f electron-debug.log
```

## Deployment

### Code Signing (Required for Production)

**Windows:**
```bash
# Get EV Code Signing certificate ($400/year)
# Configure in package.json:
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

**macOS:**
```bash
# Join Apple Developer Program ($99/year)
# Configure in package.json:
"mac": {
  "identity": "Developer ID Application: Your Name"
}

# Notarize after build
npx electron-notarize
```

### Auto-Updates

Add electron-updater configuration:

```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "operastudio-browser"
}
```

Then in `src/main.js`:

```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

## Distribution

### Option 1: Direct Download

Host installers on your own CDN:
- Windows: `operastudio-browser-setup.exe` (~120 MB)
- macOS: `OperaStudio-Browser.dmg` (~150 MB)
- Linux: `operastudio-browser.AppImage` (~130 MB)

### Option 2: GitHub Releases

```bash
# Tag release
git tag v1.0.0
git push --tags

# GitHub Actions will auto-build and create release
```

### Option 3: Auto-installer from Web App

Web app triggers download on first login:

```typescript
// In your web app
const downloadInstaller = () => {
  const platform = navigator.platform.toLowerCase();
  let url;

  if (platform.includes('win')) {
    url = '/downloads/operastudio-browser-windows.exe';
  } else if (platform.includes('mac')) {
    url = '/downloads/operastudio-browser-macos.dmg';
  } else {
    url = '/downloads/operastudio-browser-linux.AppImage';
  }

  window.location.href = url;
};
```

## Troubleshooting

### Browser won't start

```bash
# Check if Chrome/Chromium is accessible
which chromium-browser
which google-chrome

# Or install Chromium
# macOS
brew install chromium

# Linux
sudo apt install chromium-browser

# Windows - Puppeteer bundles Chrome automatically
```

### WebSocket won't connect

```bash
# Check server is running
curl ws://localhost:8082

# Check firewall
sudo ufw allow 8082

# Check logs
tail -f ~/.operastudio/logs/browser-agent.log
```

### High memory usage

```javascript
// Reduce viewport size in browser-manager.js
defaultViewport: {
  width: 1280,  // was 1920
  height: 720   // was 1080
}
```

## Performance

### Expected Resource Usage

| Metric | Idle | Active Browsing |
|--------|------|-----------------|
| RAM | 100 MB | 300-500 MB |
| CPU | <1% | 20-40% |
| Disk | 200 MB installed | - |

### Optimization Tips

1. **Close unused pages:**
```javascript
await browserManager.closePage();
```

2. **Disable images for text-only:**
```javascript
await page.setRequestInterception(true);
page.on('request', request => {
  if (request.resourceType() === 'image') {
    request.abort();
  } else {
    request.continue();
  }
});
```

3. **Use smaller viewport for screenshots:**
```javascript
await page.setViewport({ width: 800, height: 600 });
```

## Security

### Sandboxing

Puppeteer runs with `--no-sandbox` for compatibility. In production, consider:

```javascript
headless: true,
args: ['--disable-setuid-sandbox']  // Safer than --no-sandbox
```

### Network Isolation

The browser agent only connects to:
- Your WebSocket server
- Websites requested by user via LLM

No telemetry or external connections.

### User Data

Browser runs in incognito mode - no cookies, history, or cache persist between sessions.

## Roadmap

- [ ] Multi-tab support
- [ ] Browser history/back/forward
- [ ] Cookie management
- [ ] Form auto-fill
- [ ] Download handling
- [ ] Proxy support
- [ ] Custom user agents
- [ ] Network request logging

## License

MIT
