/**
 * Simple in-memory rate limiter
 * Limits requests to 20 per minute per identifier
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

const RATE_LIMIT = 20; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    store.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false; // Rate limited
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Get remaining requests in current window
 */
export function getRemainingRequests(identifier: string): number {
  const record = store.get(identifier);
  if (!record || Date.now() > record.resetTime) {
    return RATE_LIMIT;
  }
  return Math.max(0, RATE_LIMIT - record.count);
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpired, 5 * 60 * 1000);
}
