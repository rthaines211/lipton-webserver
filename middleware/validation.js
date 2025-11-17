/**
 * Validation Middleware
 *
 * Input validation and sanitization for the intake system.
 * Provides reusable validation functions and middleware for Express routes.
 *
 * @module middleware/validation
 */

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * US Phone number regex (supports various formats)
 * Matches: (555) 123-4567, 555-123-4567, 5551234567, etc.
 */
const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

/**
 * US Zip code regex (5 digits or 5+4 format)
 */
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/**
 * US State abbreviation regex (2 uppercase letters)
 */
const STATE_REGEX = /^[A-Z]{2}$/;

/**
 * Validate email address format
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid.email') // false
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate US phone number format
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid US phone format
 *
 * @example
 * validatePhone('(555) 123-4567') // true
 * validatePhone('555-123-4567') // true
 * validatePhone('invalid') // false
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate US zip code format
 *
 * @param {string} zip - Zip code to validate
 * @returns {boolean} True if valid zip code format
 *
 * @example
 * validateZipCode('90210') // true
 * validateZipCode('90210-1234') // true
 * validateZipCode('9021') // false
 */
function validateZipCode(zip) {
    if (!zip || typeof zip !== 'string') {
        return false;
    }
    return ZIP_REGEX.test(zip.trim());
}

/**
 * Validate US state abbreviation
 *
 * @param {string} state - State abbreviation to validate
 * @returns {boolean} True if valid state abbreviation
 *
 * @example
 * validateState('CA') // true
 * validateState('NY') // true
 * validateState('California') // false
 */
function validateState(state) {
    if (!state || typeof state !== 'string') {
        return false;
    }
    return STATE_REGEX.test(state.trim().toUpperCase());
}

/**
 * Sanitize string input
 *
 * Removes or escapes potentially dangerous characters.
 * - Trims whitespace
 * - Removes null bytes
 * - Optionally strips HTML tags
 *
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} [options.stripHTML=true] - Remove HTML tags
 * @param {number} [options.maxLength] - Maximum length (truncates if exceeded)
 * @returns {string} Sanitized string
 *
 * @example
 * sanitizeString('<script>alert("xss")</script>Hello') // 'Hello'
 * sanitizeString('  test  ') // 'test'
 */
function sanitizeString(input, options = {}) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Strip HTML if requested (default: true)
    if (options.stripHTML !== false) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Truncate if max length specified
    if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
}

/**
 * Middleware to validate required fields
 *
 * Checks that specified fields exist and are not empty in req.body.
 * Returns 400 error with field details if validation fails.
 *
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/intake/submit',
 *   validateRequired(['email', 'firstName', 'lastName']),
 *   async (req, res) => {
 *     // Fields are guaranteed to exist here
 *     const { email, firstName, lastName } = req.body;
 *     // ...
 *   }
 * );
 */
function validateRequired(requiredFields) {
    return (req, res, next) => {
        const errors = [];

        for (const field of requiredFields) {
            const value = req.body[field];

            // Check if field exists and has a value
            if (value === undefined || value === null || value === '') {
                errors.push({
                    field,
                    message: `${field} is required`
                });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    statusCode: 400,
                    fields: errors
                }
            });
        }

        next();
    };
}

/**
 * Middleware to validate email field
 *
 * Checks that specified field contains a valid email address.
 * Returns 400 error if validation fails.
 *
 * @param {string} fieldName - Name of field to validate (default: 'email')
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/intake/submit',
 *   validateEmailField('client_email'),
 *   async (req, res) => {
 *     // Email is guaranteed to be valid here
 *     const { client_email } = req.body;
 *     // ...
 *   }
 * );
 */
function validateEmailField(fieldName = 'email') {
    return (req, res, next) => {
        const email = req.body[fieldName];

        if (!email) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    statusCode: 400,
                    field: fieldName,
                    details: `${fieldName} is required`
                }
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    statusCode: 400,
                    field: fieldName,
                    details: `${fieldName} must be a valid email address`
                }
            });
        }

        next();
    };
}

/**
 * Middleware to sanitize all string inputs in req.body
 *
 * Recursively sanitizes all string values in the request body.
 * Modifies req.body in place.
 *
 * @param {Object} options - Sanitization options (passed to sanitizeString)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/intake/submit',
 *   sanitizeInput({ stripHTML: true, maxLength: 1000 }),
 *   async (req, res) => {
 *     // All string values in req.body are now sanitized
 *     // ...
 *   }
 * );
 */
function sanitizeInput(options = {}) {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, options);
        }
        next();
    };
}

/**
 * Recursively sanitize all string values in an object
 *
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 * @private
 */
function sanitizeObject(obj, options) {
    if (Array.isArray(obj)) {
        return obj.map(item => {
            if (typeof item === 'object' && item !== null) {
                return sanitizeObject(item, options);
            } else if (typeof item === 'string') {
                return sanitizeString(item, options);
            }
            return item;
        });
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value, options);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, options);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Create a custom validation middleware
 *
 * @param {Function} validatorFn - Validation function that returns true/false
 * @param {string} errorMessage - Error message if validation fails
 * @param {string} fieldName - Field name being validated
 * @returns {Function} Express middleware function
 *
 * @example
 * const validateAge = createValidator(
 *   (value) => value >= 18,
 *   'Must be 18 or older',
 *   'age'
 * );
 *
 * router.post('/signup', validateAge, async (req, res) => {
 *   // Age is guaranteed to be >= 18
 * });
 */
function createValidator(validatorFn, errorMessage, fieldName) {
    return (req, res, next) => {
        const value = req.body[fieldName];

        if (!validatorFn(value)) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    statusCode: 400,
                    field: fieldName,
                    details: errorMessage
                }
            });
        }

        next();
    };
}

module.exports = {
    // Validation functions
    validateEmail,
    validatePhone,
    validateZipCode,
    validateState,

    // Sanitization functions
    sanitizeString,

    // Middleware
    validateRequired,
    validateEmailField,
    sanitizeInput,
    createValidator
};
