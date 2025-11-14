/**
 * Server-Sent Events (SSE) Service
 *
 * Centralized service for managing SSE connections and broadcasting events
 * across different features (pipeline, PDF generation, etc.)
 *
 * Features:
 * - In-memory status cache with auto-expiration
 * - Multi-namespace support (pipeline, pdf, etc.)
 * - Automatic cache cleanup
 * - Real-time progress updates
 * - Connection management
 *
 * Namespaces:
 * - 'pipeline': Python normalization pipeline progress
 * - 'pdf': PDF generation and Dropbox upload progress
 *
 * Usage:
 *   const { updateStatus, getStatus, sendSSEMessage } = require('./services/sse-service');
 *
 *   // Update status
 *   updateStatus('pdf', jobId, {
 *     status: 'processing',
 *     phase: 'generating',
 *     progress: 50,
 *     message: 'Filling PDF fields...'
 *   });
 *
 *   // Send SSE message to client
 *   sendSSEMessage(res, 'progress', { phase: 'uploading', progress: 75 });
 *
 * Last Updated: 2025-11-12
 * Created for: PDF Form Filling Feature (001-pdf-form-filling)
 */

const logger = require('../../monitoring/logger');

/**
 * SSE Status Cache
 *
 * Multi-namespace cache to track progress across different features.
 * Each entry expires after 15 minutes to prevent memory leaks.
 *
 * Cache Structure:
 * {
 *   [namespace]: {
 *     [jobId]: {
 *       status: 'pending' | 'processing' | 'success' | 'failed',
 *       phase: string,
 *       progress: number (0-100),
 *       message: string,
 *       startTime: timestamp,
 *       endTime: timestamp | null,
 *       error: string | null,
 *       result: object | null,
 *       expiresAt: timestamp
 *     }
 *   }
 * }
 */
const statusCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Initialize namespace if it doesn't exist
 * @param {string} namespace - Namespace (e.g., 'pipeline', 'pdf')
 */
function ensureNamespace(namespace) {
  if (!statusCache.has(namespace)) {
    statusCache.set(namespace, new Map());
  }
}

/**
 * Update status for a job in a specific namespace
 *
 * @param {string} namespace - Namespace (e.g., 'pdf', 'pipeline')
 * @param {string} jobId - Job ID
 * @param {Object} statusData - Status update data
 * @param {string} statusData.status - Status (pending, processing, success, failed)
 * @param {string} [statusData.phase] - Current phase description
 * @param {number} [statusData.progress] - Progress percentage (0-100)
 * @param {string} [statusData.message] - Status message
 * @param {string} [statusData.error] - Error message if failed
 * @param {Object} [statusData.result] - Result data if completed
 */
function updateStatus(namespace, jobId, statusData) {
  ensureNamespace(namespace);

  const namespaceCache = statusCache.get(namespace);
  const existing = namespaceCache.get(jobId) || {};

  const updated = {
    ...existing,
    ...statusData,
    updatedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL
  };

  // Set startTime if this is the first update
  if (!existing.startTime) {
    updated.startTime = Date.now();
  }

  // Set endTime if status is terminal (success or failed)
  if ((statusData.status === 'success' || statusData.status === 'failed') && !updated.endTime) {
    updated.endTime = Date.now();
    updated.executionTime = updated.endTime - updated.startTime;
  }

  namespaceCache.set(jobId, updated);

  logger.debug('SSE status updated', {
    namespace,
    jobId,
    status: statusData.status,
    phase: statusData.phase,
    progress: statusData.progress
  });
}

/**
 * Get status for a job from a specific namespace
 *
 * @param {string} namespace - Namespace (e.g., 'pdf', 'pipeline')
 * @param {string} jobId - Job ID
 * @returns {Object|null} Status object or null if not found
 */
function getStatus(namespace, jobId) {
  const namespaceCache = statusCache.get(namespace);
  if (!namespaceCache) return null;

  const status = namespaceCache.get(jobId);
  if (!status) return null;

  // Check if expired
  if (status.expiresAt && Date.now() > status.expiresAt) {
    namespaceCache.delete(jobId);
    return null;
  }

  return status;
}

/**
 * Delete status for a job
 *
 * @param {string} namespace - Namespace
 * @param {string} jobId - Job ID
 */
function deleteStatus(namespace, jobId) {
  const namespaceCache = statusCache.get(namespace);
  if (namespaceCache) {
    namespaceCache.delete(jobId);
    logger.debug('SSE status deleted', { namespace, jobId });
  }
}

/**
 * Send an SSE message to the client
 *
 * @param {Object} res - Express response object
 * @param {string} event - Event type (e.g., 'progress', 'complete', 'error')
 * @param {Object} data - Event data
 * @param {boolean} [flush=true] - Whether to force flush immediately
 */
function sendSSEMessage(res, event, data, flush = true) {
  try {
    // Check if response is still writable
    if (res.writableEnded || res.finished) {
      logger.warn('Attempted to write to closed SSE connection');
      return false;
    }

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    // Force flush to prevent buffering
    if (flush) {
      if (res.flush) {
        res.flush();
      }
      if (res.socket && !res.socket.destroyed) {
        res.socket.uncork();
        res.socket.cork();
      }
    }

    return true;
  } catch (error) {
    logger.error('Error sending SSE message', {
      event,
      error: error.message
    });
    return false;
  }
}

/**
 * Setup SSE connection with standard headers
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} namespace - Namespace for this connection
 * @param {string} jobId - Job ID
 * @returns {Object} Connection utilities (sendProgress, cleanup)
 */
function setupSSEConnection(req, res, namespace, jobId) {
  let completeSent = false;
  let interval = null;
  let heartbeat = null;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  });

  logger.info('SSE connection established', { namespace, jobId });

  // Check if job exists
  const initialStatus = getStatus(namespace, jobId);

  // If no status found, send completion and close
  if (!initialStatus) {
    sendSSEMessage(res, 'complete', {
      jobId,
      status: 'complete',
      message: 'Job completed or not found',
      progress: 100
    });

    setTimeout(() => res.end(), 100);
    return null;
  }

  // Send initial connection event
  sendSSEMessage(res, 'open', {
    status: 'connected',
    jobId,
    namespace
  });

  /**
   * Send progress update
   */
  const sendProgress = () => {
    if (completeSent) return;

    const status = getStatus(namespace, jobId);
    if (!status) return;

    const event = status.status === 'success' ? 'complete' :
                 status.status === 'failed' ? 'error' : 'progress';

    sendSSEMessage(res, event, {
      jobId,
      status: status.status,
      phase: status.phase,
      progress: status.progress || 0,
      message: status.message,
      error: status.error,
      result: status.result
    });

    // Mark complete if terminal status
    if (event === 'complete' || event === 'error') {
      completeSent = true;
      cleanup();
    }
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    // Close connection after brief delay
    setTimeout(() => {
      if (!res.writableEnded) {
        res.end();
      }
    }, 100);

    logger.info('SSE connection closed', { namespace, jobId });
  };

  // Start polling for updates
  interval = setInterval(sendProgress, 500); // Poll every 500ms

  // Send heartbeat every 15 seconds to keep connection alive
  heartbeat = setInterval(() => {
    if (!completeSent && !res.writableEnded) {
      res.write(':heartbeat\n\n');
      if (res.flush) res.flush();
    }
  }, 15000);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('Client disconnected from SSE', { namespace, jobId });
    cleanup();
  });

  // Send initial progress
  sendProgress();

  return {
    sendProgress,
    cleanup,
    sendMessage: (event, data) => sendSSEMessage(res, event, data)
  };
}

/**
 * Cleanup expired entries from cache
 */
function cleanupExpiredEntries() {
  let totalCleaned = 0;

  statusCache.forEach((namespaceCache, namespace) => {
    const now = Date.now();
    let cleanedCount = 0;

    namespaceCache.forEach((status, jobId) => {
      if (status.expiresAt && now > status.expiresAt) {
        namespaceCache.delete(jobId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.debug('Cleaned expired SSE entries', {
        namespace,
        count: cleanedCount
      });
      totalCleaned += cleanedCount;
    }
  });

  return totalCleaned;
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

module.exports = {
  updateStatus,
  getStatus,
  deleteStatus,
  sendSSEMessage,
  setupSSEConnection,
  cleanupExpiredEntries
};
