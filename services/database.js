/**
 * Database Service
 *
 * Manages PostgreSQL connection pool and provides query methods.
 * Extracted from server.js for modularity and reusability.
 *
 * @module services/database
 */

const { Pool } = require('pg');

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Optimized pool settings for performance and reliability.
 *
 * Performance Settings:
 * - max: 20 connections (balanced for concurrent requests)
 * - idleTimeoutMillis: 30000 (close idle connections after 30s)
 * - connectionTimeoutMillis: 2000 (fail fast on connection issues)
 * - maxUses: 7500 (rotate connections to prevent memory leaks)
 * - allowExitOnIdle: true (allow process to exit when idle)
 *
 * Tuning Notes:
 * - Increase 'max' for high-traffic scenarios (monitor with pg_stat_activity)
 * - Decrease 'idleTimeoutMillis' if connection limits are reached
 * - Monitor query performance with EXPLAIN ANALYZE
 */
const pool = new Pool({
    user: process.env.DB_USER || 'ryanhaines',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'legal_forms_db',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    max: 20,                          // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,         // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000,    // Return error after 2 seconds if connection not available
    maxUses: 7500,                    // Close and replace connection after 7500 uses
    allowExitOnIdle: true             // Allow pool to exit process when idle
});

/**
 * Test database connection and log status
 * Called automatically when module is first loaded
 */
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Database connected successfully at', res.rows[0].now);
    }
});

/**
 * Execute a SQL query with parameters
 *
 * @param {string} text - SQL query text with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameters to bind to query
 * @returns {Promise<Object>} Query result object with rows array
 *
 * @example
 * const result = await db.query(
 *   'SELECT * FROM intake_submissions WHERE id = $1',
 *   [123]
 * );
 * console.log(result.rows);
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries (> 1 second)
        if (duration > 1000) {
            console.warn('⚠️  Slow query detected:', {
                duration: `${duration}ms`,
                query: text.substring(0, 100),
                rows: res.rowCount
            });
        }

        return res;
    } catch (error) {
        console.error('❌ Database query error:', {
            error: error.message,
            query: text.substring(0, 100),
            params: params
        });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 *
 * Use this when you need to run multiple queries in a transaction.
 * IMPORTANT: Always release the client when done!
 *
 * @returns {Promise<Object>} PostgreSQL client object
 *
 * @example
 * const client = await db.getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...');
 *   await client.query('INSERT INTO ...');
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query;
    const originalRelease = client.release;

    // Track query count for debugging
    let queryCount = 0;
    client.query = (...args) => {
        queryCount++;
        return originalQuery.apply(client, args);
    };

    // Warn if client not released after 30 seconds
    const timeout = setTimeout(() => {
        console.error('❌ Client not released after 30s!', {
            queryCount,
            lastQuery: client.lastQuery
        });
    }, 30000);

    // Override release to clear timeout
    client.release = () => {
        clearTimeout(timeout);
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease.apply(client);
    };

    return client;
}

/**
 * Check database connection health
 *
 * @returns {Promise<Object>} Health status object
 *
 * @example
 * const health = await db.checkHealth();
 * console.log(health);
 * // {
 * //   status: 'ok',
 * //   timestamp: '2025-11-17T...',
 * //   pool: { total: 1, idle: 1, waiting: 0 }
 * // }
 */
async function checkHealth() {
    try {
        const result = await query('SELECT NOW() as timestamp');
        return {
            status: 'ok',
            timestamp: result.rows[0].timestamp,
            pool: {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            }
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message,
            pool: {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            }
        };
    }
}

/**
 * Close all database connections
 * Call this during graceful shutdown
 *
 * @returns {Promise<void>}
 */
async function close() {
    console.log('🔌 Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await close();
    process.exit(0);
});

module.exports = {
    query,
    getClient,
    checkHealth,
    close,
    pool // Export pool for advanced use cases
};
