/**
 * Database Configuration Module
 * Provides database connection pool access for models and services
 *
 * @module server/config/database
 */

const { getPool } = require('../services/database-service');

/**
 * Get the PostgreSQL connection pool
 * @returns {Pool} PostgreSQL connection pool instance
 */
function getDb() {
  return getPool();
}

module.exports = getDb();
module.exports.getPool = getPool;
