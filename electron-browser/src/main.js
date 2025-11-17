const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const BrowserManager = require('./browser-manager');
const WebSocketClient = require('./websocket-client');

// Keep references to prevent garbage collection
let tray = null;
let mainWindow = null;
let browserManager = null;
let wsClient = null;

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:8082';
const USER_ID = process.env.USER_ID || 'demo-user'; // TODO: Get from config file or prompt

async function createWindow() {
  // Create hidden window
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false, // Start hidden
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Optional: Load a simple status page
  mainWindow.loadURL('data:text/html,<h1>OperaStudio Browser Agent</h1><p>Running in background...</p>');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create tray icon (use a simple colored icon for now)
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACpSURBVHgBpZPBDYAgDEVbXYAbcRNGYBNHYQRH0BtXYAI2wQn0ZkxIjKTY+idN+O1/oQ3AV4hIBLAB2AEcAOaUUh5CHcdxXtd1M8bYSimPc84noChFURRN0zTWe+8459w4jiP/RlEU1XVdO+fcMAwmhBCklNZ7b5umqWVZltF7v4QQJoD5E6TrusZa+wDwLfwPiJxzS9M0xjk3CyE+gJxzGwD7yTmn+6/sCe93N7FvD0VuAAAAAElFTkSuQmCC');

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'OperaStudio Browser Agent',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Status: Running',
      enabled: false
    },
    {
      label: `Connected: ${wsClient && wsClient.isConnected ? 'Yes' : 'No'}`,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('OperaStudio Browser Agent');
  tray.setContextMenu(contextMenu);
}

async function initialize() {
  try {
    console.log('[App] Initializing Browser Manager...');

    // Initialize browser manager
    browserManager = new BrowserManager();
    const success = await browserManager.initialize();

    if (!success) {
      console.error('[App] Failed to initialize browser');
      return;
    }

    console.log('[App] Initializing WebSocket Client...');

    // Initialize WebSocket client
    wsClient = new WebSocketClient(browserManager);
    wsClient.connect(WS_URL, USER_ID);

    console.log('[App] Initialization complete');
    console.log(`[App] User ID: ${USER_ID}`);
    console.log(`[App] WebSocket URL: ${WS_URL}`);

  } catch (error) {
    console.error('[App] Initialization error:', error);
  }
}

// App lifecycle
app.whenReady().then(async () => {
  await createWindow();
  createTray();
  await initialize();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (event) => {
  // Prevent app from quitting when windows are closed
  // Keep running in background
  event.preventDefault();
});

app.on('before-quit', async () => {
  console.log('[App] Shutting down...');

  if (wsClient) {
    wsClient.disconnect();
  }

  if (browserManager) {
    await browserManager.cleanup();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[App] Unhandled rejection:', error);
});
