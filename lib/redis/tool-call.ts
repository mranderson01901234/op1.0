import { getPublisher, getSubscriber } from './client';
import { nanoid } from 'nanoid';

const TOOL_CALL_TIMEOUT = 60000; // 60 seconds

export interface ToolCallRequest {
  tool: string;
  params: any;
  timeout?: number;
}

export interface ToolCallResponse {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

/**
 * Send a tool call to an agent and wait for response
 */
export async function sendToolCall(
  userId: string,
  request: ToolCallRequest
): Promise<ToolCallResponse> {
  const requestId = nanoid();
  const timeout = request.timeout || TOOL_CALL_TIMEOUT;

  return new Promise(async (resolve, reject) => {
    const subscriber = getSubscriber();
    const publisher = getPublisher();
    const responseChannel = `response:${requestId}`;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      subscriber.unsubscribe(responseChannel);
      reject(new Error('Tool call timed out'));
    }, timeout);

    // Subscribe to response channel
    await subscriber.subscribe(responseChannel);

    // Set up message handler
    const messageHandler = (channel: string, message: string) => {
      if (channel === responseChannel) {
        try {
          const response = JSON.parse(message);

          // Clear timeout
          clearTimeout(timeoutId);

          // Unsubscribe
          subscriber.unsubscribe(responseChannel);
          subscriber.off('message', messageHandler);

          // Resolve with response
          resolve(response);
        } catch (error) {
          clearTimeout(timeoutId);
          subscriber.unsubscribe(responseChannel);
          subscriber.off('message', messageHandler);
          reject(new Error('Failed to parse tool response'));
        }
      }
    };

    subscriber.on('message', messageHandler);

    // Publish tool call to agent
    const toolCallMessage = {
      type: 'tool_call',
      requestId,
      tool: request.tool,
      params: request.params,
    };

    const commandChannel = `agent:${userId}:commands`;
    await publisher.publish(commandChannel, JSON.stringify(toolCallMessage));

    console.log(`Tool call sent to agent ${userId}:`, requestId);
  });
}

/**
 * Check if an agent is connected
 */
export async function isAgentConnected(userId: string): Promise<boolean> {
  const { getRedis } = await import('./client');
  const redis = getRedis();
  const key = `agent:${userId}:server`;
  const serverId = await redis.get(key);
  return serverId !== null;
}

/**
 * Get the server ID that an agent is connected to
 */
export async function getAgentServer(userId: string): Promise<string | null> {
  const { getRedis } = await import('./client');
  const redis = getRedis();
  const key = `agent:${userId}:server`;
  return await redis.get(key);
}
