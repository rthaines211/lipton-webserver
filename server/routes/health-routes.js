/**
 * Health Check Routes
 *
 * Provides health check endpoints for GCP Cloud Run monitoring and observability.
 *
 * Endpoints:
 * - GET /health - Simple liveness probe (returns 200 OK)
 * - GET /health/detailed - Detailed system health with database status
 * - GET /api/health/db - Database-specific health check
 * - GET /metrics - Prometheus metrics endpoint
 *
 * GCP Cloud Run Integration:
 * - Liveness probe: /health
 * - Readiness probe: /health/detailed
 * - Metrics scraping: /metrics
 *
 * Authentication:
 * These endpoints bypass authentication to allow GCP monitoring services
 * to check health without credentials.
 *
 * Last Updated: 2025-10-23
 * Changes: Extracted from monolithic server.js (Phase 1 refactoring)
 */

const express = require('express');
const router = express.Router();

// Import health check functions from monitoring module
const {
    checkLiveness,
    checkReadiness,
    checkDetailed,
    sendHealthResponse
} = require('../../monitoring/health-checks');

// Import metrics for Prometheus endpoint
const metricsModule = require('../../monitoring/metrics');

// Logger
const logger = require('../../monitoring/logger');

/**
 * GET /health
 *
 * Simple liveness probe for GCP Cloud Run.
 * Returns 200 OK if server is running.
 *
 * Used by:
 * - GCP Cloud Run liveness probe
 * - External monitoring services
 * - Load balancers
 *
 * Response: { status: 'ok', timestamp: '2025-10-23T...' }
 */
router.get('/health', async (req, res) => {
    try {
        const health = await checkLiveness();
        sendHealthResponse(res, health);
    } catch (error) {
        logger.error('Health check error', { error: error.message });
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /health/detailed
 *
 * Comprehensive health check including database connectivity.
 * Returns detailed system information.
 *
 * Used by:
 * - GCP Cloud Run readiness probe
 * - Debugging and diagnostics
 * - Status dashboards
 *
 * Response includes:
 * - Server status
 * - Database connectivity
 * - Environment information
 * - Uptime
 * - Memory usage
 */
router.get('/health/detailed', async (req, res) => {
    try {
        const health = await checkDetailed();
        sendHealthResponse(res, health);
    } catch (error) {
        logger.error('Detailed health check error', { error: error.message });
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/db
 *
 * Database-specific health check.
 * Verifies PostgreSQL connection is working.
 *
 * Used by:
 * - Application monitoring
 * - Database connectivity verification
 * - Troubleshooting
 *
 * Response includes:
 * - Database connection status
 * - Query execution time
 * - Connection pool information
 */
router.get('/api/health/db', async (req, res) => {
    try {
        // Import database service to check connection
        const { getPool } = require('../services/database-service');
        const pool = getPool();

        const startTime = Date.now();
        const result = await pool.query('SELECT NOW() as current_time, version() as version');
        const queryTime = Date.now() - startTime;

        res.json({
            status: 'healthy',
            database: 'connected',
            responseTime: `${queryTime}ms`,
            currentTime: result.rows[0].current_time,
            version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
            poolInfo: {
                totalConnections: pool.totalCount,
                idleConnections: pool.idleCount,
                waitingRequests: pool.waitingCount
            }
        });
    } catch (error) {
        logger.error('Database health check failed', { error: error.message });
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /metrics
 *
 * Prometheus metrics endpoint for monitoring.
 * Returns metrics in Prometheus text format.
 *
 * Metrics include:
 * - HTTP request duration (histogram)
 * - HTTP request count (counter)
 * - HTTP error rate (counter)
 * - Form submission count (counter)
 * - Database connection pool (gauge)
 * - Node.js memory usage (gauge)
 *
 * Used by:
 * - Prometheus scraping
 * - Grafana dashboards
 * - Alerting systems
 */
router.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', metricsModule.register.contentType);
        const metrics = await metricsModule.register.metrics();
        res.end(metrics);
    } catch (error) {
        logger.error('Metrics endpoint error', { error: error.message });
        res.status(500).json({
            error: 'Failed to retrieve metrics',
            message: error.message
        });
    }
});

/**
 * GET /health/readiness
 *
 * Readiness probe for GCP Cloud Run.
 * Checks if application is ready to receive traffic.
 *
 * Returns 200 if:
 * - Server is running
 * - Database connection is healthy
 * - All critical services are available
 */
router.get('/health/readiness', async (req, res) => {
    try {
        const health = await checkReadiness();
        sendHealthResponse(res, health);
    } catch (error) {
        logger.error('Readiness check error', { error: error.message });
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
