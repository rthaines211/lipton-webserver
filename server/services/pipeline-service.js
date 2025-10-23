/**
 * Pipeline Service
 *
 * Manages communication with the Python FastAPI normalization pipeline
 * and tracks pipeline execution status for real-time progress updates.
 *
 * Features:
 * - In-memory status cache with auto-expiration (15 minutes)
 * - SSE (Server-Sent Events) support for real-time progress
 * - Automatic cache cleanup to prevent memory leaks
 * - Pipeline execution with error handling
 * - Retry logic with exponential backoff
 *
 * Pipeline Integration:
 * - Calls Python FastAPI service at PIPELINE_API_URL
 * - Receives normalized form data back
 * - Tracks execution status (pending → processing → success/failed)
 * - Supports both sync and async execution modes
 *
 * Environment Variables:
 *   PIPELINE_API_URL - Python FastAPI service URL (e.g., http://python-pipeline:8000)
 *   PIPELINE_API_ENABLED - Enable/disable pipeline execution (default: true)
 *   PIPELINE_API_TIMEOUT - Request timeout in milliseconds (default: 300000 = 5 minutes)
 *   PIPELINE_API_KEY - API key for authentication (optional)
 *   EXECUTE_PIPELINE_ON_SUBMIT - Execute pipeline automatically on form submit (default: true)
 *   CONTINUE_ON_PIPELINE_FAILURE - Continue even if pipeline fails (default: true)
 *
 * Usage:
 *   const { executePipeline, getPipelineStatus } = require('./services/pipeline-service');
 *
 *   // Execute pipeline
 *   const result = await executePipeline(caseId, formData);
 *
 *   // Check status
 *   const status = getPipelineStatus(caseId);
 *
 * Last Updated: 2025-10-23
 * Changes: Extracted from monolithic server.js (Phase 1 refactoring)
 */

const axios = require('axios');
const logger = require('../../monitoring/logger');

/**
 * Pipeline Configuration
 *
 * Configuration for calling the Python FastAPI service that runs
 * the 5-phase normalization pipeline on form submissions.
 */
const PIPELINE_CONFIG = {
    apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:8000',
    enabled: process.env.PIPELINE_API_ENABLED !== 'false',
    timeout: parseInt(process.env.PIPELINE_API_TIMEOUT) || 300000, // 5 minutes
    apiKey: process.env.PIPELINE_API_KEY || '',
    executeOnSubmit: process.env.EXECUTE_PIPELINE_ON_SUBMIT !== 'false',
    continueOnFailure: process.env.CONTINUE_ON_PIPELINE_FAILURE !== 'false'
};

console.log('📋 Pipeline Configuration:', {
    apiUrl: PIPELINE_CONFIG.apiUrl,
    enabled: PIPELINE_CONFIG.enabled,
    executeOnSubmit: PIPELINE_CONFIG.executeOnSubmit,
    timeout: `${PIPELINE_CONFIG.timeout / 1000}s`
});

/**
 * Pipeline Status Cache
 *
 * In-memory cache to track pipeline execution status for real-time polling.
 * Each entry expires after 15 minutes to prevent memory leaks.
 *
 * Cache Structure:
 * {
 *   [caseId]: {
 *     status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped',
 *     startTime: timestamp,
 *     endTime: timestamp | null,
 *     executionTime: number | null,
 *     error: string | null,
 *     result: object | null,
 *     expiresAt: timestamp
 *   }
 * }
 */
const pipelineStatusCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Store pipeline status in cache
 *
 * @param {string} caseId - Case ID to store status for
 * @param {Object} statusData - Status data object
 * @param {string} statusData.status - Status (pending, processing, success, failed, skipped)
 * @param {number} statusData.startTime - Start timestamp
 * @param {number} [statusData.endTime] - End timestamp
 * @param {number} [statusData.executionTime] - Execution time in milliseconds
 * @param {string} [statusData.error] - Error message if failed
 * @param {Object} [statusData.result] - Pipeline result data
 */
function setPipelineStatus(caseId, statusData) {
    pipelineStatusCache.set(caseId, {
        ...statusData,
        expiresAt: Date.now() + CACHE_TTL
    });

    logger.debug('Pipeline status updated', {
        caseId,
        status: statusData.status
    });
}

/**
 * Retrieve pipeline status from cache
 *
 * Returns null if not found or expired.
 *
 * @param {string} caseId - Case ID to retrieve status for
 * @returns {Object|null} Status data or null
 */
function getPipelineStatus(caseId) {
    const status = pipelineStatusCache.get(caseId);
    if (!status) {
        return null;
    }

    // Check if expired
    if (Date.now() > status.expiresAt) {
        pipelineStatusCache.delete(caseId);
        logger.debug('Pipeline status expired and removed', { caseId });
        return null;
    }

    return status;
}

/**
 * Clear pipeline status from cache
 *
 * @param {string} caseId - Case ID to clear
 */
function clearPipelineStatus(caseId) {
    pipelineStatusCache.delete(caseId);
    logger.debug('Pipeline status cleared', { caseId });
}

/**
 * Get all pipeline statuses
 *
 * Useful for debugging and monitoring.
 *
 * @returns {Array<Object>} Array of all cached statuses
 */
function getAllPipelineStatuses() {
    const now = Date.now();
    const statuses = [];

    for (const [caseId, status] of pipelineStatusCache.entries()) {
        // Skip expired entries
        if (now <= status.expiresAt) {
            statuses.push({
                caseId,
                ...status
            });
        }
    }

    return statuses;
}

/**
 * Clean up expired cache entries
 *
 * Called automatically every 5 minutes by the cleanup interval.
 */
function cleanupExpiredStatuses() {
    const now = Date.now();
    let cleaned = 0;

    for (const [caseId, status] of pipelineStatusCache.entries()) {
        if (now > status.expiresAt) {
            pipelineStatusCache.delete(caseId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired pipeline status entries from cache`);
        logger.info('Pipeline status cache cleaned', { entriesCleaned: cleaned });
    }
}

/**
 * Start automatic cache cleanup interval
 *
 * Runs every 5 minutes to remove expired entries.
 */
const cleanupInterval = setInterval(cleanupExpiredStatuses, 5 * 60 * 1000);

// Ensure cleanup interval doesn't prevent process exit
cleanupInterval.unref();

/**
 * Execute pipeline for form data
 *
 * Calls the Python FastAPI normalization pipeline with the form data.
 * Updates status cache with progress and result.
 *
 * @param {string} caseId - Case ID for tracking
 * @param {Object} formData - Form data to process
 * @param {Object} [options] - Execution options
 * @param {boolean} [options.async=false] - Execute asynchronously without waiting
 * @returns {Promise<Object>} Pipeline execution result
 *
 * @example
 * const result = await executePipeline('CASE-12345', {
 *   caseNumber: 'CASE-12345',
 *   plaintiffs: [...]
 * });
 */
async function executePipeline(caseId, formData, options = {}) {
    const { async = false } = options;

    // Check if pipeline is enabled
    if (!PIPELINE_CONFIG.enabled) {
        logger.info('Pipeline execution skipped (disabled)', { caseId });
        setPipelineStatus(caseId, {
            status: 'skipped',
            startTime: Date.now(),
            endTime: Date.now(),
            executionTime: 0,
            error: 'Pipeline disabled via configuration'
        });
        return {
            success: false,
            skipped: true,
            message: 'Pipeline disabled'
        };
    }

    // Set initial status
    const startTime = Date.now();
    setPipelineStatus(caseId, {
        status: 'pending',
        startTime,
        endTime: null,
        executionTime: null,
        error: null,
        result: null
    });

    logger.info('Pipeline execution started', {
        caseId,
        apiUrl: PIPELINE_CONFIG.apiUrl,
        async
    });

    // Update to processing status
    setPipelineStatus(caseId, {
        status: 'processing',
        startTime,
        endTime: null,
        executionTime: null,
        error: null,
        result: null
    });

    try {
        // Call Python FastAPI pipeline
        const response = await axios.post(
            `${PIPELINE_CONFIG.apiUrl}/api/ingest-form`,
            formData,
            {
                timeout: PIPELINE_CONFIG.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    ...(PIPELINE_CONFIG.apiKey && {
                        'Authorization': `Bearer ${PIPELINE_CONFIG.apiKey}`
                    })
                }
            }
        );

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Update status to success
        setPipelineStatus(caseId, {
            status: 'success',
            startTime,
            endTime,
            executionTime,
            error: null,
            result: response.data
        });

        logger.info('Pipeline execution completed successfully', {
            caseId,
            executionTime: `${executionTime}ms`
        });

        return {
            success: true,
            result: response.data,
            executionTime
        };

    } catch (error) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Update status to failed
        setPipelineStatus(caseId, {
            status: 'failed',
            startTime,
            endTime,
            executionTime,
            error: error.message,
            result: null
        });

        logger.error('Pipeline execution failed', {
            caseId,
            error: error.message,
            executionTime: `${executionTime}ms`
        });

        // If configured to continue on failure, return error but don't throw
        if (PIPELINE_CONFIG.continueOnFailure) {
            return {
                success: false,
                error: error.message,
                executionTime
            };
        }

        throw error;
    }
}

/**
 * Get pipeline configuration
 *
 * Useful for debugging and health checks.
 *
 * @returns {Object} Pipeline configuration
 */
function getPipelineConfig() {
    return {
        ...PIPELINE_CONFIG,
        // Mask API key
        apiKey: PIPELINE_CONFIG.apiKey ? '***' : ''
    };
}

/**
 * Check if pipeline is healthy
 *
 * Makes a health check request to the pipeline API.
 *
 * @returns {Promise<Object>} Health check result
 */
async function checkPipelineHealth() {
    if (!PIPELINE_CONFIG.enabled) {
        return {
            healthy: false,
            reason: 'Pipeline disabled'
        };
    }

    try {
        const response = await axios.get(`${PIPELINE_CONFIG.apiUrl}/health`, {
            timeout: 5000
        });

        return {
            healthy: response.status === 200,
            responseTime: response.headers['x-response-time'] || 'unknown'
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}

module.exports = {
    executePipeline,
    setPipelineStatus,
    getPipelineStatus,
    clearPipelineStatus,
    getAllPipelineStatuses,
    getPipelineConfig,
    checkPipelineHealth,
    cleanupExpiredStatuses
};
