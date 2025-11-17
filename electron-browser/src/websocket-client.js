const WebSocket = require('ws');
const { nanoid } = require('nanoid');

class WebSocketClient {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.ws = null;
    this.userId = null;
    this.reconnectInterval = null;
    this.isConnected = false;
  }

  connect(wsUrl, userId) {
    this.userId = userId;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[WebSocket] Connected to server');
        this.isConnected = true;

        // Send authentication
        this.send({
          type: 'auth',
          userId: this.userId,
          clientType: 'browser_agent'
        });

        // Clear reconnect interval if exists
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      });

      this.ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
        this.isConnected = false;
        this.scheduleReconnect(wsUrl, userId);
      });

      this.ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect(wsUrl, userId);
    }
  }

  scheduleReconnect(wsUrl, userId) {
    if (this.reconnectInterval) return;

    console.log('[WebSocket] Scheduling reconnect in 5 seconds...');
    this.reconnectInterval = setInterval(() => {
      console.log('[WebSocket] Attempting to reconnect...');
      this.connect(wsUrl, userId);
    }, 5000);
  }

  async handleMessage(message) {
    console.log('[WebSocket] Received message:', message.type);

    const { type, request_id } = message;

    let response;

    switch (type) {
      case 'navigate':
        response = await this.browserManager.navigate(message.url);
        break;

      case 'get_content':
        response = await this.browserManager.getContent();
        break;

      case 'screenshot':
        response = await this.browserManager.screenshot();
        break;

      case 'execute_script':
        response = await this.browserManager.executeScript(message.script);
        break;

      case 'close_tab':
        response = await this.browserManager.closePage();
        break;

      default:
        console.log('[WebSocket] Unknown message type:', type);
        return;
    }

    // Send response back
    this.send({
      type: 'browser_response',
      request_id,
      ...response
    });
  }

  send(data) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }

  disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    console.log('[WebSocket] Disconnected');
  }
}

module.exports = WebSocketClient;
