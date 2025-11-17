import { getRedis, getPublisher, getSubscriber } from './client';

/**
 * Register agent connection in Redis
 * TTL: 120 seconds (refreshed by heartbeat)
 */
export async function registerAgentConnection(
  userId: string,
  serverId: string
): Promise<void> {
  const redis = getRedis();
  await redis.setex(`agent:${userId}:server`, 120, serverId);
}

/**
 * Check if agent is connected
 */
export async function isAgentConnected(userId: string): Promise<boolean> {
  const redis = getRedis();
  const exists = await redis.exists(`agent:${userId}:server`);
  return exists === 1;
}

/**
 * Get server ID handling this agent
 */
export async function getAgentServer(userId: string): Promise<string | null> {
  const redis = getRedis();
  return await redis.get(`agent:${userId}:server`);
}

/**
 * Remove agent connection from registry
 */
export async function removeAgentConnection(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`agent:${userId}:server`);
}

/**
 * Send tool call to agent via Redis pub/sub
 */
export async function sendToolCallToAgent(
  userId: string,
  toolCall: {
    type: 'tool_call';
    requestId: string;
    tool: string;
    params: any;
  }
): Promise<void> {
  const publisher = getPublisher();
  const channel = `agent:${userId}:commands`;
  await publisher.publish(channel, JSON.stringify(toolCall));
}

/**
 * Subscribe to agent commands
 */
export async function subscribeToAgentCommands(
  userId: string,
  handler: (message: any) => void
): Promise<void> {
  const subscriber = getSubscriber();
  const channel = `agent:${userId}:commands`;

  await subscriber.subscribe(channel);

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const parsed = JSON.parse(message);
        handler(parsed);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });
}

/**
 * Unsubscribe from agent commands
 */
export async function unsubscribeFromAgentCommands(userId: string): Promise<void> {
  const subscriber = getSubscriber();
  const channel = `agent:${userId}:commands`;
  await subscriber.unsubscribe(channel);
}

/**
 * Send tool response from agent
 */
export async function sendToolResponse(
  requestId: string,
  response: any
): Promise<void> {
  const publisher = getPublisher();
  const channel = `response:${requestId}`;
  await publisher.publish(channel, JSON.stringify(response));
}

/**
 * Subscribe to tool response
 */
export function subscribeToToolResponse(
  requestId: string,
  handler: (response: any) => void
): Promise<void> {
  return new Promise((resolve) => {
    const subscriber = getSubscriber();
    const channel = `response:${requestId}`;

    subscriber.subscribe(channel, () => {
      resolve();
    });

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          handler(parsed);
        } catch (error) {
          console.error('Error parsing response:', error);
        }
      }
    });
  });
}

/**
 * Unsubscribe from tool response
 */
export async function unsubscribeFromToolResponse(requestId: string): Promise<void> {
  const subscriber = getSubscriber();
  const channel = `response:${requestId}`;
  await subscriber.unsubscribe(channel);
}

/**
 * Store pending request (with TTL)
 */
export async function storePendingRequest(
  requestId: string,
  data: { userId: string; timestamp: number }
): Promise<void> {
  const redis = getRedis();
  await redis.setex(`pending:${requestId}`, 30, JSON.stringify(data));
}

/**
 * Get pending request
 */
export async function getPendingRequest(requestId: string): Promise<any> {
  const redis = getRedis();
  const data = await redis.get(`pending:${requestId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete pending request
 */
export async function deletePendingRequest(requestId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`pending:${requestId}`);
}
