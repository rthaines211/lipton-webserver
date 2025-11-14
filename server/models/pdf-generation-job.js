/**
 * PDF Generation Job Model
 * Tracks asynchronous PDF generation jobs in PostgreSQL
 *
 * @module server/models/pdf-generation-job
 */

const db = require('../config/database');

/**
 * PDF Generation Job Model Class
 * CRUD operations for pdf_generation_jobs table
 */
class PdfGenerationJob {
  /**
   * Create a new PDF generation job
   * @param {number} formSubmissionId - ID of the form submission
   * @returns {Promise<Object>} Created job record
   */
  static async create(formSubmissionId) {
    const query = `
      INSERT INTO pdf_generation_jobs (form_submission_id, status, retry_count)
      VALUES ($1, 'pending', 0)
      RETURNING *
    `;
    const result = await db.query(query, [formSubmissionId]);
    return result.rows[0];
  }

  /**
   * Find PDF generation job by ID
   * @param {number} jobId - PDF generation job ID
   * @returns {Promise<Object|null>} Job record or null if not found
   */
  static async findById(jobId) {
    const query = 'SELECT * FROM pdf_generation_jobs WHERE id = $1';
    const result = await db.query(query, [jobId]);
    return result.rows[0] || null;
  }

  /**
   * Find PDF generation job by form submission ID
   * @param {number} formSubmissionId - Form submission ID
   * @returns {Promise<Object|null>} Job record or null if not found
   */
  static async findByFormSubmissionId(formSubmissionId) {
    const query = `
      SELECT * FROM pdf_generation_jobs
      WHERE form_submission_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [formSubmissionId]);
    return result.rows[0] || null;
  }

  /**
   * Update job status
   * @param {number} jobId - PDF generation job ID
   * @param {string} status - New status (pending, processing, retrying, completed, failed)
   * @param {Object} metadata - Additional metadata (error_message, retry_count, etc.)
   * @returns {Promise<Object>} Updated job record
   */
  static async updateStatus(jobId, status, metadata = {}) {
    if (!this.isValidStatus(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: pending, processing, retrying, completed, failed`);
    }

    const setClauses = ['status = $2'];
    const values = [jobId, status];
    let paramIndex = 3;

    if (metadata.error_message !== undefined) {
      setClauses.push(`error_message = $${paramIndex}`);
      values.push(metadata.error_message);
      paramIndex++;
    }

    if (metadata.retry_count !== undefined) {
      if (!this.isValidRetryCount(metadata.retry_count)) {
        throw new Error(`Invalid retry_count: ${metadata.retry_count}. Must be between 0 and 3`);
      }
      setClauses.push(`retry_count = $${paramIndex}`);
      values.push(metadata.retry_count);
      paramIndex++;
    }

    const query = `
      UPDATE pdf_generation_jobs
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Mark job as completed with Dropbox file information
   * @param {number} jobId - PDF generation job ID
   * @param {string} dropboxFileId - Dropbox file ID
   * @param {string} dropboxFilePath - Dropbox file path
   * @param {string} generatedFilename - Generated PDF filename
   * @returns {Promise<Object>} Updated job record
   */
  static async markCompleted(jobId, dropboxFileId, dropboxFilePath, generatedFilename) {
    const query = `
      UPDATE pdf_generation_jobs
      SET
        status = 'completed',
        dropbox_file_id = $2,
        dropbox_file_path = $3,
        generated_filename = $4,
        completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [jobId, dropboxFileId, dropboxFilePath, generatedFilename]);
    return result.rows[0];
  }

  /**
   * Mark job as failed with error message
   * @param {number} jobId - PDF generation job ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Updated job record
   */
  static async markFailed(jobId, errorMessage) {
    const query = `
      UPDATE pdf_generation_jobs
      SET
        status = 'failed',
        error_message = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [jobId, errorMessage]);
    return result.rows[0];
  }

  /**
   * Validate status enum
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid status
   */
  static isValidStatus(status) {
    // T018: Implement status validation
    const validStatuses = ['pending', 'processing', 'retrying', 'completed', 'failed'];
    return validStatuses.includes(status);
  }

  /**
   * Validate retry count constraints
   * @param {number} retryCount - Retry count to validate
   * @returns {boolean} True if valid retry count (0-3)
   */
  static isValidRetryCount(retryCount) {
    return Number.isInteger(retryCount) && retryCount >= 0 && retryCount <= 3;
  }
}

module.exports = PdfGenerationJob;
