/**
 * Domain Restriction Middleware
 *
 * Enforces that each subdomain can only access its intended form:
 * - docs.liptonlegal.com → can only access /forms/docs/
 * - agreement.liptonlegal.com → can only access /forms/agreement/
 */

const logger = require('../monitoring/logger');

/**
 * Middleware to restrict form access based on domain
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function restrictFormAccess(req, res, next) {
    const hostname = req.hostname || req.headers.host || '';
    const path = req.path;

    // Only enforce restrictions on form routes
    if (!path.startsWith('/forms/')) {
        return next();
    }

    // Check if docs domain is trying to access agreement form
    if (hostname.includes('docs.liptonlegal.com') && path.startsWith('/forms/agreement')) {
        logger.warn('Domain restriction: docs domain attempted to access agreement form', {
            hostname,
            path,
            ip: req.ip
        });
        return res.status(403).json({
            error: 'Access Denied',
            message: 'This form is not available on this domain. Please visit agreement.liptonlegal.com'
        });
    }

    // Check if agreement domain is trying to access docs form
    if (hostname.includes('agreement.liptonlegal.com') && path.startsWith('/forms/docs')) {
        logger.warn('Domain restriction: agreement domain attempted to access docs form', {
            hostname,
            path,
            ip: req.ip
        });
        return res.status(403).json({
            error: 'Access Denied',
            message: 'This form is not available on this domain. Please visit docs.liptonlegal.com'
        });
    }

    // Allow access
    next();
}

module.exports = {
    restrictFormAccess
};
