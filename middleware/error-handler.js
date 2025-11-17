/**
 * Error Handler Middleware
 *
 * Centralized error handling for the application.
 * Catches all errors and returns consistent, safe error responses.
 *
 * @module middleware/error-handler
 */

const logger = require('../monitoring/logger');

/**
 * Error types and their HTTP status codes
 */
const ERROR_TYPES = {
    ValidationError: 400,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    NotFoundError: 404,
    ConflictError: 409,
    DatabaseError: 503,
    ExternalServiceError: 503
};

/**
 * Main Error Handler Middleware
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    // Determine status code based on error type or use 500 as default
    const statusCode = err.statusCode || ERROR_TYPES[err.name] || 500;

    // Determine if we should expose error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isClientError = statusCode >= 400 && statusCode < 500;

    // Build error response
    const errorResponse = {
        error: {
            message: err.message || 'An unexpected error occurred',
            code: err.code || 'INTERNAL_ERROR',
            statusCode: statusCode
        }
    };

    // Add error details in development or for client errors
    if (isDevelopment || isClientError) {
        if (err.details) {
            errorResponse.error.details = err.details;
        }
        if (err.field) {
            errorResponse.error.field = err.field;
        }
        if (err.fields) {
            errorResponse.error.fields = err.fields;
        }
    }

    // Add stack trace only in development
    if (isDevelopment && err.stack) {
        errorResponse.error.stack = err.stack.split('\n');
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.error.requestId = req.id;
    }

    // Log the error with appropriate level
    const logData = {
        message: err.message,
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        error: {
            name: err.name,
            code: err.code,
            stack: err.stack
        }
    };

    if (statusCode >= 500) {
        logger.error('Server error', logData);
    } else if (statusCode >= 400) {
        logger.warn('Client error', logData);
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * Helper to create validation errors
 *
 * @param {string} message - Error message
 * @param {Object} fields - Field-specific errors
 * @returns {Error} Validation error object
 *
 * @example
 * throw createValidationError('Invalid form data', {
 *   email: 'Email is required',
 *   phone: 'Invalid phone format'
 * });
 */
function createValidationError(message, fields) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.fields = fields;
    error.statusCode = 400;
    return error;
}

/**
 * Helper to create not found errors
 *
 * @param {string} resource - Resource that wasn't found
 * @returns {Error} Not found error object
 *
 * @example
 * throw createNotFoundError('Intake submission');
 */
function createNotFoundError(resource) {
    const error = new Error(`${resource} not found`);
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    return error;
}

/**
 * Helper to create unauthorized errors
 *
 * @param {string} message - Error message
 * @returns {Error} Unauthorized error object
 */
function createUnauthorizedError(message = 'Authentication required') {
    const error = new Error(message);
    error.name = 'UnauthorizedError';
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}

/**
 * Helper to create database errors
 *
 * @param {string} message - Error message
 * @param {Error} originalError - Original database error
 * @returns {Error} Database error object
 */
function createDatabaseError(message, originalError) {
    const error = new Error(message);
    error.name = 'DatabaseError';
    error.statusCode = 503;
    error.code = 'DATABASE_ERROR';
    if (originalError) {
        error.details = originalError.message;
    }
    return error;
}

/**
 * Async error wrapper
 *
 * Wraps async route handlers to catch errors and pass to error handler
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 *
 * @example
 * router.get('/intake/:id', asyncHandler(async (req, res) => {
 *   const intake = await IntakeService.getIntakeById(req.params.id);
 *   res.json(intake);
 * }));
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    createValidationError,
    createNotFoundError,
    createUnauthorizedError,
    createDatabaseError,
    asyncHandler
};
