import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:devpassword@localhost:5433/operastudio',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
      console.log('Database pool connected');
    });
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const pool = getPool();
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return res;
}

/**
 * Disconnect pool
 */
export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool disconnected');
  }
}
