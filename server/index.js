/**
 * Legal Form Application - Main Server Entry Point
 *
 * This is the new modular entry point that replaces the monolithic server.js.
 * It orchestrates all the extracted modules while maintaining identical behavior.
 *
 * Module Structure:
 * - middleware/auth.js: Authentication and access control
 * - routes/form-routes.js: Form submission endpoints
 * - routes/health-routes.js: Health check endpoints for GCP
 * - services/database-service.js: PostgreSQL connection pool
 * - services/transformation-service.js: Form data transformation logic
 * - services/dropbox-service.js: Dropbox integration
 *
 * GCP Cloud Run Compatibility:
 * - Listens on process.env.PORT (Cloud Run requirement)
 * - Uses Unix socket for Cloud SQL connection
 * - Supports Secret Manager for credentials
 * - Health checks exposed for GCP monitoring
 *
 * Last Updated: 2025-10-23
 * Changes: Phase 1 Refactoring - Module decomposition from monolithic server.js
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

// Monitoring and metrics
const { metricsMiddleware } = require('../monitoring/middleware');

// Logging
const logger = require('../monitoring/logger');
const {
    requestLoggingMiddleware,
    errorLoggingMiddleware
} = require('../monitoring/log-middleware');

// Middleware
const { requireAuth } = require('./middleware/auth');

// Routes
const formRoutes = require('./routes/form-routes');
const healthRoutes = require('./routes/health-routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Legal Form Application...');
console.log('📋 Environment:', {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: PORT,
    authEnabled: process.env.NODE_ENV === 'production'
});

// ============================================================================
// MIDDLEWARE SETUP (order matters!)
// ============================================================================

// 1. CORS - Allow cross-origin requests
app.use(cors());

// 2. Winston structured logging (must be early in middleware chain)
app.use(requestLoggingMiddleware);

// 3. Prometheus metrics collection (must be early in middleware chain)
app.use(metricsMiddleware);

// 4. Gzip/Brotli compression for all responses
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// 5. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 6. HTTP caching headers for static assets
app.use((req, res, next) => {
    // Cache static assets for 1 year (immutable)
    if (req.url.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf|eot|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    }
    // Cache HTML for 5 minutes with revalidation
    else if (req.url.endsWith('.html') || req.url === '/') {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
    // No cache for API endpoints (always get fresh data)
    else if (req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// 7. Authentication middleware (handles token validation, skips health checks)
app.use(requireAuth);

// 8. Serve static files (HTML, CSS, JS) - only after auth passes
// IMPORTANT: This serves from parent directory (__dirname is /app/server in Docker)
app.use(express.static(path.join(__dirname, '..')));

// ============================================================================
// ROUTES
// ============================================================================

// Health check routes (for GCP Cloud Run monitoring)
app.use('/', healthRoutes);

// Form submission routes
app.use('/api', formRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Error logging middleware (must be after all routes)
app.use(errorLoggingMiddleware);

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    logger.warn('404 Not Found', {
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /health/detailed',
            'GET /api/health/db',
            'POST /api/form-entries',
            'GET /api/form-entries',
            'DELETE /api/form-entries/:id'
        ]
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
    console.log('');
    console.log('✅ Server started successfully');
    console.log('');
    console.log('📡 Server Information:');
    console.log(`   🌐 URL: http://localhost:${PORT}`);
    console.log(`   🔒 Auth: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   💾 Database: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'legal_forms_db'}`);
    console.log('');
    console.log('📊 Endpoints:');
    console.log(`   🏠 Home: http://localhost:${PORT}/`);
    console.log(`   ❤️  Health: http://localhost:${PORT}/health`);
    console.log(`   📝 Forms API: http://localhost:${PORT}/api/form-entries`);
    console.log(`   📊 Metrics: http://localhost:${PORT}/metrics`);
    console.log('');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

// Handle shutdown signals gracefully (important for Cloud Run)
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
    process.exit(1);
});

module.exports = app;  // Export for testing
