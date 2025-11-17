"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentWebSocketClient = void 0;
const ws_1 = __importDefault(require("ws"));
const config_1 = require("./config");
const tools_1 = require("./tools");
const logger = __importStar(require("./logger"));
class AgentWebSocketClient {
    constructor() {
        this.ws = null;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 60000; // Max 60 seconds
        this.heartbeatInterval = null;
        this.isShuttingDown = false;
        this.connect();
    }
    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.isShuttingDown) {
            return;
        }
        try {
            const config = (0, config_1.loadConfig)();
            const url = `${config.serverUrl}?userId=${encodeURIComponent(config.userId)}&secret=${encodeURIComponent(config.sharedSecret)}`;
            logger.info(`Connecting to server: ${config.serverUrl}`);
            this.ws = new ws_1.default(url);
            this.ws.on('open', () => this.onOpen());
            this.ws.on('message', (data) => this.onMessage(data));
            this.ws.on('close', () => this.onClose());
            this.ws.on('error', (error) => this.onError(error));
        }
        catch (error) {
            logger.error('Failed to connect to server', error);
            this.scheduleReconnect();
        }
    }
    /**
     * Handle connection open
     */
    onOpen() {
        logger.info('Connected to server');
        // Reset reconnect delay on successful connection
        this.reconnectDelay = 1000;
        // Start heartbeat
        this.startHeartbeat();
    }
    /**
     * Handle incoming messages
     */
    async onMessage(data) {
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
        }
        catch (error) {
            logger.error('Failed to process message', error);
        }
    }
    /**
     * Handle tool call request
     */
    async handleToolCall(message) {
        const { requestId, tool, params } = message;
        logger.info(`Executing tool call: ${tool}`, { requestId, params });
        try {
            const startTime = Date.now();
            const result = await (0, tools_1.executeTool)({ tool, params });
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
        }
        catch (error) {
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
    onClose() {
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
    onError(error) {
        logger.error('WebSocket error', error);
    }
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        logger.info(`Reconnecting in ${this.reconnectDelay / 1000} seconds...`);
        setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
            this.connect();
        }, this.reconnectDelay);
    }
    /**
     * Start heartbeat interval
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.sendMessage({ type: 'heartbeat', timestamp: Date.now() });
        }, 30000); // Every 30 seconds
    }
    /**
     * Stop heartbeat interval
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    /**
     * Send message to server
     */
    sendMessage(message) {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            logger.warn('Cannot send message: WebSocket not connected', message);
        }
    }
    /**
     * Gracefully shutdown the client
     */
    shutdown() {
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
exports.AgentWebSocketClient = AgentWebSocketClient;
