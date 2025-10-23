/**
 * Database Service
 *
 * Manages PostgreSQL connection pool and provides database operations
 * for the Legal Form Application.
 *
 * Features:
 * - Connection pool management with tuned settings
 * - GCP Cloud SQL support (Unix socket connection)
 * - Connection health monitoring
 * - Automatic connection retry
 * - Graceful connection cleanup
 *
 * GCP Cloud Run Compatibility:
 * - Uses Unix socket when CLOUD_SQL_CONNECTION_NAME env var is set
 * - Lower connection pool size for serverless (5 max vs 20 for local)
 * - Shorter timeout settings for fast failure
 *
 * Environment Variables:
 *   DB_USER - Database username
 *   DB_HOST - Database host (or Unix socket path for Cloud SQL)
 *   DB_NAME - Database name
 *   DB_PASSWORD - Database password (use Secret Manager in production)
 *   DB_PORT - Database port (default: 5432)
 *   CLOUD_SQL_CONNECTION_NAME - Cloud SQL connection string (optional)
 *   NODE_ENV - Environment (affects pool size and behavior)
 *
 * Usage:
 *   const { getPool, executeQuery } = require('./services/database-service');
 *   const pool = getPool();
 *   const result = await pool.query('SELECT * FROM cases');
 *
 * Last Updated: 2025-10-23
 * Changes: Extracted from monolithic server.js (Phase 1 refactoring)
 */

const { Pool } = require('pg');
const logger = require('../../monitoring/logger');

// Determine if running in Cloud Run environment
const isCloudRun = process.env.K_SERVICE !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Optimized pool settings for performance and reliability.
 *
 * Cloud Run Optimizations:
 * - max: 5 connections (serverless scales horizontally, each instance needs fewer connections)
 * - min: 1 connection (keep one warm to avoid cold start penalty)
 * - idleTimeoutMillis: 30000 (close idle connections after 30s)
 * - connectionTimeoutMillis: 10000 (fail fast on connection issues)
 *
 * Local Development:
 * - max: 20 connections (balanced for concurrent requests)
 * - min: 2 connections
 * - More forgiving timeouts
 *
 * Performance Tuning:
 * - Increase 'max' for high-traffic scenarios (monitor with pg_stat_activity)
 * - Decrease 'idleTimeoutMillis' if connection limits are reached
 * - Monitor query performance with EXPLAIN ANALYZE
 */
const poolConfig = {
    user: process.env.DB_USER || 'ryanhaines',
    database: process.env.DB_NAME || 'legal_forms_db',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,

    // Cloud Run uses Unix socket for Cloud SQL connection
    ...(isCloudRun && process.env.CLOUD_SQL_CONNECTION_NAME ? {
        host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`
    } : {
        host: process.env.DB_HOST || 'localhost'
    }),

    // Connection pool settings (optimized for environment)
    max: isCloudRun ? 5 : 20,                    // Maximum connections in pool
    min: isCloudRun ? 1 : 2,                     // Minimum connections to keep warm
    idleTimeoutMillis: 30000,                    // Close idle clients after 30 seconds
    connectionTimeoutMillis: isCloudRun ? 10000 : 2000,  // Timeout for acquiring connection
    maxUses: 7500,                               // Close and replace connection after 7500 uses
    allowExitOnIdle: true,                       // Allow pool to exit process when idle

    // Query timeout settings
    statement_timeout: 30000,                    // 30 second timeout for statements
    query_timeout: 30000                         // 30 second timeout for queries
};

// Create connection pool
const pool = new Pool(poolConfig);

// Log configuration on startup
console.log('💾 Database Configuration:', {
    host: poolConfig.host,
    database: poolConfig.database,
    port: poolConfig.port,
    maxConnections: poolConfig.max,
    environment: isCloudRun ? 'Cloud Run' : 'Local',
    cloudSqlConnection: process.env.CLOUD_SQL_CONNECTION_NAME || 'none'
});

/**
 * Connection Event Handlers
 *
 * Monitor connection pool for errors and lifecycle events.
 */
pool.on('connect', (client) => {
    logger.debug('New database connection established', {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount
    });
});

pool.on('acquire', (client) => {
    logger.debug('Connection acquired from pool', {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount
    });
});

pool.on('error', (err, client) => {
    logger.error('Unexpected database pool error', {
        error: err.message,
        stack: err.stack
    });
});

pool.on('remove', (client) => {
    logger.debug('Connection removed from pool', {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount
    });
});

/**
 * Test database connection on module load
 *
 * Verifies that database is reachable and credentials are valid.
 * Logs success or error but doesn't block application startup.
 */
pool.query('SELECT NOW() as current_time', (err, res) => {
    if (err) {
        logger.error('❌ Database connection error', {
            error: err.message,
            host: poolConfig.host,
            database: poolConfig.database
        });
        console.error('❌ Database connection error:', err.message);
    } else {
        logger.info('✅ Database connected successfully', {
            currentTime: res.rows[0].current_time,
            host: poolConfig.host,
            database: poolConfig.database
        });
        console.log('✅ Database connected successfully');
    }
});

/**
 * Get the connection pool instance
 *
 * Returns the singleton PostgreSQL connection pool.
 * Use this to execute queries throughout the application.
 *
 * @returns {Pool} PostgreSQL connection pool
 *
 * @example
 * const { getPool } = require('./services/database-service');
 * const pool = getPool();
 * const result = await pool.query('SELECT * FROM cases WHERE id = $1', [caseId]);
 */
function getPool() {
    return pool;
}

/**
 * Execute a parameterized query
 *
 * Helper function to execute queries with automatic error logging.
 * Uses parameterized queries to prevent SQL injection.
 *
 * @param {string} text - SQL query text with $1, $2 placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 *
 * @example
 * const result = await executeQuery(
 *   'SELECT * FROM cases WHERE case_number = $1',
 *   ['CASE-12345']
 * );
 */
async function executeQuery(text, params = []) {
    const startTime = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - startTime;

        logger.debug('Query executed successfully', {
            duration: `${duration}ms`,
            rowCount: result.rowCount
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Query execution failed', {
            error: error.message,
            duration: `${duration}ms`,
            query: text,
            params: params
        });
        throw error;
    }
}

/**
 * Check database connection health
 *
 * Executes a simple query to verify database is responsive.
 * Returns timing information for monitoring.
 *
 * @returns {Promise<Object>} Health check result
 *
 * @example
 * const health = await checkDatabaseHealth();
 * // { healthy: true, responseTime: 15, currentTime: '2025-10-23...' }
 */
async function checkDatabaseHealth() {
    const startTime = Date.now();
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        const responseTime = Date.now() - startTime;

        return {
            healthy: true,
            responseTime,
            currentTime: result.rows[0].current_time,
            poolInfo: {
                totalConnections: pool.totalCount,
                idleConnections: pool.idleCount,
                waitingRequests: pool.waitingCount
            }
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            healthy: false,
            responseTime,
            error: error.message
        };
    }
}

/**
 * Gracefully close all database connections
 *
 * Should be called during application shutdown.
 * Waits for active queries to complete before closing.
 *
 * @returns {Promise<void>}
 */
async function closePool() {
    logger.info('Closing database connection pool...');
    try {
        await pool.end();
        logger.info('Database connection pool closed successfully');
    } catch (error) {
        logger.error('Error closing database connection pool', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Transaction helper
 *
 * Executes multiple queries in a transaction with automatic rollback on error.
 *
 * @param {Function} callback - Async function that receives client and executes queries
 * @returns {Promise<any>} Result of callback function
 *
 * @example
 * await executeTransaction(async (client) => {
 *   await client.query('INSERT INTO cases ...');
 *   await client.query('INSERT INTO parties ...');
 *   return { success: true };
 * });
 */
async function executeTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back', { error: error.message });
        throw error;
    } finally {
        client.release();
    }
}

// Export pool and utility functions
module.exports = {
    getPool,
    executeQuery,
    checkDatabaseHealth,
    closePool,
    executeTransaction
};
