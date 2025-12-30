/**
 * PDF Routes
 * API endpoints for PDF generation, status checking, download, and retry
 *
 * @module server/routes/pdf-routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { generateAndUploadPDF } = require('../services/pdf-service');
const storageService = require('../services/storage-service');
const { transformFormData } = require('../services/transformation-service');
const logger = require('../../monitoring/logger');

// In-memory job tracking (for development without database)
// In production, this would be stored in the database
const jobs = new Map();

/**
 * POST /api/pdf/generate
 * Trigger asynchronous PDF generation for a form submission
 *
 * Request body:
 *   - formData: object (required) - Form submission data
 *   OR
 *   - filename: string (required) - Filename of saved form data (e.g., 'form-entry-123.json')
 *
 * Response 200:
 *   - jobId: PDF generation job ID
 *   - status: Initial job status (processing)
 *   - message: Human-readable status message
 *
 * Response 400: Invalid request
 * Response 500: Server error
 */
router.post('/generate', async (req, res) => {
  try {
    let rawFormData;

    // Accept either inline formData or filename reference
    if (req.body.formData) {
      rawFormData = req.body.formData;
    } else if (req.body.filename) {
      // Load form data from storage
      rawFormData = await storageService.readFormData(req.body.filename);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: formData or filename'
      });
    }

    // Transform raw form data to structured format expected by PDF service
    // This converts plaintiff-1-first-name, etc. to PlaintiffDetails array
    const formData = transformFormData(rawFormData);

    // Generate unique job ID
    const jobId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job tracking
    jobs.set(jobId, {
      jobId,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      filename: null,
      filePath: null,
      error: null
    });

    logger.info('PDF generation requested', { jobId });

    // Get document type from request (default to cm110-decrypted for backward compatibility)
    const documentType = req.body.documentType || 'cm110-decrypted';
    // Map document type to template name
    const templateMap = {
      'civ109': 'civ109',
      'cm010': 'cm010',
      'sum100': 'sum100',
      'sum200a': 'sum200a',
      'civ010': 'civ010',
      'cm110': 'cm110-decrypted',
      'cm110-decrypted': 'cm110-decrypted'
    };
    const templateName = templateMap[documentType] || 'cm110-decrypted';

    logger.info('Starting PDF generation', { jobId, documentType, templateName });

    // Start PDF generation asynchronously (don't await)
    generateAndUploadPDF(formData, jobId, {
      template: templateName,
      documentType: documentType,
      progressCallback: (phase, progress, message) => {
        // Update job progress in real-time for polling clients
        const currentJob = jobs.get(jobId);
        if (currentJob) {
          jobs.set(jobId, {
            ...currentJob,
            progress,
            phase,
            message
          });
        }
      }
    })
      .then(result => {
        // Update job on success
        jobs.set(jobId, {
          ...jobs.get(jobId),
          status: 'completed',
          progress: 100,
          filename: result.filename,
          filePath: result.tempFilePath,
          dropboxPath: result.dropboxPath,
          dropboxUrl: result.dropboxUrl,
          sizeBytes: result.sizeBytes,
          completedAt: new Date().toISOString()
        });
        logger.info('PDF generation completed', { jobId, filename: result.filename });
      })
      .catch(error => {
        // Update job on failure
        jobs.set(jobId, {
          ...jobs.get(jobId),
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        });
        logger.error('PDF generation failed', { jobId, error: error.message });
      });

    // Return immediately with job ID
    res.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'PDF generation started'
    });

  } catch (error) {
    logger.error('PDF generation request failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/status/:jobId
 * Check status of PDF generation job
 *
 * Parameters:
 *   - jobId: string (path parameter) - PDF generation job ID
 *
 * Response 200:
 *   - jobId, status, progress, filename, filePath, dropboxPath, dropboxUrl, sizeBytes, createdAt, completedAt, failedAt, error
 *
 * Response 404: PDF generation job not found
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Look up job in memory
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Return job status
    res.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        filename: job.filename,
        filePath: job.filePath,
        dropboxPath: job.dropboxPath,
        dropboxUrl: job.dropboxUrl,
        sizeBytes: job.sizeBytes,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt
      }
    });

  } catch (error) {
    logger.error('Status check failed', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/download/:jobId
 * Download generated PDF file
 *
 * Parameters:
 *   - jobId: string (path parameter) - PDF generation job ID
 *
 * Response 200:
 *   - Content-Type: application/pdf
 *   - Content-Disposition: attachment with filename
 *   - Body: PDF file binary data
 *
 * Response 404: PDF not found or not yet complete
 * Response 500: Failed to retrieve PDF from storage
 */
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Look up job in memory
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(404).json({
        success: false,
        error: `PDF not ready yet. Current status: ${job.status}`,
        status: job.status,
        progress: job.progress
      });
    }

    // Check if file exists
    const filePath = job.filePath;
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'PDF file path not found'
      });
    }

    try {
      await fs.access(filePath);
    } catch (error) {
      logger.error('PDF file not found on disk', { jobId, filePath });
      return res.status(404).json({
        success: false,
        error: 'PDF file not found on disk'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
    res.setHeader('Content-Length', job.sizeBytes);

    // Stream file to client
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);

    logger.info('PDF download successful', { jobId, filename: job.filename });

  } catch (error) {
    logger.error('PDF download failed', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pdf/preview/:jobId
 * Preview generated PDF in browser
 *
 * Parameters:
 *   - jobId: integer (path parameter) - PDF generation job ID
 *
 * Response 200:
 *   - Content-Type: application/pdf (no Content-Disposition for inline viewing)
 *   - Body: PDF file binary data
 *
 * Response 404: PDF not found or not yet complete
 */
router.get('/preview/:jobId', async (req, res) => {
  // T074-T077: Implement GET /api/pdf/preview/:jobId
  res.status(501).json({ error: 'Not implemented: GET /api/pdf/preview/:jobId' });
});

/**
 * POST /api/pdf/retry/:jobId
 * Manually trigger retry for failed PDF generation
 *
 * Parameters:
 *   - jobId: integer (path parameter) - PDF generation job ID
 *
 * Response 200:
 *   - jobId, status (pending), message
 *
 * Response 400: Job is not in failed status or maximum retries exceeded
 * Response 404: PDF generation job not found
 */
router.post('/retry/:jobId', async (req, res) => {
  // T097-T101: Implement POST /api/pdf/retry/:jobId
  res.status(501).json({ error: 'Not implemented: POST /api/pdf/retry/:jobId' });
});

module.exports = router;
