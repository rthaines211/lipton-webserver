/**
 * Base Application Error Class
 *
 * Custom error hierarchy for consistent error handling across the application.
 * All application errors should extend this class.
 *
 * Features:
 * - HTTP status code mapping
 * - Error code for client identification
 * - isOperational flag for error categorization
 * - Stack trace preservation
 * - Metadata attachment
 *
 * @module errors/AppError
 */

/**
 * Base Application Error
 * @extends Error
 */
class AppError extends Error {
    /**
     * Create an application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} errorCode - Machine-readable error code
     * @param {Object} metadata - Additional error data
     */
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', metadata = {}) {
        super(message);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Operational errors are expected errors
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON for API responses
     * @returns {Object}
     */
    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                code: this.errorCode,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
                ...this.metadata
            }
        };
    }
}

/**
 * 400 Bad Request - Invalid client input
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR', { field });
    }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * 403 Forbidden - Valid auth but insufficient permissions
 */
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * 404 Not Found - Resource not found
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource', id = null) {
        const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', { resource, id });
    }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
class ConflictError extends AppError {
    constructor(message, resource = null) {
        super(message, 409, 'CONFLICT', { resource });
    }
}

/**
 * 422 Unprocessable Entity - Valid syntax but semantic errors
 */
class UnprocessableEntityError extends AppError {
    constructor(message, errors = []) {
        super(message, 422, 'UNPROCESSABLE_ENTITY', { errors });
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = 60) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
class InternalError extends AppError {
    constructor(message = 'Internal server error', originalError = null) {
        super(message, 500, 'INTERNAL_ERROR');

        if (originalError) {
            this.originalError = originalError;
            this.metadata.originalMessage = originalError.message;
        }
    }
}

/**
 * 503 Service Unavailable - External service unavailable
 */
class ServiceUnavailableError extends AppError {
    constructor(service, message = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE', { service });
    }
}

/**
 * 502 Bad Gateway - External service returned error
 */
class BadGatewayError extends AppError {
    constructor(service, message = 'Bad gateway', response = null) {
        super(message, 502, 'BAD_GATEWAY', { service, response });
    }
}

/**
 * 504 Gateway Timeout - External service timeout
 */
class GatewayTimeoutError extends AppError {
    constructor(service, timeout, message = 'Gateway timeout') {
        super(message, 504, 'GATEWAY_TIMEOUT', { service, timeout });
    }
}

/**
 * Database-specific errors
 */
class DatabaseError extends AppError {
    constructor(message, operation = null, originalError = null) {
        super(message, 500, 'DATABASE_ERROR', { operation });

        if (originalError) {
            this.originalError = originalError;
            this.metadata.originalMessage = originalError.message;
            this.metadata.code = originalError.code; // PostgreSQL error code
        }
    }
}

/**
 * File system errors
 */
class FileSystemError extends AppError {
    constructor(message, path = null, operation = null) {
        super(message, 500, 'FILE_SYSTEM_ERROR', { path, operation });
    }
}

/**
 * External API errors
 */
class ExternalAPIError extends AppError {
    constructor(service, message, statusCode = 500, response = null) {
        super(
            `${service} API error: ${message}`,
            statusCode,
            'EXTERNAL_API_ERROR',
            { service, response }
        );
    }
}

/**
 * Check if error is operational (expected) vs programming error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

module.exports = {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    UnprocessableEntityError,
    RateLimitError,
    InternalError,
    ServiceUnavailableError,
    BadGatewayError,
    GatewayTimeoutError,
    DatabaseError,
    FileSystemError,
    ExternalAPIError,
    isOperationalError
};
