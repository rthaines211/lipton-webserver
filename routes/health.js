/**
 * Health Check Routes
 *
 * Extracted from server.js for modularity.
 * Provides three levels of health checks:
 * 1. /health or /api/health - Liveness probe (is app running?)
 * 2. /health/ready - Readiness probe (is app ready for traffic?)
 * 3. /health/detailed - Full diagnostics (all components)
 *
 * @module routes/health
 */

const express = require('express');
const router = express.Router();
const db = require('../services/database');
const logger = require('../monitoring/logger');
const {
    checkLiveness,
    checkReadiness,
    checkDetailed,
    sendHealthResponse
} = require('../monitoring/health-checks');

/**
 * Liveness Probe - Basic health check
 *
 * GET /health or GET /api/health
 *
 * Used by: Kubernetes liveness probes, basic monitoring
 * Always returns 200 if the process is running
 */
router.get(['/', '/api/health'], async (req, res) => {
    try {
        const health = await checkLiveness();
        sendHealthResponse(res, health);
    } catch (error) {
        logger.error('Liveness check failed', { error: error.message });
        res.status(500).json({
            status: 'unhealthy',
            error: 'Liveness check failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Readiness Probe - Dependency health check
 *
 * GET /health/ready
 *
 * Used by: Kubernetes readiness probes, load balancers
 * Returns 200 only if critical dependencies (database) are healthy
 */
router.get('/ready', async (req, res) => {
    try {
        const health = await checkReadiness(db.pool, {
            checkExternalServices: false // Don't check optional services for readiness
        });

        sendHealthResponse(res, health);

        // Log if unhealthy
        if (health.status === 'unhealthy') {
            logger.warn('Readiness check failed', {
                errors: health.errors,
                checks: health.checks
            });
        }
    } catch (error) {
        logger.error('Readiness check failed', { error: error.message });
        res.status(503).json({
            status: 'unhealthy',
            error: 'Readiness check failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Detailed Health Check - Full diagnostics
 *
 * GET /health/detailed
 *
 * Used by: Debugging, monitoring dashboards, ops teams
 * Returns comprehensive health information for all components
 */
router.get('/detailed', async (req, res) => {
    try {
        // Get pipeline config from environment
        const PIPELINE_CONFIG = {
            enabled: process.env.PIPELINE_API_ENABLED === 'true',
            apiUrl: process.env.PIPELINE_API_URL
        };

        const health = await checkDetailed(db.pool, {
            pipelineApiUrl: PIPELINE_CONFIG.enabled ? PIPELINE_CONFIG.apiUrl : null,
            dropboxEnabled: process.env.DROPBOX_ENABLED === 'true'
        });

        sendHealthResponse(res, health);

        // Log warnings and errors
        if (health.warnings && health.warnings.length > 0) {
            logger.warn('Health check warnings detected', {
                warnings: health.warnings
            });
        }

        if (health.errors && health.errors.length > 0) {
            logger.error('Health check errors detected', {
                errors: health.errors
            });
        }
    } catch (error) {
        logger.error('Detailed health check failed', { error: error.message });
        res.status(500).json({
            status: 'unhealthy',
            error: 'Detailed health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
