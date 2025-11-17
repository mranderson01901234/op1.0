import { getRedis, getPublisher, getSubscriber } from './client';

const AGENT_SERVER_TTL = 120; // 2 minutes (refreshed by heartbeat)

/**
 * Register an agent connection to this server
 */
export async function registerAgentConnection(
  userId: string,
  serverId: string
): Promise<void> {
  const redis = getRedis();
  const key = `agent:${userId}:server`;

  await redis.setex(key, AGENT_SERVER_TTL, serverId);
  console.log(`Registered agent ${userId} on server ${serverId}`);
}

/**
 * Unregister an agent connection
 */
export async function unregisterAgentConnection(userId: string): Promise<void> {
  const redis = getRedis();
  const key = `agent:${userId}:server`;

  await redis.del(key);
  console.log(`Unregistered agent ${userId}`);
}

/**
 * Get the server ID that an agent is connected to
 */
export async function getAgentServer(userId: string): Promise<string | null> {
  const redis = getRedis();
  const key = `agent:${userId}:server`;

  return await redis.get(key);
}

/**
 * Refresh agent connection TTL (called on heartbeat)
 */
export async function refreshAgentConnection(
  userId: string,
  serverId: string
): Promise<void> {
  const redis = getRedis();
  const key = `agent:${userId}:server`;

  await redis.setex(key, AGENT_SERVER_TTL, serverId);
}

/**
 * Publish a tool call to an agent via Redis pub/sub
 */
export async function publishToolCall(
  userId: string,
  message: any
): Promise<void> {
  const publisher = getPublisher();
  const channel = `agent:${userId}:commands`;

  await publisher.publish(channel, JSON.stringify(message));
  console.log(`Published tool call to agent ${userId}:`, message.requestId);
}

/**
 * Publish a tool response back to the API server
 */
export async function publishToolResponse(
  requestId: string,
  response: any
): Promise<void> {
  const publisher = getPublisher();
  const channel = `response:${requestId}`;

  await publisher.publish(channel, JSON.stringify(response));
  console.log(`Published tool response for request ${requestId}`);
}

/**
 * Subscribe to tool calls for agents on this server
 */
export async function subscribeToAgentCommands(
  userId: string,
  handler: (message: any) => void
): Promise<void> {
  const subscriber = getSubscriber();
  const channel = `agent:${userId}:commands`;

  // Subscribe to channel
  await subscriber.subscribe(channel);

  // Set up message handler
  subscriber.on('message', (ch, msg) => {
    if (ch === channel) {
      try {
        const message = JSON.parse(msg);
        handler(message);
      } catch (error) {
        console.error('Failed to parse tool call message:', error);
      }
    }
  });

  console.log(`Subscribed to commands for agent ${userId}`);
}

/**
 * Unsubscribe from agent commands
 */
export async function unsubscribeFromAgentCommands(userId: string): Promise<void> {
  const subscriber = getSubscriber();
  const channel = `agent:${userId}:commands`;

  await subscriber.unsubscribe(channel);
  console.log(`Unsubscribed from commands for agent ${userId}`);
}

/**
 * Update agent status in database
 */
export async function updateAgentStatus(
  userId: string,
  status: 'connected' | 'disconnected'
): Promise<void> {
  const redis = getRedis();
  const key = `agent:${userId}:status`;

  await redis.set(key, status);
  console.log(`Updated agent ${userId} status to ${status}`);
}

/**
 * Get count of connected agents on this server
 */
export async function getServerAgentCount(serverId: string): Promise<number> {
  const redis = getRedis();

  // Scan for all agent:*:server keys
  const keys = await redis.keys('agent:*:server');

  // Count how many are on this server
  let count = 0;
  for (const key of keys) {
    const server = await redis.get(key);
    if (server === serverId) {
      count++;
    }
  }

  return count;
}

/**
 * Get all connected agent user IDs across all servers
 */
export async function getAllConnectedAgents(): Promise<string[]> {
  const redis = getRedis();

  // Scan for all agent:*:server keys
  const keys = await redis.keys('agent:*:server');

  // Extract user IDs from keys (agent:{userId}:server)
  return keys.map((key) => {
    const match = key.match(/^agent:(.+):server$/);
    return match ? match[1] : null;
  }).filter((userId): userId is string => userId !== null);
}
