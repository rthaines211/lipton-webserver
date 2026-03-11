/**
 * Cloud Run Job Entrypoint
 *
 * Reads JOB_ID from environment, loads job config from PostgreSQL,
 * downloads files from Dropbox, runs the exhibit processing pipeline,
 * and delivers the output.
 *
 * CMD override in Cloud Run Job: node job-entrypoint.js
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const AsyncJobManager = require('./services/async-job-manager');
const DropboxBrowser = require('./services/dropbox-browser');
const ExhibitProcessor = require('./services/exhibit-processor');

/**
 * Process a single exhibit job.
 * Exported for testing.
 */
async function processJob(jobId) {
    let tempDir = null;

    try {
        // Load job config
        const job = await AsyncJobManager.getJob(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        const { case_name: caseName, exhibit_mapping: exhibitMapping, total_files: totalFiles } = job;

        // Create temp directory
        tempDir = path.join(os.tmpdir(), 'exhibits', `job-${jobId}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Phase 1: Download from Dropbox (0-20%)
        await AsyncJobManager.updateProgress(jobId, {
            status: 'downloading',
            progress: 0,
            progressMessage: 'Downloading files from Dropbox...',
        });

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
                AsyncJobManager.updateProgress(jobId, {
                    status: 'downloading',
                    progress: pct,
                    progressMessage: `Downloading files (${completed}/${total})...`,
                }).catch(() => {}); // Fire-and-forget progress update
            }
        );

        // Build exhibits object
        const exhibits = {};
        for (const [letter, files] of downloadedFiles.entries()) {
            exhibits[letter] = files.map(f => ({
                name: f.name,
                type: path.extname(f.name).slice(1).toLowerCase(),
                filePath: f.localPath,
            }));
        }

        // Phase 2-5: Process (20-100%)
        await AsyncJobManager.updateProgress(jobId, {
            status: 'processing',
            progress: 20,
            progressMessage: 'Processing exhibits...',
        });

        // Skip duplicate detection in async mode
        const result = await ExhibitProcessor.process({
            caseName,
            exhibits,
            outputDir: tempDir,
            skipDuplicateDetection: true, // Async mode: no interactive resolution
            onProgress: (percent, message, phase) => {
                const adjusted = 20 + Math.round(percent * 0.8);
                AsyncJobManager.updateProgress(jobId, {
                    status: 'processing',
                    progress: adjusted,
                    progressMessage: message,
                }).catch(() => {});
            },
        });

        // Upload to GCS
        let gcsOutputUrl = null;
        try {
            const { Storage } = require('@google-cloud/storage');
            const storage = new Storage();
            const bucket = storage.bucket('docmosis-tornado-form-submissions');
            const gcsPath = `exhibits/async/${jobId}/${result.filename}`;
            const file = bucket.file(gcsPath);
            await file.save(Buffer.from(result.pdfBuffer), { contentType: 'application/pdf' });
            [gcsOutputUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 72 * 60 * 60 * 1000, // 72 hours for async
                responseDisposition: `attachment; filename="${result.filename}"`,
            });
        } catch (gcsError) {
            console.error('GCS upload failed:', gcsError.message);
            gcsOutputUrl = null;
        }

        // Upload to Dropbox
        let dropboxOutputPath = null;
        try {
            const dropboxService = require('./dropbox-service');
            if (dropboxService.isEnabled()) {
                const uploadResult = await dropboxService.uploadFile(
                    result.outputPath,
                    Buffer.from(result.pdfBuffer)
                );
                dropboxOutputPath = uploadResult.dropboxPath;
            }
        } catch (dbxError) {
            console.error('Dropbox upload failed:', dbxError.message);
        }

        // Send email notification
        try {
            if (job.email && gcsOutputUrl) {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                await sgMail.send({
                    to: job.email,
                    from: process.env.SENDGRID_FROM_EMAIL || 'exhibits@liptonlegal.com',
                    subject: `Exhibit Package Ready: ${caseName}`,
                    html: `<p>Your exhibit package for <strong>${caseName}</strong> is ready.</p>
                           <p><a href="${gcsOutputUrl}">Download PDF</a> — link expires in 72 hours.</p>
                           ${dropboxOutputPath ? '<p>The PDF has also been saved to your Dropbox.</p>' : ''}`,
                });
            }
        } catch (emailError) {
            console.error('Email notification failed:', emailError.message);
        }

        // Mark complete
        await AsyncJobManager.completeJob(jobId, {
            gcsOutputUrl: gcsOutputUrl || '',
            dropboxOutputPath: dropboxOutputPath || '',
        });

        console.log(`Job ${jobId} completed successfully`);

    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        await AsyncJobManager.failJob(jobId, error.message).catch(() => {});
    } finally {
        // Cleanup temp directory
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.error('Temp cleanup failed:', e.message);
            }
        }
    }
}

// Main: run if invoked directly (Cloud Run Job)
if (require.main === module) {
    const jobId = process.env.JOB_ID;
    if (!jobId) {
        console.error('JOB_ID environment variable is required');
        process.exit(1);
    }

    processJob(jobId)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { processJob };
