/**
 * Complaint Creator Routes
 *
 * Handles complaint form submissions, document generation with SSE progress,
 * and file downloads.
 *
 * @module routes/complaint
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Sentry = require('@sentry/node');
const logger = require('../monitoring/logger');
const ComplaintDocumentGenerator = require('../services/complaint-document-generator');

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// In-memory job state for SSE streaming
const jobs = new Map();
const CLEANUP_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Broadcast SSE event to all connected clients for a job
 */
function broadcastJobEvent(jobId, event, data) {
    const job = jobs.get(jobId);
    if (!job || !job.sseClients) return;
    for (const res of job.sseClients) {
        try {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) {
            // Client disconnected
        }
    }
}

/**
 * Extract plaintiffs from form data
 */
function extractPlaintiffs(formData) {
    const plaintiffs = [];
    const plaintiffCount = parseInt(formData.plaintiffCount) || 1;

    for (let i = 1; i <= plaintiffCount; i++) {
        plaintiffs.push({
            index: i,
            firstName: formData[`plaintiff-${i}-first-name`] || '',
            lastName: formData[`plaintiff-${i}-last-name`] || '',
            type: formData[`plaintiff-${i}-type`] || 'individual',
        });
    }

    return plaintiffs;
}

/**
 * Extract defendants from form data
 */
function extractDefendants(formData) {
    const defendants = [];
    const defendantCount = parseInt(formData.defendantCount) || 1;

    for (let i = 1; i <= defendantCount; i++) {
        defendants.push({
            index: i,
            firstName: formData[`defendant-${i}-first-name`] || '',
            lastName: formData[`defendant-${i}-last-name`] || '',
            type: formData[`defendant-${i}-type`] || 'individual',
        });
    }

    return defendants;
}

/**
 * POST /api/complaint-entries
 * Submit a new complaint and start document generation
 */
router.post('/complaint-entries', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const formData = req.body;
        const caseId = formData.id || `CC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Insert main complaint entry
        await client.query(`
            INSERT INTO complaint_entries (
                case_id, case_name, case_number, filing_date,
                county, causes_of_action, form_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, case_id
        `, [
            caseId,
            formData['case-name'] || formData.caseName || null,
            formData['case-number'] || formData.caseNumber || null,
            formData['filing-date'] || formData.filingDate || null,
            formData['county'] || null,
            JSON.stringify(formData.causesOfAction || formData['causes-of-action'] || []),
            JSON.stringify(formData),
        ]);

        // Insert plaintiffs
        const plaintiffs = extractPlaintiffs(formData);
        for (const p of plaintiffs) {
            await client.query(`
                INSERT INTO complaint_plaintiffs (
                    case_id, plaintiff_index, first_name, last_name, plaintiff_type
                ) VALUES ($1, $2, $3, $4, $5)
            `, [caseId, p.index, p.firstName, p.lastName, p.type]);
        }

        // Insert defendants
        const defendants = extractDefendants(formData);
        for (const d of defendants) {
            await client.query(`
                INSERT INTO complaint_defendants (
                    case_id, defendant_index, first_name, last_name, defendant_type
                ) VALUES ($1, $2, $3, $4, $5)
            `, [caseId, d.index, d.firstName, d.lastName, d.type]);
        }

        await client.query('COMMIT');

        logger.info('Complaint submitted', { caseId });

        // Create SSE job for async document generation
        const jobId = crypto.randomUUID();
        jobs.set(jobId, {
            caseId,
            status: 'processing',
            progress: 0,
            message: 'Starting...',
            outputPath: null,
            filename: null,
            sseClients: [],
            createdAt: Date.now(),
        });

        // Return immediately with jobId
        res.status(201).json({
            success: true,
            id: caseId,
            jobId,
            message: 'Complaint submitted — document generation started',
        });

        // Async document generation with SSE progress
        Sentry.startSpan(
            {
                op: 'complaint.generate',
                name: `Generate complaint: ${formData['case-name'] || 'unnamed'}`,
                attributes: {
                    'complaint.job_id': jobId,
                    'complaint.case_id': caseId,
                },
            },
            async (span) => {
                try {
                    const generator = new ComplaintDocumentGenerator();
                    const result = await generator.generateComplaint(formData, (pct, msg) => {
                        const job = jobs.get(jobId);
                        if (job) {
                            job.progress = pct;
                            job.message = msg;
                            broadcastJobEvent(jobId, 'progress', { progress: pct, message: msg });
                        }
                    });

                    const job = jobs.get(jobId);
                    if (job) {
                        job.status = 'completed';
                        job.outputPath = result.outputPath;
                        job.filename = result.filename;
                    }

                    await pool.query(
                        'UPDATE complaint_entries SET document_status = $1, document_paths = $2 WHERE case_id = $3',
                        ['completed', JSON.stringify([result.outputPath]), caseId]
                    );

                    span.setAttribute('complaint.outcome', 'completed');
                    broadcastJobEvent(jobId, 'complete', { filename: result.filename });

                } catch (err) {
                    logger.error('Complaint document generation failed', {
                        jobId, caseId, error: err.message, stack: err.stack,
                    });
                    span.setStatus({ code: 2, message: err.message });
                    Sentry.captureException(err);

                    const job = jobs.get(jobId);
                    if (job) {
                        job.status = 'failed';
                        job.message = err.message;
                    }

                    await pool.query(
                        'UPDATE complaint_entries SET document_status = $1 WHERE case_id = $2',
                        ['failed', caseId]
                    );

                    broadcastJobEvent(jobId, 'error', { error: err.message });
                }
            }
        );

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error submitting complaint', {
            error: error.message, stack: error.stack, code: error.code, detail: error.detail,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to submit complaint',
            ...(process.env.NODE_ENV !== 'production' && { details: error.message, code: error.code }),
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/complaint-entries/jobs/:jobId/stream (SSE)
 */
router.get('/complaint-entries/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    res.write(`event: progress\ndata: ${JSON.stringify({ progress: job.progress, message: job.message })}\n\n`);
    if (res.flush) res.flush();

    if (job.status === 'completed') {
        res.write(`event: complete\ndata: ${JSON.stringify({ filename: job.filename })}\n\n`);
        if (res.flush) res.flush();
    } else if (job.status === 'failed') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: job.message })}\n\n`);
        if (res.flush) res.flush();
    }

    job.sseClients.push(res);

    req.on('close', () => {
        const idx = job.sseClients.indexOf(res);
        if (idx !== -1) job.sseClients.splice(idx, 1);
    });
});

/**
 * GET /api/complaint-entries/jobs/:jobId/download
 */
router.get('/complaint-entries/jobs/:jobId/download', async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'completed' || !job.outputPath) {
        return res.status(400).json({ success: false, error: 'Document not ready yet' });
    }
    if (!fs.existsSync(job.outputPath)) {
        return res.status(404).json({ success: false, error: 'Document file not found' });
    }

    res.download(job.outputPath, job.filename);
});

/**
 * GET /api/complaint-entries/:caseId
 * Retrieve a complaint by case ID
 */
router.get('/complaint-entries/:caseId', async (req, res) => {
    try {
        const { caseId } = req.params;

        const entryResult = await pool.query(
            'SELECT * FROM complaint_entries WHERE case_id = $1',
            [caseId]
        );

        if (entryResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const plaintiffsResult = await pool.query(
            'SELECT * FROM complaint_plaintiffs WHERE case_id = $1 ORDER BY plaintiff_index',
            [caseId]
        );

        const defendantsResult = await pool.query(
            'SELECT * FROM complaint_defendants WHERE case_id = $1 ORDER BY defendant_index',
            [caseId]
        );

        res.json({
            success: true,
            data: {
                entry: entryResult.rows[0],
                plaintiffs: plaintiffsResult.rows,
                defendants: defendantsResult.rows,
            },
        });

    } catch (error) {
        logger.error('Error retrieving complaint', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to retrieve complaint' });
    }
});

/**
 * GET /api/complaint-entries
 * List all complaints
 */
router.get('/complaint-entries', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await pool.query(`
            SELECT
                ce.id, ce.case_id, ce.case_name, ce.case_number,
                ce.submitted_at, ce.document_status,
                COUNT(DISTINCT cp.id) as plaintiff_count,
                COUNT(DISTINCT cd.id) as defendant_count
            FROM complaint_entries ce
            LEFT JOIN complaint_plaintiffs cp ON ce.case_id = cp.case_id
            LEFT JOIN complaint_defendants cd ON ce.case_id = cd.case_id
            GROUP BY ce.id, ce.case_id, ce.case_name, ce.case_number,
                     ce.submitted_at, ce.document_status
            ORDER BY ce.submitted_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countResult = await pool.query('SELECT COUNT(*) FROM complaint_entries');
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + result.rows.length) < total,
            },
        });

    } catch (error) {
        logger.error('Error listing complaints', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to list complaints' });
    }
});

/**
 * DELETE /api/complaint-entries/:caseId
 */
router.delete('/complaint-entries/:caseId', async (req, res) => {
    try {
        const { caseId } = req.params;

        const result = await pool.query(
            'DELETE FROM complaint_entries WHERE case_id = $1 RETURNING case_id',
            [caseId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        logger.info('Complaint deleted', { caseId });
        res.json({ success: true, message: 'Complaint deleted successfully' });

    } catch (error) {
        logger.error('Error deleting complaint', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to delete complaint' });
    }
});

// Periodic cleanup of expired jobs
setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
        if (now - job.createdAt > CLEANUP_TTL) {
            jobs.delete(jobId);
            logger.info(`Cleaned up expired complaint job: ${jobId}`);
        }
    }
}, 10 * 60 * 1000);

module.exports = router;
