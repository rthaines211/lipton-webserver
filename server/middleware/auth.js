/**
 * Authentication Middleware
 *
 * Token-based authentication for the Legal Form Application.
 * Secures all routes except health checks and static assets.
 *
 * Authentication Methods:
 * 1. Query Parameter: ?token=xxx
 * 2. Authorization Header: Bearer xxx
 *
 * Bypassed For:
 * - Development mode (NODE_ENV !== 'production')
 * - Health check endpoints (/health, /metrics)
 * - Static assets (.js, .css, images, fonts)
 *
 * Usage:
 *   const { requireAuth } = require('./middleware/auth');
 *   app.use(requireAuth);
 *
 * Environment Variables:
 *   ACCESS_TOKEN - The secret token for authentication
 *   NODE_ENV - Environment (development/staging/production)
 *
 * Last Updated: 2025-10-23
 * Changes: Extracted from monolithic server.js (Phase 1 refactoring)
 */

const logger = require('../../monitoring/logger');

// Access control configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const REQUIRE_AUTH = process.env.NODE_ENV === 'production';

// Log authentication configuration on module load
console.log('🔒 Access Control:', {
    enabled: REQUIRE_AUTH,
    mode: process.env.NODE_ENV || 'development',
    tokenConfigured: !!ACCESS_TOKEN
});

/**
 * Authentication Middleware Function
 *
 * Validates access token from query string or Authorization header.
 * Blocks unauthorized requests with 401 status.
 *
 * Static assets (JS, CSS, images, fonts) are excluded from authentication
 * since they contain no sensitive data and are required for the application
 * to function properly.
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
 * Optional: Check if authentication is enabled
 * Useful for conditional logic in routes
 *
 * @returns {boolean} True if authentication is required
 */
function isAuthEnabled() {
    return REQUIRE_AUTH;
}

/**
 * Optional: Validate token without middleware
 * Useful for programmatic token validation
 *
 * @param {string} token - Token to validate
 * @returns {boolean} True if token is valid
 */
function validateToken(token) {
    return token === ACCESS_TOKEN;
}

module.exports = {
    requireAuth,
    isAuthEnabled,
    validateToken
};
