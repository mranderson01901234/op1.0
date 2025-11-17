import { Pool } from 'pg';

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

// Helper to execute queries
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return res;
  } catch (error) {
    console.error('Query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
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
