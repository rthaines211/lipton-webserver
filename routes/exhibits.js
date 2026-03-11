/**
 * Exhibit Collector Routes
 *
 * Handles file uploads, exhibit package generation, duplicate resolution,
 * SSE progress streaming, and file downloads.
 *
 * @module routes/exhibits
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const { Storage } = require('@google-cloud/storage');
const ExhibitProcessor = require('../services/exhibit-processor');
const DropboxBrowser = require('../services/dropbox-browser');
const AsyncJobManager = require('../services/async-job-manager');
const logger = require('../monitoring/logger');
const { asyncHandler } = require('../middleware/error-handler');

const os = require('os');
const fsPromises = require('fs').promises;

const gcs = new Storage();
const GCS_BUCKET = process.env.GCS_BUCKET_NAME || 'docmosis-tornado-form-submissions';

const UPLOAD_BASE = path.join(os.tmpdir(), 'exhibits');
const CLEANUP_TTL = 60 * 60 * 1000; // 1 hour

const sessions = new Map();
const jobs = new Map();

if (!fs.existsSync(UPLOAD_BASE)) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic'];
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: .${ext}`));
        }
    },
});

function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            exhibits: {},
            caseName: '',
            description: '',
            createdAt: Date.now(),
        });
    }
    return sessions.get(sessionId);
}

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

// POST /upload
router.post('/upload', upload.array('files', 50), asyncHandler(async (req, res) => {
    const { sessionId, letter } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    if (!letter || !/^[A-Z]$/i.test(letter)) {
        return res.status(400).json({ success: false, error: 'letter must be A-Z' });
    }

    const session = getSession(sessionId);
    const upperLetter = letter.toUpperCase();

    if (!session.exhibits[upperLetter]) {
        session.exhibits[upperLetter] = [];
    }

    const uploadedFiles = [];
    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        session.exhibits[upperLetter].push({
            name: file.originalname,
            type: ext === 'tif' ? 'tiff' : ext,
            buffer: file.buffer,
            size: file.size,
        });
        uploadedFiles.push({ name: file.originalname, size: file.size, type: ext });

        Sentry.addBreadcrumb({
            category: 'exhibit.upload',
            message: `File uploaded to Exhibit ${upperLetter}`,
            level: 'info',
            data: {
                fileName: file.originalname,
                fileSize: file.size,
                fileType: ext,
                exhibit: upperLetter,
                sessionId,
            },
        });
    }

    // Set Sentry context for this upload batch
    Sentry.setContext('exhibit_upload', {
        sessionId,
        exhibit: upperLetter,
        fileCount: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
        totalFilesInExhibit: session.exhibits[upperLetter].length,
    });

    logger.info(`Uploaded ${uploadedFiles.length} file(s) to Exhibit ${upperLetter}`, { sessionId });

    res.json({
        success: true,
        exhibit: upperLetter,
        filesUploaded: uploadedFiles,
        totalFilesInExhibit: session.exhibits[upperLetter].length,
    });
}));

// POST /generate
router.post('/generate', asyncHandler(async (req, res) => {
    const { sessionId, caseName } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing sessionId' });
    }

    const session = sessions.get(sessionId);
    session.caseName = caseName || '';

    const jobId = crypto.randomUUID();
    const outputDir = path.join(UPLOAD_BASE, sessionId);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    jobs.set(jobId, {
        sessionId,
        status: 'processing',
        progress: 0,
        phase: 'starting',
        message: 'Starting...',
        duplicates: null,
        outputPath: null,
        filename: null,
        sseClients: [],
    });

    // Count exhibits and files for Sentry context
    const exhibitSummary = {};
    let totalFiles = 0;
    for (const [letter, files] of Object.entries(session.exhibits)) {
        if (files && files.length > 0) {
            exhibitSummary[letter] = files.length;
            totalFiles += files.length;
        }
    }

    Sentry.addBreadcrumb({
        category: 'exhibit.generate',
        message: `Started exhibit generation`,
        level: 'info',
        data: { jobId, sessionId, caseName: session.caseName, totalFiles, exhibits: exhibitSummary },
    });

    res.json({ success: true, jobId });

    Sentry.startSpan(
        {
            op: 'exhibit.process',
            name: `Generate exhibit package: ${session.caseName || 'unnamed'}`,
            attributes: {
                'exhibit.job_id': jobId,
                'exhibit.session_id': sessionId,
                'exhibit.case_name': session.caseName || '',
                'exhibit.total_files': totalFiles,
                'exhibit.exhibit_count': Object.keys(exhibitSummary).length,
            },
        },
        async (span) => {
            try {
                const result = await ExhibitProcessor.process({
                    caseName: session.caseName,
                    exhibits: session.exhibits,
                    outputDir,
                    onProgress: (pct, msg, phase) => {
                        const job = jobs.get(jobId);
                        if (job) {
                            job.progress = pct;
                            job.message = msg;
                            if (phase) job.phase = phase;
                            broadcastJobEvent(jobId, 'progress', {
                                progress: pct,
                                message: msg,
                                phase: job.phase,
                                timestamp: Date.now(),
                            });
                        }
                    },
                });

                const job = jobs.get(jobId);
                if (!job) return;

                if (result.paused && result.duplicates) {
                    job.status = 'awaiting_resolution';
                    job.duplicates = result.duplicates;
                    span.setAttribute('exhibit.outcome', 'duplicates_found');
                    span.setAttribute('exhibit.duplicate_exhibits', Object.keys(result.duplicates).length);
                    broadcastJobEvent(jobId, 'duplicates', { duplicates: result.duplicates });
                } else {
                    // Upload PDF to GCS so download works across Cloud Run instances
                    let downloadUrl = null;
                    try {
                        const gcsPath = `exhibits/${sessionId}/${jobId}/${result.filename}`;
                        const bucket = gcs.bucket(GCS_BUCKET);
                        const file = bucket.file(gcsPath);
                        await file.save(result.pdfBuffer, { contentType: 'application/pdf' });

                        [downloadUrl] = await file.getSignedUrl({
                            action: 'read',
                            expires: Date.now() + 60 * 60 * 1000, // 1 hour
                            responseDisposition: `attachment; filename="${result.filename}"`,
                        });
                    } catch (gcsErr) {
                        logger.warn(`GCS upload/sign skipped (local dev?): ${gcsErr.message}`);
                    }

                    job.status = 'completed';
                    job.outputPath = result.outputPath;
                    job.filename = result.filename;
                    job.downloadUrl = downloadUrl;
                    span.setAttribute('exhibit.outcome', 'completed');
                    span.setAttribute('exhibit.output_filename', result.filename);
                    broadcastJobEvent(jobId, 'complete', { filename: result.filename, downloadUrl });
                }
            } catch (err) {
                logger.error('Exhibit processing failed', { jobId, error: err.message, stack: err.stack });
                span.setStatus({ code: 2, message: err.message });

                Sentry.withScope(scope => {
                    scope.setTag('exhibit.job_id', jobId);
                    scope.setTag('exhibit.stage', 'process');
                    scope.setContext('exhibit_job', {
                        jobId,
                        sessionId,
                        caseName: session.caseName,
                        totalFiles,
                        exhibits: exhibitSummary,
                    });
                    Sentry.captureException(err);
                });

                const job = jobs.get(jobId);
                if (job) {
                    job.status = 'failed';
                    job.message = err.message;
                    broadcastJobEvent(jobId, 'error', { error: err.message });
                }
            }
        }
    );
}));

// POST /jobs/:jobId/resolve
router.post('/jobs/:jobId/resolve', asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { resolutions } = req.body;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'awaiting_resolution') {
        return res.status(400).json({ success: false, error: 'Job is not awaiting resolution' });
    }

    const session = sessions.get(job.sessionId);
    if (!session) {
        return res.status(400).json({ success: false, error: 'Session expired' });
    }

    if (resolutions) {
        for (const [letter, pairs] of Object.entries(resolutions)) {
            const filesToRemove = new Set();
            for (const pair of pairs) {
                if (pair.action === 'remove_file1') filesToRemove.add(pair.file1);
                if (pair.action === 'remove_file2') filesToRemove.add(pair.file2);
            }
            if (filesToRemove.size > 0 && session.exhibits[letter]) {
                session.exhibits[letter] = session.exhibits[letter].filter(
                    f => !filesToRemove.has(f.name)
                );
            }
        }
    }

    job.status = 'processing';
    job.duplicates = null;
    res.json({ success: true, message: 'Resuming pipeline...' });

    Sentry.addBreadcrumb({
        category: 'exhibit.resolve',
        message: 'Resuming after duplicate resolution',
        level: 'info',
        data: { jobId, sessionId: job.sessionId },
    });

    const outputDir = path.join(UPLOAD_BASE, job.sessionId);
    Sentry.startSpan(
        {
            op: 'exhibit.resume',
            name: `Resume exhibit package: ${session.caseName || 'unnamed'}`,
            attributes: { 'exhibit.job_id': jobId },
        },
        async (span) => {
            try {
                const result = await ExhibitProcessor.resume({
                    caseName: session.caseName,
                    exhibits: session.exhibits,
                    outputDir,
                    onProgress: (pct, msg, phase) => {
                        job.progress = pct;
                        job.message = msg;
                        if (phase) job.phase = phase;
                        broadcastJobEvent(jobId, 'progress', {
                            progress: pct,
                            message: msg,
                            phase: job.phase,
                            timestamp: Date.now(),
                        });
                    },
                });

                // Upload PDF to GCS so download works across Cloud Run instances
                let downloadUrl = null;
                try {
                    const gcsPath = `exhibits/${job.sessionId}/${jobId}/${result.filename}`;
                    const bucket = gcs.bucket(GCS_BUCKET);
                    const gcsFile = bucket.file(gcsPath);
                    await gcsFile.save(result.pdfBuffer, { contentType: 'application/pdf' });

                    [downloadUrl] = await gcsFile.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 60 * 60 * 1000, // 1 hour
                        responseDisposition: `attachment; filename="${result.filename}"`,
                    });
                } catch (gcsErr) {
                    logger.warn(`GCS upload/sign skipped (local dev?): ${gcsErr.message}`);
                }

                job.status = 'completed';
                job.outputPath = result.outputPath;
                job.filename = result.filename;
                job.downloadUrl = downloadUrl;
                span.setAttribute('exhibit.outcome', 'completed');
                broadcastJobEvent(jobId, 'complete', { filename: result.filename, downloadUrl });
            } catch (err) {
                logger.error('Exhibit resume failed', { jobId, error: err.message });
                span.setStatus({ code: 2, message: err.message });
                Sentry.captureException(err);
                job.status = 'failed';
                job.message = err.message;
                broadcastJobEvent(jobId, 'error', { error: err.message });
            }
        }
    );
}));

// GET /jobs/:jobId/stream (SSE)
router.get('/jobs/:jobId/stream', (req, res) => {
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

    res.write(`event: progress\ndata: ${JSON.stringify({
        progress: job.progress,
        message: job.message,
        phase: job.phase || 'starting',
        timestamp: Date.now(),
    })}\n\n`);
    if (res.flush) res.flush();

    if (job.status === 'completed') {
        res.write(`event: complete\ndata: ${JSON.stringify({ filename: job.filename, downloadUrl: job.downloadUrl })}\n\n`);
        if (res.flush) res.flush();
    } else if (job.status === 'awaiting_resolution') {
        res.write(`event: duplicates\ndata: ${JSON.stringify({ duplicates: job.duplicates })}\n\n`);
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

// GET /jobs/:jobId/download
router.get('/jobs/:jobId/download', asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'completed' || !job.outputPath) {
        return res.status(400).json({ success: false, error: 'PDF not ready yet' });
    }

    res.download(job.outputPath, job.filename);
}));

// DELETE /sessions/:sessionId
router.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    sessions.delete(sessionId);

    const sessionDir = path.join(UPLOAD_BASE, sessionId);
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    for (const [jobId, job] of jobs.entries()) {
        if (job.sessionId === sessionId) {
            jobs.delete(jobId);
        }
    }

    res.json({ success: true, message: 'Session cleaned up' });
}));

// Periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > CLEANUP_TTL) {
            sessions.delete(sessionId);
            const sessionDir = path.join(UPLOAD_BASE, sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            logger.info(`Cleaned up expired exhibit session: ${sessionId}`);
        }
    }
}, 10 * 60 * 1000);

/**
 * POST /generate-from-dropbox
 * Generate exhibit package from Dropbox files.
 * Supports real-time (SSE) and async (job queue) modes.
 */
router.post('/generate-from-dropbox', async (req, res) => {
    try {
        const { caseName, exhibitMapping, mode, email } = req.body;

        if (!caseName || !exhibitMapping) {
            return res.status(400).json({ success: false, error: 'caseName and exhibitMapping are required' });
        }

        const totalFiles = Object.values(exhibitMapping).flat().length;
        const effectiveMode = mode || (totalFiles >= 50 ? 'async' : 'realtime');

        if (effectiveMode === 'async') {
            const job = await AsyncJobManager.createJob({
                caseName,
                totalFiles,
                exhibitMapping,
                dropboxSourcePath: null,
                email,
            });

            // Dispatch Cloud Run Job
            try {
                const { JobsClient } = require('@google-cloud/run').v2;
                const jobsClient = new JobsClient();
                await jobsClient.runJob({
                    name: `projects/docmosis-tornado/locations/us-central1/jobs/exhibit-processor-job`,
                    overrides: {
                        containerOverrides: [{
                            env: [{ name: 'JOB_ID', value: job.id }],
                        }],
                    },
                });
            } catch (dispatchError) {
                logger.error('Failed to dispatch Cloud Run Job:', dispatchError.message);
                await AsyncJobManager.failJob(job.id, 'Failed to dispatch processing job');
                return res.status(500).json({ success: false, error: 'Failed to start processing' });
            }

            return res.json({
                success: true,
                mode: 'async',
                jobId: job.id,
                message: `Processing ${totalFiles} files. ${email ? 'You\'ll receive an email' : 'Check the jobs dashboard'} when it's ready.`,
            });
        }

        // Real-time mode
        const sessionId = `dropbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempDir = path.join(os.tmpdir(), 'exhibits', sessionId);
        await fsPromises.mkdir(tempDir, { recursive: true });

        const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        jobs.set(jobId, {
            sessionId,
            status: 'processing',
            progress: 0,
            phase: 'downloading',
            message: 'Downloading files from Dropbox...',
            sseClients: [],
        });

        res.json({ success: true, mode: 'realtime', jobId });

        // Process in background (after response sent)
        setImmediate(async () => {
            const job = jobs.get(jobId);

            try {
                // Phase 1: Download from Dropbox (0-20%)
                const flatFiles = [];
                for (const [letter, files] of Object.entries(exhibitMapping)) {
                    for (const file of files) {
                        flatFiles.push({ dropboxPath: file.dropboxPath, letter });
                    }
                }

                const downloadedFiles = await DropboxBrowser.downloadFiles(
                    flatFiles,
                    tempDir,
                    15,
                    (completed, total) => {
                        const pct = Math.round((completed / total) * 20);
                        broadcastJobEvent(jobId, 'progress', {
                            progress: pct,
                            phase: 'downloading',
                            message: `Downloading files from Dropbox (${completed}/${total})...`,
                            timestamp: Date.now(),
                        });
                    }
                );

                // Build exhibits object with filePath references
                const exhibits = {};
                for (const [letter, files] of downloadedFiles.entries()) {
                    exhibits[letter] = files.map(f => ({
                        name: f.name,
                        type: path.extname(f.name).slice(1).toLowerCase(),
                        filePath: f.localPath,
                    }));
                }

                // Phase 2-5: Process (20-100%)
                const result = await ExhibitProcessor.process({
                    caseName,
                    exhibits,
                    outputDir: tempDir,
                    generateThumbnails: true,
                    onProgress: (percent, message, phase) => {
                        const adjusted = 20 + Math.round(percent * 0.8);
                        broadcastJobEvent(jobId, 'progress', {
                            progress: adjusted,
                            phase: phase || 'processing',
                            message,
                            timestamp: Date.now(),
                        });
                    },
                });

                // Handle duplicate pause
                if (result.paused) {
                    job.status = 'awaiting_resolution';
                    job.duplicates = result.duplicates;
                    job.exhibits = exhibits;
                    job.tempDir = tempDir;
                    job.caseName = caseName;

                    broadcastJobEvent(jobId, 'duplicates', { duplicates: result.duplicates });
                    return;
                }

                // Upload to GCS
                job.status = 'completed';
                job.outputPath = result.outputPath;
                job.filename = result.filename;
                job.pdfBuffer = result.pdfBuffer;

                let downloadUrl = null;
                try {
                    const bucket = gcs.bucket(GCS_BUCKET);
                    const gcsPath = `exhibits/${sessionId}/${jobId}/${result.filename}`;
                    const gcsFile = bucket.file(gcsPath);
                    await gcsFile.save(Buffer.from(result.pdfBuffer), { contentType: 'application/pdf' });
                    [downloadUrl] = await gcsFile.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 60 * 60 * 1000,
                        responseDisposition: `attachment; filename="${result.filename}"`,
                    });
                    job.downloadUrl = downloadUrl;
                } catch (gcsError) {
                    logger.warn(`GCS upload/sign skipped (local dev?): ${gcsError.message}`);
                }

                // Send complete event
                broadcastJobEvent(jobId, 'complete', {
                    filename: result.filename,
                    downloadUrl: downloadUrl || `/api/exhibits/download/${jobId}`,
                });

            } catch (error) {
                logger.error('Dropbox processing error:', error);
                job.status = 'failed';
                job.message = error.message;
                broadcastJobEvent(jobId, 'error', { error: error.message });
            } finally {
                // Clean up temp dir (skip if paused for duplicate resolution)
                const currentJob = jobs.get(jobId);
                if (currentJob && currentJob.status !== 'awaiting_resolution') {
                    try {
                        await fsPromises.rm(tempDir, { recursive: true, force: true });
                    } catch (cleanupError) {
                        logger.error('Temp cleanup failed:', cleanupError.message);
                    }
                }
            }
        });

    } catch (error) {
        logger.error('Generate from Dropbox error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
