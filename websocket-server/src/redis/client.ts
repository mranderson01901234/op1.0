import { Redis } from 'ioredis';

let redisClient: Redis | null = null;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

/**
 * Get main Redis client (for get/set operations)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });
  }
  return redisClient;
}

/**
 * Get Redis publisher (for pub/sub)
 */
export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    publisher.on('error', (err) => {
      console.error('Redis publisher error:', err);
    });

    publisher.on('connect', () => {
      console.log('Redis publisher connected');
    });
  }
  return publisher;
}

/**
 * Get Redis subscriber (for pub/sub)
 */
export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    subscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
    });

    subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
    });
  }
  return subscriber;
}

/**
 * Disconnect all Redis clients
 */
export async function disconnectAll(): Promise<void> {
  const promises: Promise<any>[] = [];

  if (redisClient) {
    promises.push(redisClient.quit());
    redisClient = null;
  }

  if (publisher) {
    promises.push(publisher.quit());
    publisher = null;
  }

  if (subscriber) {
    promises.push(subscriber.quit());
    subscriber = null;
  }

  await Promise.all(promises);
  console.log('All Redis connections closed');
}
