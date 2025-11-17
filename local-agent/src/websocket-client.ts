import WebSocket from 'ws';
import { loadConfig } from './config';
import { executeTool } from './tools';
import * as logger from './logger';

export class AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 60000; // Max 60 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.connect();
  }

  /**
   * Connect to the WebSocket server
   */
  private connect(): void {
    if (this.isShuttingDown) {
      return;
    }

    try {
      const config = loadConfig();
      const url = `${config.serverUrl}?userId=${encodeURIComponent(config.userId)}&secret=${encodeURIComponent(config.sharedSecret)}`;

      logger.info(`Connecting to server: ${config.serverUrl}`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('close', () => this.onClose());
      this.ws.on('error', (error) => this.onError(error));
    } catch (error) {
      logger.error('Failed to connect to server', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  private onOpen(): void {
    logger.info('Connected to server');

    // Reset reconnect delay on successful connection
    this.reconnectDelay = 1000;

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle incoming messages
   */
  private async onMessage(data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      logger.info(`Received message: ${message.type}`, { requestId: message.requestId });

      switch (message.type) {
        case 'connected':
          logger.info('Server confirmed connection', message);
          break;

        case 'heartbeat_ack':
          // Heartbeat acknowledged
          break;

        case 'tool_call':
          await this.handleToolCall(message);
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`, message);
      }
    } catch (error) {
      logger.error('Failed to process message', error);
    }
  }

  /**
   * Handle tool call request
   */
  private async handleToolCall(message: any): Promise<void> {
    const { requestId, tool, params } = message;

    logger.info(`Executing tool call: ${tool}`, { requestId, params });

    try {
      const startTime = Date.now();
      const result = await executeTool({ tool, params });
      const executionTime = Date.now() - startTime;

      logger.info(`Tool call completed: ${tool} in ${executionTime}ms`, {
        requestId,
        success: result.success,
      });

      // Send response back to server
      this.sendMessage({
        type: 'tool_response',
        requestId,
        success: result.success,
        result: result.result,
        error: result.error,
        executionTime,
      });
    } catch (error: any) {
      logger.error(`Tool call failed: ${tool}`, error);

      this.sendMessage({
        type: 'tool_response',
        requestId,
        success: false,
        error: error.message || 'Unknown error occurred',
      });
    }
  }

  /**
   * Handle connection close
   */
  private onClose(): void {
    logger.warn('Disconnected from server');

    // Stop heartbeat
    this.stopHeartbeat();

    // Attempt to reconnect
    if (!this.isShuttingDown) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private onError(error: Error): void {
    logger.error('WebSocket error', error);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    logger.info(`Reconnecting in ${this.reconnectDelay / 1000} seconds...`);

    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({ type: 'heartbeat', timestamp: Date.now() });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not connected', message);
    }
  }

  /**
   * Gracefully shutdown the client
   */
  public shutdown(): void {
    logger.info('Shutting down agent...');

    this.isShuttingDown = true;

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
