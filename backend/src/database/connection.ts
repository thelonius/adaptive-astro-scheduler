import { Pool, PoolConfig } from 'pg';

/**
 * Database Connection Pool
 *
 * Manages PostgreSQL connections with connection pooling
 */

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Log connection events
pool.on('connect', () => {
  console.log('📊 Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('📊 Database connection pool closed');
}

/**
 * Execute a query with parameters
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

export default pool;
