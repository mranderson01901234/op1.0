import { Redis } from 'ioredis';

// Singleton Redis clients
let redisClient: Redis | null = null;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

/**
 * Get the main Redis client
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  return redisClient;
}

/**
 * Get Redis publisher (for pub/sub)
 */
export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL);
    publisher.on('error', (err) => console.error('Publisher error:', err));
  }

  return publisher;
}

/**
 * Get Redis subscriber (for pub/sub)
 */
export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(REDIS_URL);
    subscriber.on('error', (err) => console.error('Subscriber error:', err));
  }

  return subscriber;
}

/**
 * Close all Redis connections
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }

  if (publisher) {
    await publisher.quit();
    publisher = null;
  }

  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }

  console.log('✅ Redis connections closed');
}
