/**
 * Metrics Routes
 * Extracted from server.js as part of Week 2 Day 4 refactoring
 *
 * Provides Prometheus metrics endpoint for monitoring and observability.
 *
 * @module routes/metrics
 */

const express = require('express');
const router = express.Router();
const metricsModule = require('../monitoring/metrics');

/**
 * GET /metrics
 * Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format for scraping.
 * This endpoint is used by Prometheus server to collect metrics.
 *
 * Metrics include:
 * - HTTP request rates, latencies, and error rates
 * - Form submission statistics
 * - Pipeline execution metrics
 * - Database performance metrics
 * - Dropbox upload statistics
 * - Node.js runtime metrics (memory, CPU, event loop)
 */
router.get('/', async (req, res) => {
    try {
        res.set('Content-Type', metricsModule.register.contentType);
        const metrics = await metricsModule.register.metrics();
        res.end(metrics);
    } catch (error) {
        console.error('❌ Error generating metrics:', error);
        res.status(500).end('Error generating metrics');
    }
});

module.exports = router;
