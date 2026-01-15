/**
 * Authentication Middleware
 * Extracted from server.js as part of Week 2 Day 2 refactoring
 *
 * Provides token-based authentication for API endpoints
 */

const logger = require('../monitoring/logger');

// Get auth configuration from environment
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';

/**
 * Middleware to require authentication for protected routes
 *
 * Authentication is skipped for:
 * - Development mode (REQUIRE_AUTH=false)
 * - Health check endpoints (/health/*)
 * - Metrics endpoint (/metrics)
 * - Static assets (.js, .css, images, fonts, etc.)
 *
 * Authentication accepts tokens via:
 * - Query parameter: ?token=xxx
 * - Authorization header: Bearer xxx
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
    // Skip auth in development mode
    if (!REQUIRE_AUTH) {
        return next();
    }

    // Skip auth for health checks and metrics (GCP monitoring needs access)
    if (req.path.startsWith('/health') || req.path === '/metrics') {
        return next();
    }

    // Skip auth for root path (handles redirects to forms)
    if (req.path === '/') {
        return next();
    }

    // Skip auth for form pages - they have their own password authentication
    if (req.path.startsWith('/forms/')) {
        return next();
    }

    // Skip auth for API endpoints used by forms - forms handle their own password authentication
    if (req.path.startsWith('/api/form-entries') ||
        req.path.startsWith('/api/contingency-entries') ||
        req.path.startsWith('/api/pdf/') ||
        req.path.startsWith('/api/pipeline-') ||
        req.path.startsWith('/api/jobs/') ||
        req.path.startsWith('/api/regenerate-documents/')) {
        return next();
    }

    // Skip auth for static assets (JS, CSS, images, fonts, etc.)
    // These files contain no sensitive data and are needed for the browser to render the page
    const staticFileExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.map'
    ];
    const isStaticFile = staticFileExtensions.some(ext => req.path.toLowerCase().endsWith(ext));

    if (isStaticFile) {
        logger.debug('Static asset request bypassing auth', {
            path: req.path,
            ip: req.ip
        });
        return next();
    }

    // Check for token in query string or Authorization header
    const tokenFromQuery = req.query.token;
    const tokenFromHeader = req.headers['authorization']?.replace('Bearer ', '');

    // Validate token
    if (tokenFromQuery === ACCESS_TOKEN || tokenFromHeader === ACCESS_TOKEN) {
        logger.info('Access granted', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return next();
    }

    // Log unauthorized attempt
    logger.warn('Unauthorized access attempt', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        hasToken: !!(tokenFromQuery || tokenFromHeader)
    });

    // Return 401 Unauthorized
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid access token required. Provide token in URL (?token=xxx) or Authorization header (Bearer xxx).'
    });
}

/**
 * Get current authentication configuration
 * @returns {Object} Auth configuration object
 */
function getAuthConfig() {
    return {
        enabled: REQUIRE_AUTH,
        mode: process.env.NODE_ENV,
        tokenConfigured: !!ACCESS_TOKEN
    };
}

module.exports = {
    requireAuth,
    getAuthConfig
};
