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
const ExhibitProcessor = require('../services/exhibit-processor');
const logger = require('../monitoring/logger');
const { asyncHandler } = require('../middleware/error-handler');

const UPLOAD_BASE = path.join(require('os').tmpdir(), 'exhibits');
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
    }

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
        message: 'Starting...',
        duplicates: null,
        outputPath: null,
        filename: null,
        sseClients: [],
    });

    res.json({ success: true, jobId });

    ExhibitProcessor.process({
        caseName: session.caseName,
        exhibits: session.exhibits,
        outputDir,
        onProgress: (pct, msg) => {
            const job = jobs.get(jobId);
            if (job) {
                job.progress = pct;
                job.message = msg;
                broadcastJobEvent(jobId, 'progress', { progress: pct, message: msg });
            }
        },
    }).then(result => {
        const job = jobs.get(jobId);
        if (!job) return;

        if (result.paused && result.duplicates) {
            job.status = 'awaiting_resolution';
            job.duplicates = result.duplicates;
            broadcastJobEvent(jobId, 'duplicates', { duplicates: result.duplicates });
        } else {
            job.status = 'completed';
            job.outputPath = result.outputPath;
            job.filename = result.filename;
            broadcastJobEvent(jobId, 'complete', { filename: result.filename });
        }
    }).catch(err => {
        logger.error('Exhibit processing failed', { jobId, error: err.message, stack: err.stack });
        const job = jobs.get(jobId);
        if (job) {
            job.status = 'failed';
            job.message = err.message;
            broadcastJobEvent(jobId, 'error', { error: err.message });
        }
    });
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

    const outputDir = path.join(UPLOAD_BASE, job.sessionId);
    ExhibitProcessor.resume({
        caseName: session.caseName,
        exhibits: session.exhibits,
        outputDir,
        onProgress: (pct, msg) => {
            job.progress = pct;
            job.message = msg;
            broadcastJobEvent(jobId, 'progress', { progress: pct, message: msg });
        },
    }).then(result => {
        job.status = 'completed';
        job.outputPath = result.outputPath;
        job.filename = result.filename;
        broadcastJobEvent(jobId, 'complete', { filename: result.filename });
    }).catch(err => {
        logger.error('Exhibit resume failed', { jobId, error: err.message });
        job.status = 'failed';
        job.message = err.message;
        broadcastJobEvent(jobId, 'error', { error: err.message });
    });
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
    });

    res.write(`event: progress\ndata: ${JSON.stringify({ progress: job.progress, message: job.message })}\n\n`);

    if (job.status === 'completed') {
        res.write(`event: complete\ndata: ${JSON.stringify({ filename: job.filename })}\n\n`);
    } else if (job.status === 'awaiting_resolution') {
        res.write(`event: duplicates\ndata: ${JSON.stringify({ duplicates: job.duplicates })}\n\n`);
    } else if (job.status === 'failed') {
        res.write(`event: error\ndata: ${JSON.stringify({ error: job.message })}\n\n`);
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

module.exports = router;
