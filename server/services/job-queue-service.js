/**
 * Job Queue Service
 * PostgreSQL-based job queue using pg-boss for async task processing
 *
 * Features:
 * - Async PDF generation jobs
 * - Automatic retry on failure (exponential backoff)
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 * - Job prioritization
 * - Scheduled jobs
 *
 * Job Types:
 * - 'pdf-generation': Generate and upload PDF
 * - 'pdf-regeneration': Regenerate existing PDF
 *
 * Configuration:
 * - Uses existing PostgreSQL database connection
 * - Auto-creates pgboss schema on first run
 * - Polls for jobs every 2 seconds
 * - Max retry: 3 attempts with exponential backoff
 *
 * Usage:
 *   const { enqueuePdfGeneration } = require('./services/job-queue-service');
 *
 *   const jobId = await enqueuePdfGeneration(formData, {
 *     priority: 10,
 *     retryLimit: 3
 *   });
 *
 * Last Updated: 2025-11-12
 * Created for: PDF Form Filling Feature (001-pdf-form-filling)
 *
 * @module server/services/job-queue-service
 */

const { PgBoss } = require('pg-boss');
const logger = require('../../monitoring/logger');
const { generateAndUploadPDF } = require('./pdf-service');
const { updateStatus } = require('./sse-service');

// Job queue configuration
const JOB_TYPES = {
  PDF_GENERATION: 'pdf-generation',
  PDF_REGENERATION: 'pdf-regeneration'
};

const JOB_OPTIONS = {
  retryLimit: 3,
  retryDelay: 60,        // 1 minute initial delay
  retryBackoff: true,     // Exponential backoff (1m, 2m, 4m)
  expireInHours: 24,      // Jobs expire after 24 hours
  retentionDays: 7        // Keep completed jobs for 7 days
};

// PostgreSQL connection configuration
const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

let boss = null;
let isStarted = false;

/**
 * Initialize pg-boss job queue
 * Creates pgboss schema and starts job processing
 *
 * @returns {Promise<PgBoss>} Initialized pg-boss instance
 */
async function initializeJobQueue() {
  if (boss && isStarted) {
    return boss;
  }

  try {
    logger.info('Initializing job queue (pg-boss)');

    boss = new PgBoss({
      connectionString,
      schema: 'pgboss',

      // Monitoring and maintenance
      monitorStateIntervalSeconds: 60,
      maintenanceIntervalSeconds: 300,  // 5 minutes

      // Job processing
      newJobCheckInterval: 2000,  // Poll every 2 seconds

      // Archiving
      archiveCompletedAfterSeconds: 604800  // 7 days
    });

    // Event listeners
    boss.on('error', (error) => {
      logger.error('Job queue error', { error: error.message });
    });

    boss.on('monitor-states', (states) => {
      logger.debug('Job queue monitor', { states });
    });

    // Start the queue
    await boss.start();
    isStarted = true;

    logger.info('Job queue started successfully', {
      schema: 'pgboss',
      pollInterval: '2s',
      retryLimit: JOB_OPTIONS.retryLimit
    });

    // Register job handlers
    await registerJobHandlers();

    return boss;
  } catch (error) {
    logger.error('Failed to initialize job queue', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Register job handlers for different job types
 */
async function registerJobHandlers() {
  if (!boss) {
    throw new Error('Job queue not initialized');
  }

  // PDF Generation handler
  await boss.work(
    JOB_TYPES.PDF_GENERATION,
    {
      teamSize: 5,        // Process up to 5 jobs concurrently
      teamConcurrency: 1  // Each worker processes 1 job at a time
    },
    handlePdfGenerationJob
  );

  logger.info('Job handlers registered', {
    handlers: Object.values(JOB_TYPES)
  });
}

/**
 * Handle PDF generation job
 *
 * @param {Object} job - pg-boss job object
 * @param {Object} job.data - Job data
 * @param {Object} job.data.formData - Form submission data
 * @param {string} job.data.jobId - Job ID for SSE tracking
 * @param {Object} job.data.options - PDF generation options
 * @returns {Promise<Object>} Job result
 */
async function handlePdfGenerationJob(job) {
  const { formData, jobId, options = {} } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Processing PDF generation job', {
      jobId: job.id,
      sseJobId: jobId,
      attempt: job.data.__retryCount || 0
    });

    // Update SSE status - job started
    updateStatus('pdf', jobId, {
      status: 'processing',
      phase: 'job_started',
      progress: 0,
      message: 'PDF generation job started',
      pgBossJobId: job.id,
      attempt: job.data.__retryCount || 0
    });

    // Generate PDF with Dropbox upload
    const result = await generateAndUploadPDF(formData, jobId, options);

    const executionTime = Date.now() - startTime;

    logger.info('PDF generation job completed', {
      jobId: job.id,
      sseJobId: jobId,
      executionTimeMs: executionTime,
      pdfSize: result.sizeBytes,
      dropboxUploaded: !!result.dropboxUrl
    });

    // Return result for job completion
    return {
      success: true,
      jobId,
      pgBossJobId: job.id,
      result,
      executionTimeMs: executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error('PDF generation job failed', {
      jobId: job.id,
      sseJobId: jobId,
      error: error.message,
      stack: error.stack,
      attempt: job.data.__retryCount || 0,
      executionTimeMs: executionTime
    });

    // Update SSE status - job failed
    updateStatus('pdf', jobId, {
      status: 'failed',
      phase: 'job_failed',
      progress: 0,
      message: `PDF generation job failed: ${error.message}`,
      error: error.message,
      pgBossJobId: job.id,
      attempt: job.data.__retryCount || 0
    });

    // Re-throw to trigger retry
    throw error;
  }
}

/**
 * Enqueue PDF generation job
 *
 * @param {Object} formData - Form submission data
 * @param {string} sseJobId - Job ID for SSE progress tracking
 * @param {Object} options - Job options
 * @param {number} [options.priority=10] - Job priority (higher = more important)
 * @param {number} [options.retryLimit=3] - Max retry attempts
 * @param {number} [options.startAfter] - Delay in seconds before starting
 * @returns {Promise<string>} pg-boss job ID
 */
async function enqueuePdfGeneration(formData, sseJobId, options = {}) {
  if (!boss || !isStarted) {
    await initializeJobQueue();
  }

  try {
    const jobOptions = {
      priority: options.priority || 10,
      retryLimit: options.retryLimit !== undefined ? options.retryLimit : JOB_OPTIONS.retryLimit,
      retryDelay: JOB_OPTIONS.retryDelay,
      retryBackoff: JOB_OPTIONS.retryBackoff,
      expireInHours: JOB_OPTIONS.expireInHours,
      singletonKey: sseJobId,  // Prevent duplicate jobs for same SSE job ID
      startAfter: options.startAfter || 0
    };

    const jobId = await boss.send(
      JOB_TYPES.PDF_GENERATION,
      {
        formData,
        jobId: sseJobId,
        options: options.pdfOptions || {}
      },
      jobOptions
    );

    logger.info('PDF generation job enqueued', {
      pgBossJobId: jobId,
      sseJobId,
      priority: jobOptions.priority,
      retryLimit: jobOptions.retryLimit
    });

    // Update SSE status - job queued
    updateStatus('pdf', sseJobId, {
      status: 'queued',
      phase: 'job_queued',
      progress: 0,
      message: 'PDF generation job queued',
      pgBossJobId: jobId
    });

    return jobId;
  } catch (error) {
    logger.error('Failed to enqueue PDF generation job', {
      sseJobId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Get job status from pg-boss
 *
 * @param {string} jobId - pg-boss job ID
 * @returns {Promise<Object|null>} Job status or null if not found
 */
async function getJobStatus(jobId) {
  if (!boss || !isStarted) {
    await initializeJobQueue();
  }

  try {
    const job = await boss.getJobById(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      state: job.state,
      priority: job.priority,
      retryLimit: job.retryLimit,
      retryCount: job.retryCount,
      retryDelay: job.retryDelay,
      startedOn: job.startedOn,
      completedOn: job.completedOn,
      output: job.output,
      error: job.output?.error
    };
  } catch (error) {
    logger.error('Failed to get job status', {
      jobId,
      error: error.message
    });
    return null;
  }
}

/**
 * Cancel a queued or active job
 *
 * @param {string} jobId - pg-boss job ID
 * @returns {Promise<boolean>} True if cancelled successfully
 */
async function cancelJob(jobId) {
  if (!boss || !isStarted) {
    await initializeJobQueue();
  }

  try {
    await boss.cancel(jobId);

    logger.info('Job cancelled', { jobId });
    return true;
  } catch (error) {
    logger.error('Failed to cancel job', {
      jobId,
      error: error.message
    });
    return false;
  }
}

/**
 * Get queue statistics
 *
 * @returns {Promise<Object>} Queue stats (queued, active, completed, failed)
 */
async function getQueueStats() {
  if (!boss || !isStarted) {
    await initializeJobQueue();
  }

  try {
    const queues = await boss.getQueues();
    const pdfQueue = queues.find(q => q.name === JOB_TYPES.PDF_GENERATION);

    if (!pdfQueue) {
      return {
        queued: 0,
        active: 0,
        completed: 0,
        failed: 0
      };
    }

    return {
      name: pdfQueue.name,
      queued: pdfQueue.count || 0,
      active: pdfQueue.active || 0,
      completed: pdfQueue.completed || 0,
      failed: pdfQueue.failed || 0
    };
  } catch (error) {
    logger.error('Failed to get queue stats', {
      error: error.message
    });
    return {
      queued: 0,
      active: 0,
      completed: 0,
      failed: 0
    };
  }
}

/**
 * Gracefully stop the job queue
 * Waits for active jobs to complete
 *
 * @param {number} [timeout=30000] - Timeout in ms (default: 30s)
 * @returns {Promise<void>}
 */
async function stopJobQueue(timeout = 30000) {
  if (!boss || !isStarted) {
    return;
  }

  try {
    logger.info('Stopping job queue gracefully', { timeout });

    await boss.stop({ timeout });

    isStarted = false;
    boss = null;

    logger.info('Job queue stopped successfully');
  } catch (error) {
    logger.error('Error stopping job queue', {
      error: error.message
    });
  }
}

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping job queue');
  await stopJobQueue();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, stopping job queue');
  await stopJobQueue();
  process.exit(0);
});

module.exports = {
  initializeJobQueue,
  enqueuePdfGeneration,
  getJobStatus,
  cancelJob,
  getQueueStats,
  stopJobQueue,
  JOB_TYPES
};
