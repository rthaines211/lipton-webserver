/**
 * Exhibit Collector Routes
 *
 * Handles Dropbox-based exhibit package generation, duplicate resolution,
 * SSE progress streaming, and file downloads.
 *
 * @module routes/exhibits
 */

const express = require('express');
const router = express.Router();
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

const jobs = new Map();

if (!fs.existsSync(UPLOAD_BASE)) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
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

    const exhibits = job.exhibits;
    const caseName = job.caseName || '';

    if (!exhibits) {
        return res.status(400).json({ success: false, error: 'Session expired' });
    }

    if (resolutions) {
        const filesToRemove = new Set();

        for (const [letter, groupResolutions] of Object.entries(resolutions)) {
            if (!exhibits[letter]) {
                return res.status(400).json({ success: false, error: `Exhibit letter ${letter} not found in job` });
            }

            const groups = job.duplicates && job.duplicates[letter];
            if (!groups) {
                return res.status(400).json({ success: false, error: `No duplicate groups for exhibit ${letter}` });
            }

            for (const resolution of groupResolutions) {
                const group = groups.find(g => g.groupId === resolution.groupId);
                if (!group) {
                    return res.status(400).json({ success: false, error: `Unknown groupId: ${resolution.groupId}` });
                }
                if (!resolution.keep || resolution.keep.length === 0) {
                    return res.status(400).json({ success: false, error: `Must keep at least one file in group ${resolution.groupId}` });
                }
                const allFiles = [...resolution.keep, ...(resolution.remove || [])].sort();
                const groupFiles = [...group.files].sort();
                if (JSON.stringify(allFiles) !== JSON.stringify(groupFiles)) {
                    return res.status(400).json({ success: false, error: `keep+remove does not match files in group ${resolution.groupId}` });
                }
                for (const file of (resolution.remove || [])) {
                    filesToRemove.add(`${letter}:${file}`);
                }
            }
        }

        // Filter exhibits — remove files marked for removal
        for (const [letter, files] of Object.entries(exhibits)) {
            exhibits[letter] = files.filter(f => !filesToRemove.has(`${letter}:${f.name}`));
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

    const outputDir = job.tempDir || path.join(UPLOAD_BASE, job.sessionId);
    Sentry.startSpan(
        {
            op: 'exhibit.resume',
            name: `Resume exhibit package: ${caseName || 'unnamed'}`,
            attributes: { 'exhibit.job_id': jobId },
        },
        async (span) => {
            try {
                const result = await ExhibitProcessor.resume({
                    caseName,
                    exhibits,
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
                job.pdfBuffer = result.pdfBuffer;
                job.downloadUrl = downloadUrl;
                span.setAttribute('exhibit.outcome', 'completed');
                broadcastJobEvent(jobId, 'complete', {
                    filename: result.filename,
                    downloadUrl: downloadUrl || `/api/exhibits/jobs/${jobId}/download`,
                });

                // Clean up temp dir for Dropbox jobs
                if (job.tempDir) {
                    fsPromises.rm(job.tempDir, { recursive: true, force: true }).catch(e =>
                        logger.error('Temp cleanup failed after resume:', e.message)
                    );
                }
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

// GET /jobs/:jobId/duplicates
router.get('/jobs/:jobId/duplicates', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'awaiting_resolution' || !job.duplicates) {
        return res.status(400).json({ error: 'No duplicates pending review for this job' });
    }

    const exhibitFilter = req.query.exhibit;

    if (exhibitFilter) {
        // Per-exhibit response WITH thumbnails (lazy-load per tab)
        const rawGroups = job.duplicates[exhibitFilter] || [];
        const groups = rawGroups.map(g => ({
            groupId: g.groupId,
            files: g.files,
            defaultKeep: g.defaultKeep,
            edges: g.edges,
            metadata: g.fileMetadata,
            thumbnails: g.thumbnails
        }));
        return res.json({
            caseName: job.caseName,
            totalFiles: job.totalFiles || 0,
            groups: { [exhibitFilter]: groups }
        });
    }

    // Initial response WITHOUT thumbnails (lightweight metadata)
    const groupsWithoutThumbnails = {};
    for (const [letter, groups] of Object.entries(job.duplicates)) {
        groupsWithoutThumbnails[letter] = groups.map(g => ({
            groupId: g.groupId,
            files: g.files,
            defaultKeep: g.defaultKeep,
            edges: g.edges,
            metadata: g.fileMetadata
            // thumbnails intentionally omitted
        }));
    }

    return res.json({
        caseName: job.caseName,
        totalFiles: job.totalFiles || 0,
        groupCounts: job.groupCounts || {},
        totalGroups: job.totalGroups || 0,
        groups: groupsWithoutThumbnails
    });
});

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
    } else if (job.status === 'awaiting_resolution' && job.duplicates) {
        res.write(`event: scan-complete\ndata: ${JSON.stringify({
            duplicates: true,
            groupCounts: job.groupCounts || {},
            totalGroups: job.totalGroups || 0,
            totalFiles: job.totalFiles || 0
        })}\n\n`);
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
    if (job.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'PDF not ready yet' });
    }

    // Serve from in-memory buffer (temp dir may have been cleaned up)
    if (job.pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
        return res.send(Buffer.from(job.pdfBuffer));
    }

    // Fallback to file on disk
    if (job.outputPath) {
        return res.download(job.outputPath, job.filename);
    }

    res.status(400).json({ success: false, error: 'PDF not available' });
}));


// GET /jobs/:jobId/ping — keepalive to prevent Cloud Run idle scale-down
router.get('/jobs/:jobId/ping', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ alive: false });
    }
    res.json({ alive: true, status: job.status });
});

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
        const effectiveMode = mode || (totalFiles >= 2000 ? 'async' : 'realtime');

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
                message: `Processing ${totalFiles} files. ${email ? 'You\'ll receive an email when it\'s ready.' : 'Processing will continue in the background.'}`,
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

                // Store job context for both scan and process phases
                job.exhibits = exhibits;
                job.tempDir = tempDir;
                job.caseName = caseName;

                // Step 1: Scan for duplicates
                broadcastJobEvent(jobId, 'progress', {
                    phase: 'duplicate_detection',
                    message: 'Scanning for duplicates...',
                    progress: 25,
                    timestamp: Date.now(),
                });

                const scanResult = await ExhibitProcessor.scanForDuplicates({
                    exhibits,
                    onProgress: (pct, msg, phase) => {
                        const adjusted = 20 + Math.round(pct * 0.3);
                        broadcastJobEvent(jobId, 'progress', {
                            progress: adjusted,
                            message: msg,
                            phase: phase || 'duplicate_detection',
                            timestamp: Date.now(),
                        });
                    },
                    generateThumbnails: true,
                });

                if (scanResult) {
                    // Duplicates found — pause for review
                    job.status = 'awaiting_resolution';
                    job.duplicates = scanResult.groups;
                    job.groupCounts = scanResult.groupCounts;
                    job.totalGroups = scanResult.totalGroups;
                    job.totalFiles = scanResult.totalFiles;

                    broadcastJobEvent(jobId, 'scan-complete', {
                        duplicates: true,
                        groupCounts: scanResult.groupCounts,
                        totalGroups: scanResult.totalGroups,
                        totalFiles: scanResult.totalFiles,
                    });
                    return;
                }

                // No duplicates — proceed to processing
                broadcastJobEvent(jobId, 'scan-complete', { duplicates: false });
                broadcastJobEvent(jobId, 'progress', {
                    phase: 'processing',
                    message: 'Generating exhibits...',
                    progress: 50,
                    timestamp: Date.now(),
                });

                const result = await ExhibitProcessor.process({
                    caseName,
                    exhibits,
                    outputDir: tempDir,
                    onProgress: (percent, message, phase) => {
                        const adjusted = 50 + Math.round(percent * 0.5);
                        broadcastJobEvent(jobId, 'progress', {
                            progress: adjusted,
                            phase: phase || 'processing',
                            message,
                            timestamp: Date.now(),
                        });
                    },
                });

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
                    downloadUrl: downloadUrl || `/api/exhibits/jobs/${jobId}/download`,
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
// Exported for testing only
module.exports._getJobsMap = () => jobs;
