import WebSocket from 'ws';
import { validateCredentials, updateAgentStatus as updateDbAgentStatus, logToolExecution } from './db/auth';
import {
  registerAgentConnection,
  unregisterAgentConnection,
  refreshAgentConnection,
  subscribeToAgentCommands,
  unsubscribeFromAgentCommands,
  publishToolResponse,
} from './redis/registry';

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '30000');
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT || '90000');
const SERVER_ID = process.env.SERVER_ID || `ws-server-${process.pid}`;

interface AgentConnection {
  ws: WebSocket;
  userId: string;
  lastHeartbeat: number;
  heartbeatTimer: NodeJS.Timeout;
}

export class ConnectionManager {
  private connections = new Map<string, AgentConnection>();

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, userId: string, secret: string): Promise<void> {
    console.log(`New connection attempt from user: ${userId}`);

    // Validate credentials
    const isValid = await validateCredentials(userId, secret);
    if (!isValid) {
      console.warn(`Invalid credentials for user: ${userId}`);
      ws.close(1008, 'Invalid credentials');
      return;
    }

    // Check if user is already connected
    if (this.connections.has(userId)) {
      console.warn(`User ${userId} already connected, closing old connection`);
      this.closeConnection(userId);
    }

    // Register connection
    await this.registerConnection(ws, userId);

    console.log(`Agent ${userId} connected successfully`);
  }

  /**
   * Register a new connection
   */
  private async registerConnection(ws: WebSocket, userId: string): Promise<void> {
    // Register in Redis
    await registerAgentConnection(userId, SERVER_ID);

    // Update database status
    await updateDbAgentStatus(userId, 'connected', new Date());

    // Create connection record
    const connection: AgentConnection = {
      ws,
      userId,
      lastHeartbeat: Date.now(),
      heartbeatTimer: this.startHeartbeatMonitor(userId),
    };

    this.connections.set(userId, connection);

    // Set up WebSocket handlers
    ws.on('message', (data) => this.handleMessage(userId, data));
    ws.on('close', () => this.handleDisconnect(userId));
    ws.on('error', (error) => this.handleError(userId, error));

    // Subscribe to Redis commands for this agent
    await subscribeToAgentCommands(userId, (message) => {
      this.forwardToolCall(userId, message);
    });

    // Send connection confirmation
    this.sendMessage(userId, {
      type: 'connected',
      userId,
      timestamp: Date.now(),
      serverId: SERVER_ID,
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(userId: string, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      console.log(`Message from ${userId}:`, message.type);

      switch (message.type) {
        case 'heartbeat':
          await this.handleHeartbeat(userId);
          break;

        case 'tool_response':
          await this.handleToolResponse(userId, message);
          break;

        default:
          console.warn(`Unknown message type from ${userId}:`, message.type);
      }
    } catch (error) {
      console.error(`Failed to process message from ${userId}:`, error);
    }
  }

  /**
   * Handle heartbeat from agent
   */
  private async handleHeartbeat(userId: string): Promise<void> {
    const connection = this.connections.get(userId);
    if (!connection) return;

    // Update last heartbeat
    connection.lastHeartbeat = Date.now();

    // Refresh Redis TTL
    await refreshAgentConnection(userId, SERVER_ID);

    // Send acknowledgment
    this.sendMessage(userId, {
      type: 'heartbeat_ack',
      timestamp: Date.now(),
    });
  }

  /**
   * Handle tool response from agent
   */
  private async handleToolResponse(userId: string, message: any): Promise<void> {
    const { requestId, success, result, error, executionTime } = message;

    console.log(`Tool response from ${userId} for request ${requestId}:`, { success });

    // Publish response via Redis
    await publishToolResponse(requestId, {
      userId,
      success,
      result,
      error,
      executionTime,
    });

    // Log to database
    await logToolExecution(
      userId,
      requestId,
      message.tool || 'unknown',
      message.params || {},
      result,
      success,
      error,
      executionTime
    );
  }

  /**
   * Forward tool call from Redis to agent
   */
  private forwardToolCall(userId: string, message: any): void {
    console.log(`Forwarding tool call to ${userId}:`, message.requestId);
    this.sendMessage(userId, message);
  }

  /**
   * Send message to agent
   */
  private sendMessage(userId: string, message: any): void {
    const connection = this.connections.get(userId);
    if (!connection) {
      console.warn(`Cannot send message to ${userId}: not connected`);
      return;
    }

    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    } else {
      console.warn(`Cannot send message to ${userId}: WebSocket not open`);
    }
  }

  /**
   * Start heartbeat monitor for a connection
   */
  private startHeartbeatMonitor(userId: string): NodeJS.Timeout {
    return setInterval(() => {
      const connection = this.connections.get(userId);
      if (!connection) return;

      const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat;

      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.warn(`Heartbeat timeout for ${userId}, closing connection`);
        this.closeConnection(userId);
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(userId: string): Promise<void> {
    console.log(`Agent ${userId} disconnected`);
    await this.cleanupConnection(userId);
  }

  /**
   * Handle error
   */
  private handleError(userId: string, error: Error): void {
    console.error(`WebSocket error for ${userId}:`, error);
  }

  /**
   * Close a connection
   */
  private closeConnection(userId: string): void {
    const connection = this.connections.get(userId);
    if (!connection) return;

    // Close WebSocket
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }

    // Clean up will be handled by 'close' event
  }

  /**
   * Clean up connection resources
   */
  private async cleanupConnection(userId: string): Promise<void> {
    const connection = this.connections.get(userId);
    if (!connection) return;

    // Clear heartbeat timer
    clearInterval(connection.heartbeatTimer);

    // Unsubscribe from Redis commands
    await unsubscribeFromAgentCommands(userId);

    // Unregister from Redis
    await unregisterAgentConnection(userId);

    // Update database status
    await updateDbAgentStatus(userId, 'disconnected', new Date());

    // Remove from connections map
    this.connections.delete(userId);

    console.log(`Cleaned up connection for ${userId}`);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log(`Shutting down ${this.connections.size} connections...`);

    const userIds = Array.from(this.connections.keys());

    for (const userId of userIds) {
      this.closeConnection(userId);
    }

    // Wait a bit for graceful disconnects
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('All connections closed');
  }
}
