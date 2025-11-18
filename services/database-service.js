/**
 * Database Service
 *
 * Centralized PostgreSQL database management with connection pooling,
 * health checks, and graceful shutdown handling.
 *
 * Features:
 * - Connection pool with optimized settings
 * - Automatic health monitoring
 * - Graceful shutdown on process termination
 * - Query helper methods
 * - Pool statistics for monitoring
 *
 * @module services/database-service
 */

const { Pool } = require('pg');
const logger = require('../monitoring/logger');

/**
 * Database Service Class
 * Manages PostgreSQL connections with optimized pooling configuration
 */
class DatabaseService {
    constructor(config = {}) {
        this.config = {
            user: config.user || process.env.DB_USER || 'ryanhaines',
            host: config.host || process.env.DB_HOST || 'localhost',
            database: config.database || process.env.DB_NAME || 'legal_forms_db',
            password: config.password || process.env.DB_PASSWORD || '',
            port: config.port || process.env.DB_PORT || 5432,
            max: config.max || 20,                          // Maximum number of clients in the pool
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,         // Close idle clients after 30 seconds
            connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,    // Return error after 2 seconds
            maxUses: config.maxUses || 7500,                    // Close and replace connection after 7500 uses
            allowExitOnIdle: config.allowExitOnIdle !== undefined ? config.allowExitOnIdle : true
        };

        this.pool = null;
        this.isConnected = false;
        this._initializePool();
        this._setupGracefulShutdown();
    }

    /**
     * Initialize connection pool
     * @private
     */
    _initializePool() {
        this.pool = new Pool(this.config);

        // Handle pool errors
        this.pool.on('error', (err, client) => {
            logger.error('Unexpected database pool error:', err);
        });

        // Handle client connection
        this.pool.on('connect', (client) => {
            logger.debug('New database client connected to pool');
        });

        // Handle client removal
        this.pool.on('remove', (client) => {
            logger.debug('Database client removed from pool');
        });
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async connect() {
        try {
            const result = await this.pool.query('SELECT NOW()');
            this.isConnected = true;
            logger.info('✅ Database connected successfully', {
                timestamp: result.rows[0].now
            });
            return true;
        } catch (err) {
            this.isConnected = false;
            logger.error('❌ Database connection error:', err);
            throw err;
        }
    }

    /**
     * Execute a SQL query
     * @param {string} text - SQL query text
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;

            logger.debug('Database query executed', {
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration,
                rows: result.rowCount
            });

            return result;
        } catch (err) {
            logger.error('Database query error:', {
                query: text.substring(0, 100),
                error: err.message,
                params: params
            });
            throw err;
        }
    }

    /**
     * Get a client from the pool for transactions
     * Must call client.release() when done
     *
     * @example
     * const client = await db.getClient();
     * try {
     *   await client.query('BEGIN');
     *   await client.query('INSERT INTO ...');
     *   await client.query('COMMIT');
     * } catch (err) {
     *   await client.query('ROLLBACK');
     *   throw err;
     * } finally {
     *   client.release();
     * }
     *
     * @returns {Promise<Object>} PostgreSQL client
     */
    async getClient() {
        try {
            const client = await this.pool.connect();
            logger.debug('Database client acquired from pool');
            return client;
        } catch (err) {
            logger.error('Failed to get database client from pool:', err);
            throw err;
        }
    }

    /**
     * Execute a transaction
     * Automatically handles BEGIN, COMMIT, and ROLLBACK
     *
     * @param {Function} callback - Async function that receives client
     * @returns {Promise<any>} Result from callback
     *
     * @example
     * const result = await db.transaction(async (client) => {
     *   await client.query('INSERT INTO ...');
     *   await client.query('UPDATE ...');
     *   return { success: true };
     * });
     */
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            logger.debug('Database transaction committed');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            logger.error('Database transaction rolled back:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get pool statistics
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        return {
            totalCount: this.pool.totalCount,      // Total clients (active + idle)
            idleCount: this.pool.idleCount,        // Idle clients
            waitingCount: this.pool.waitingCount,  // Waiting requests
            maxSize: this.config.max,              // Maximum pool size
            isConnected: this.isConnected
        };
    }

    /**
     * Check database health
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const start = Date.now();
            const result = await this.pool.query('SELECT NOW(), current_database(), current_user, version()');
            const duration = Date.now() - start;

            return {
                healthy: true,
                timestamp: result.rows[0].now,
                database: result.rows[0].current_database,
                user: result.rows[0].current_user,
                version: result.rows[0].version,
                queryDuration: duration,
                poolStats: this.getPoolStats()
            };
        } catch (err) {
            return {
                healthy: false,
                error: err.message,
                poolStats: this.getPoolStats()
            };
        }
    }

    /**
     * Gracefully shutdown pool
     * @returns {Promise<void>}
     */
    async shutdown() {
        if (this.pool) {
            logger.info('Closing database connection pool...');
            await this.pool.end();
            this.isConnected = false;
            logger.info('✅ Database connection pool closed');
        }
    }

    /**
     * Setup graceful shutdown handlers
     * @private
     */
    _setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}, closing database connections...`);
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    /**
     * Get configuration (without sensitive data)
     * @returns {Object} Configuration
     */
    getConfig() {
        return {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            max: this.config.max,
            idleTimeoutMillis: this.config.idleTimeoutMillis,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis
        };
    }
}

// Export singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
