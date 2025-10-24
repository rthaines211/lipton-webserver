/**
 * Email Service Module
 *
 * Handles all email notification functionality using SendGrid.
 * Provides reliable email delivery with retry logic and comprehensive error handling.
 *
 * Features:
 * - SendGrid integration for transactional emails
 * - Automatic retry with exponential backoff
 * - Email validation
 * - Graceful error handling (never throws, always returns status)
 * - Winston logging integration
 * - Environment-based configuration
 *
 * Usage:
 *   const emailService = require('./email-service');
 *
 *   const result = await emailService.sendCompletionNotification({
 *     to: 'user@example.com',
 *     name: 'John Doe',
 *     streetAddress: '123 Main Street',
 *     caseId: 12345,
 *     dropboxLink: 'https://www.dropbox.com/...',
 *     documentCount: 32
 *   });
 *
 * @module email-service
 * @requires @sendgrid/mail
 * @requires ./email-templates
 * @requires ./monitoring/logger
 */

const sgMail = require('@sendgrid/mail');
const emailTemplates = require('./email-templates');

// Try to load logger, fallback to console if not available
let logger;
try {
    logger = require('./monitoring/logger');
} catch (error) {
    // Fallback to console if logger not available
    logger = {
        info: console.log,
        error: console.error,
        warn: console.warn
    };
}

/**
 * Email Service Configuration
 * Loaded from environment variables with sensible defaults
 */
const CONFIG = {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'notifications@liptonlegal.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Lipton Legal',
    enabled: process.env.EMAIL_ENABLED !== 'false', // Enabled by default
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10)
};

// Initialize SendGrid with API key
let initialized = false;

/**
 * Initialize SendGrid client with API key
 * Called automatically on first use
 * @private
 */
function initialize() {
    if (initialized) return;

    if (!CONFIG.apiKey) {
        logger.warn('⚠️  SendGrid API key not configured. Email service will be disabled.');
        CONFIG.enabled = false;
        return;
    }

    try {
        sgMail.setApiKey(CONFIG.apiKey);
        initialized = true;
        logger.info('✅ Email service initialized with SendGrid');
        logger.info(`   From: ${CONFIG.fromName} <${CONFIG.fromAddress}>`);
        logger.info(`   Max Retries: ${CONFIG.maxRetries}`);
    } catch (error) {
        logger.error('❌ Failed to initialize SendGrid:', error);
        CONFIG.enabled = false;
    }
}

/**
 * Check if email service is enabled and properly configured
 * @returns {boolean} True if email service is ready to use
 */
function isEnabled() {
    return CONFIG.enabled && CONFIG.apiKey && CONFIG.apiKey.length > 0;
}

/**
 * Validate email address format
 * Uses a comprehensive regex pattern that handles most valid email formats
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Comprehensive email validation regex
    // Handles: user@example.com, user+tag@example.com, user.name@example.co.uk
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Sleep utility for retry delays
 * @private
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send email with retry logic
 * Implements exponential backoff: 1s, 2s, 4s, 8s...
 *
 * @private
 * @param {Object} emailData - SendGrid email object
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendWithRetry(emailData, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Attempt to send email
            const response = await sgMail.send(emailData);

            // Success!
            logger.info(`✅ Email sent successfully to ${emailData.to} (attempt ${attempt + 1})`);

            return {
                success: true,
                messageId: response[0]?.headers['x-message-id'],
                statusCode: response[0]?.statusCode
            };

        } catch (error) {
            lastError = error;

            // Log the attempt failure
            const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
            logger.warn(`⚠️  Email send attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}`);

            // If this was the last attempt, don't retry
            if (attempt >= maxRetries) {
                break;
            }

            // Calculate exponential backoff delay: 1s, 2s, 4s, 8s...
            const delay = CONFIG.retryDelay * Math.pow(2, attempt);
            logger.info(`   Retrying in ${delay}ms...`);

            await sleep(delay);
        }
    }

    // All retries exhausted
    const finalError = lastError?.response?.body?.errors?.[0]?.message || lastError?.message || 'Unknown error';
    logger.error(`❌ Email send failed after ${maxRetries + 1} attempts: ${finalError}`);

    return {
        success: false,
        error: finalError
    };
}

/**
 * Send completion notification email to user
 *
 * This is the main function to call when documents are ready.
 * Sends a professional HTML email with document completion notification.
 *
 * @param {Object} options - Email notification options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient name (e.g., "John Doe")
 * @param {string} options.streetAddress - Property address (e.g., "123 Main Street")
 * @param {number} options.caseId - Case ID for reference
 * @param {string|null} options.dropboxLink - Dropbox shared link (optional, null for fallback)
 * @param {number} options.documentCount - Number of documents generated
 * @returns {Promise<{success: boolean, error?: string}>}
 *
 * @example
 * const result = await sendCompletionNotification({
 *   to: 'user@example.com',
 *   name: 'John Doe',
 *   streetAddress: '123 Main Street',
 *   caseId: 12345,
 *   dropboxLink: 'https://www.dropbox.com/...',
 *   documentCount: 32
 * });
 *
 * if (result.success) {
 *   console.log('Email sent!');
 * } else {
 *   console.error('Email failed:', result.error);
 * }
 */
async function sendCompletionNotification(options) {
    // Ensure SendGrid is initialized
    if (!initialized) {
        initialize();
    }

    // Check if email service is enabled
    if (!isEnabled()) {
        logger.warn('⚠️  Email service is disabled. Skipping email notification.');
        return {
            success: false,
            error: 'Email service is disabled'
        };
    }

    // Validate required parameters
    if (!options || typeof options !== 'object') {
        logger.error('❌ Invalid options provided to sendCompletionNotification');
        return {
            success: false,
            error: 'Invalid options'
        };
    }

    const { to, name, streetAddress, caseId, dropboxLink, documentCount } = options;

    // Validate recipient email
    if (!validateEmail(to)) {
        logger.error(`❌ Invalid email address: ${to}`);
        return {
            success: false,
            error: 'Invalid email address'
        };
    }

    // Log email sending attempt
    logger.info('📧 Preparing to send completion notification');
    logger.info(`   To: ${to}`);
    logger.info(`   Name: ${name || 'User'}`);
    logger.info(`   Address: ${streetAddress}`);
    logger.info(`   Case ID: ${caseId}`);
    logger.info(`   Documents: ${documentCount}`);
    logger.info(`   Dropbox Link: ${dropboxLink ? 'Yes' : 'No (fallback)'}`);

    try {
        // Get email template (with or without Dropbox link)
        const template = dropboxLink
            ? emailTemplates.getCompletionEmailTemplate({
                  name: name || 'User',
                  streetAddress: streetAddress,
                  documentCount: documentCount,
                  dropboxLink: dropboxLink
              })
            : emailTemplates.getCompletionEmailTemplateNoLink({
                  name: name || 'User',
                  streetAddress: streetAddress,
                  documentCount: documentCount
              });

        // Construct SendGrid email object
        const emailData = {
            to: to.trim(),
            from: {
                email: CONFIG.fromAddress,
                name: CONFIG.fromName
            },
            subject: template.subject,
            text: template.text,
            html: template.html
        };

        // Send email with retry logic
        const result = await sendWithRetry(emailData, CONFIG.maxRetries);

        return result;

    } catch (error) {
        logger.error('❌ Unexpected error in sendCompletionNotification:', error);
        return {
            success: false,
            error: error.message || 'Unexpected error'
        };
    }
}

/**
 * Get current email service configuration (for debugging)
 * @returns {Object} Current configuration (with API key redacted)
 */
function getConfig() {
    return {
        enabled: CONFIG.enabled,
        fromAddress: CONFIG.fromAddress,
        fromName: CONFIG.fromName,
        maxRetries: CONFIG.maxRetries,
        retryDelay: CONFIG.retryDelay,
        apiKeyConfigured: CONFIG.apiKey && CONFIG.apiKey.length > 0,
        initialized: initialized
    };
}

// Export public functions
module.exports = {
    sendCompletionNotification,
    isEnabled,
    validateEmail,
    getConfig
};
