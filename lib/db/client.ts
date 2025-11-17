import { Pool } from 'pg';

// Simple in-memory cache for query results
interface CacheEntry {
  result: any;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached queries

// Singleton pattern for database connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:devpassword@localhost:5433/operastudio',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection on creation
    pool.query('SELECT NOW()').then(() => {
      console.log('✅ Database connected');
    }).catch((err) => {
      console.error('❌ Database connection failed:', err);
    });
  }

  return pool;
}

/**
 * Generate cache key from query text and params
 */
function getCacheKey(text: string, params?: any[]): string {
  return `${text}:${JSON.stringify(params || [])}`;
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }

  // If cache is too large, remove oldest entries
  if (queryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(queryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, queryCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => queryCache.delete(key));
  }
}

/**
 * Check if query should be cached (SELECT queries only, no mutations)
 */
function shouldCache(text: string): boolean {
  const trimmed = text.trim().toUpperCase();
  return trimmed.startsWith('SELECT') && !trimmed.includes('FOR UPDATE');
}

// Helper to execute queries with caching
export async function query(text: string, params?: any[], useCache: boolean = true) {
  const pool = getPool();
  const start = Date.now();

  // Check cache for SELECT queries
  if (useCache && shouldCache(text)) {
    const cacheKey = getCacheKey(text, params);
    const cached = queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const duration = Date.now() - start;
      if (duration > 10) {
        console.log(`Cache hit (${duration}ms):`, text.substring(0, 50));
      }
      return cached.result;
    }
  }

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    // Cache SELECT query results
    if (useCache && shouldCache(text)) {
      const cacheKey = getCacheKey(text, params);
      queryCache.set(cacheKey, {
        result: res,
        timestamp: Date.now(),
      });
      
      // Clean expired entries periodically
      if (queryCache.size % 10 === 0) {
        cleanExpiredCache();
      }
    }

    return res;
  } catch (error) {
    console.error('Query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Clear query cache (useful for testing or after mutations)
 */
export function clearQueryCache(): void {
  queryCache.clear();
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    queryCache.clear();
    return;
  }

  for (const [key] of queryCache.entries()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

// Close pool (for graceful shutdown)
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database pool closed');
  }
}
