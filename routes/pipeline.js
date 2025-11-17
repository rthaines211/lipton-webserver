/**
 * Pipeline Routes
 * Extracted from server.js as part of Week 2 Day 2 refactoring
 * Updated in Week 2 Day 3 to use pipeline service
 *
 * Handles all pipeline-related endpoints:
 * - Pipeline status polling
 * - Real-time progress streaming (SSE)
 * - Pipeline retry
 * - Document regeneration
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pipelineService = require('../services/pipeline-service');

// Dependency injection container (initialized via initializeRouter)
let serverHelpers = null;

/**
 * Initialize router with server helper functions
 * @param {Object} helpers - Helper functions from server.js
 */
function initializeRouter(helpers) {
    serverHelpers = helpers;
}

/**
 * Pipeline Status Polling Endpoint (Phase 5)
 *
 * GET /api/pipeline-status/:caseId
 *
 * Retrieves the current status of the normalization pipeline for a given case.
 * Supports real-time polling from the frontend to provide user feedback.
 *
 * Response Statuses:
 * - pending: Pipeline is queued but not yet started
 * - processing: Pipeline is currently executing
 * - success: Pipeline completed successfully
 * - failed: Pipeline encountered an error
 * - skipped: Pipeline was disabled or not executed
 * - not_found: No status found for the given case ID
 */
router.get('/pipeline-status/:caseId', async (req, res) => {
    let { caseId } = req.params;

    console.log(`📊 Pipeline status check requested for case: ${caseId}`);

    // If this is a temp ID (format: temp-{formId}), try to find the real case ID
    if (caseId.startsWith('temp-')) {
        const formId = caseId.substring(5); // Remove 'temp-' prefix
        console.log(`🔍 Temp ID detected, looking up real case ID for form: ${formId}`);

        try {
            // Query database to find the real case ID using the form ID
            const result = await serverHelpers.pool.query(
                `SELECT id FROM cases WHERE raw_payload->>'id' = $1 ORDER BY created_at DESC LIMIT 1`,
                [formId]
            );

            if (result.rows.length > 0) {
                const realCaseId = result.rows[0].id;
                console.log(`✅ Found real case ID: ${realCaseId}`);
                caseId = realCaseId; // Use the real case ID for status lookup
            } else {
                console.log(`⚠️  No case found yet for form ID: ${formId} - form may still be saving`);
                // Return a "still saving" status
                return res.json({
                    success: true,
                    caseId: req.params.caseId,
                    status: 'processing',
                    phase: 'saving_form',
                    progress: 10,
                    currentPhase: 'Saving form data...',
                    totalPhases: 5,
                    startTime: Date.now(),
                    endTime: null,
                    executionTime: null,
                    error: null,
                    result: null
                });
            }
        } catch (dbError) {
            console.error(`❌ Database error looking up case ID:`, dbError.message);
            // Fall through to check temp ID in cache
        }
    }

    // Retrieve status from cache
    const status = pipelineService.getPipelineStatus(caseId);

    if (!status) {
        console.log(`⚠️  No pipeline status found for case: ${caseId}`);
        return res.status(404).json({
            success: false,
            status: 'not_found',
            message: 'No pipeline status found for this case ID',
            caseId: req.params.caseId
        });
    }

    // Return sanitized status (remove internal expiresAt field)
    const { expiresAt, ...statusData } = status;

    res.json({
        success: true,
        caseId: req.params.caseId, // Return original requested ID
        realCaseId: caseId, // Include the real case ID if it was looked up
        ...statusData
    });
});

/**
 * SSE Endpoint for Real-Time Progress Updates
 *
 * GET /api/jobs/:jobId/stream
 *
 * Server-Sent Events endpoint for real-time progress updates.
 * The frontend SSE client connects here to receive pipeline progress updates.
 */
router.get('/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;

    // ============================================================
    // PHASE 1B: Connection State Tracking
    // ============================================================
    // Track whether a complete/error event has already been sent
    // This prevents duplicate completion messages and reconnection loops
    let completeSent = false;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no' // Disable Nginx buffering for Cloud Run
    });

    console.log(`📡 SSE connection established for job: ${jobId}`);

    // Check if job exists before setting up stream
    const initialStatus = pipelineService.getPipelineStatus(jobId);

    // If no status found, assume job is complete or doesn't exist
    if (!initialStatus) {
        console.log(`📡 No status found for job ${jobId}, sending completion signal`);

        // Send completion event indicating job is done or not found
        res.write('event: complete\n');
        res.write(`data: ${JSON.stringify({
            jobId,
            status: 'complete',
            message: 'Job completed or not found',
            phase: 'complete',
            progress: 100
        })}\n\n`);

        // Flush completion message immediately
        if (res.flush) res.flush();
        if (res.socket && !res.socket.destroyed) {
            res.socket.uncork();
            res.socket.cork();
        }

        // Close the connection gracefully
        setTimeout(() => {
            res.end();
        }, 100);
        return;
    }

    // Send initial connection event
    res.write('event: open\n');
    res.write(`data: {"status":"connected","jobId":"${jobId}"}\n\n`);

    // Flush initial connection message immediately
    if (res.flush) res.flush();
    if (res.socket && !res.socket.destroyed) {
        res.socket.uncork();
        res.socket.cork();
    }

    // Declare interval and heartbeat variables before sendProgress function
    // This prevents "Cannot access before initialization" error
    let interval = null;
    let heartbeat = null;

    // Function to send progress updates
    const sendProgress = () => {
        // PHASE 1B: Skip if complete event already sent
        if (completeSent) {
            return;
        }

        const status = pipelineService.getPipelineStatus(jobId);
        if (status) {
            const event = status.status === 'success' ? 'complete' :
                         status.status === 'failed' ? 'error' : 'progress';

            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify({
                jobId,
                status: status.status,
                phase: status.phase,
                progress: status.progress || 0,
                currentPhase: status.currentPhase,
                error: status.error,
                result: status.result
            })}\n\n`);

            // ============================================================
            // CRITICAL FIX: Force immediate flush to prevent buffering
            // ============================================================
            // Node.js may buffer SSE writes, causing all messages to arrive
            // at once when the connection closes. We force a flush by using
            // the underlying socket's flush mechanism if available.
            if (res.flush) {
                res.flush(); // flushHeaders for compress middleware
            }
            // Alternative: ensure socket write buffer is flushed
            if (res.socket && !res.socket.destroyed) {
                res.socket.uncork();
                res.socket.cork();
            }

            // ============================================================
            // PHASE 1A: Immediate Interval Cleanup
            // ============================================================
            // If complete or failed, immediately clear intervals to prevent
            // race condition where interval fires again before connection closes
            if (status.status === 'success' || status.status === 'failed') {
                completeSent = true;  // Mark complete as sent

                // Clear intervals IMMEDIATELY (before scheduling close)
                if (interval) clearInterval(interval);
                if (heartbeat) clearInterval(heartbeat);

                // Close connection after brief delay to allow client to receive message
                // Reduced from 1000ms to 500ms to minimize reconnection window
                setTimeout(() => {
                    if (!res.writableEnded) {
                        res.end();
                    }
                }, 500);
            }
        }
    };

    // Track last sent progress to avoid sending duplicates
    let lastSentProgress = null;

    // Modified sendProgress to only send when progress changes
    const sendProgressIfChanged = () => {
        const status = pipelineService.getPipelineStatus(jobId);
        if (status) {
            const currentProgress = JSON.stringify({
                status: status.status,
                progress: status.progress,
                currentPhase: status.currentPhase
            });

            // Only send if progress actually changed
            if (currentProgress !== lastSentProgress) {
                lastSentProgress = currentProgress;
                sendProgress();
            }
        }
    };

    // Send current status immediately
    sendProgressIfChanged();

    // Set up interval to send updates every 2 seconds (only if changed)
    interval = setInterval(() => {
        const status = pipelineService.getPipelineStatus(jobId);
        if (!status || status.status === 'success' || status.status === 'failed') {
            clearInterval(interval);
            clearInterval(heartbeat);
            if (!res.writableEnded) {
                res.end();
            }
        } else {
            sendProgressIfChanged();
        }
    }, 2000);

    // Send heartbeat every 20 seconds to keep connection alive
    heartbeat = setInterval(() => {
        res.write(':heartbeat\n\n');
        // Flush heartbeat immediately
        if (res.flush) res.flush();
        if (res.socket && !res.socket.destroyed) {
            res.socket.uncork();
            res.socket.cork();
        }
    }, 20000);

    // Clean up on client disconnect
    req.on('close', () => {
        console.log(`📡 SSE connection closed for job: ${jobId}`);
        clearInterval(interval);
        clearInterval(heartbeat);
    });
});

/**
 * Pipeline Retry Endpoint (Phase 5)
 *
 * POST /api/pipeline-retry/:caseId
 *
 * Retries the normalization pipeline for a specific case.
 * Retrieves the form submission from the data directory and re-executes the pipeline.
 *
 * This endpoint allows users to retry failed pipeline executions without
 * resubmitting the entire form.
 */
router.post('/pipeline-retry/:caseId', async (req, res) => {
    const { caseId } = req.params;

    console.log(`🔄 Pipeline retry requested for case: ${caseId}`);

    try {
        // Option 1: Query database for the form data by case ID
        let formData = null;
        let foundFile = null;

        try {
            const dbQuery = await serverHelpers.pool.query('SELECT * FROM cases WHERE id = $1', [caseId]);
            if (dbQuery.rows.length > 0) {
                console.log(`📊 Found case in database: ${caseId}`);
                // We have the case, now need to reconstruct the form data
                // For now, try to find the JSON file by searching all files
            }
        } catch (dbErr) {
            console.warn('⚠️  Database query failed, falling back to file search');
        }

        // Search JSON files for this case ID
        const files = fs.readdirSync(serverHelpers.dataDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(serverHelpers.dataDir, file);
                    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                    // Check if this file matches the case ID (look in dbCaseId or pipeline metadata)
                    // The form might have been transformed, so check the original payload
                    if (fileContent.id === caseId ||
                        file.includes(caseId) ||
                        (fileContent.dbCaseId === caseId)) {
                        formData = fileContent;
                        foundFile = file;
                        console.log(`📄 Found form data in file: ${foundFile}`);
                        break;
                    }
                } catch (err) {
                    // Skip files that can't be parsed
                    continue;
                }
            }
        }

        if (!formData) {
            console.warn(`⚠️  Form data not found for case: ${caseId}`);
            console.log(`   Searched ${files.filter(f => f.endsWith('.json')).length} JSON files`);
            return res.status(404).json({
                success: false,
                error: 'Form data not found for this case ID',
                caseId: caseId,
                hint: 'The form data may have been cleaned up or the case ID is incorrect'
            });
        }

        console.log(`📄 Re-running pipeline with form data from: ${foundFile}`);

        // Re-run the pipeline with the form data
        const pipelineResult = await pipelineService.callNormalizationPipeline(formData, caseId);

        res.json({
            success: true,
            message: 'Pipeline retry initiated',
            caseId: caseId,
            pipeline: pipelineResult
        });

    } catch (error) {
        console.error('❌ Error retrying pipeline:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retry pipeline',
            details: error.message
        });
    }
});

/**
 * Document Regeneration Endpoint
 *
 * POST /api/regenerate-documents/:caseId
 *
 * Regenerate documents for an existing case with new document type selection.
 * Allows users to change which documents to generate after initial submission.
 *
 * @param {string} caseId - The database case ID (UUID)
 * @body {Array<string>} documentTypes - Array of document types to regenerate
 * @header {string} Authorization - Bearer token for authentication
 *
 * @returns {Object} Response with jobId for SSE tracking
 */
router.post('/regenerate-documents/:caseId', async (req, res) => {
    const { caseId } = req.params;
    const { documentTypes } = req.body;

    console.log(`📄 Document regeneration requested for case: ${caseId}`);
    console.log(`📝 Requested document types: ${JSON.stringify(documentTypes)}`);

    try {
        // ============================================================
        // AUTHENTICATION REMOVED - nginx handles authentication
        // ============================================================
        // Note: Authentication previously required Bearer token but removed
        // to allow nginx proxy to handle authentication layer instead.
        // If you need to re-enable, uncomment the code below:
        //
        // const authHeader = req.headers.authorization;
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //     return res.status(401).json({
        //         success: false,
        //         error: 'Unauthorized',
        //         message: 'Valid authorization token required'
        //     });
        // }
        // const token = authHeader.substring(7);
        // if (token !== process.env.ACCESS_TOKEN) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Forbidden',
        //         message: 'Invalid authorization token'
        //     });
        // }

        // ============================================================
        // STEP 1: VALIDATE DOCUMENT TYPES
        // ============================================================
        const VALID_DOCUMENT_TYPES = ['srogs', 'pods', 'admissions'];

        // Check documentTypes is an array
        if (!Array.isArray(documentTypes)) {
            console.error('❌ documentTypes must be an array');
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: 'documentTypes must be an array'
            });
        }

        // Check at least one document type selected
        if (documentTypes.length === 0) {
            console.error('❌ No document types selected');
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: 'At least one document type must be selected'
            });
        }

        // Validate each document type
        const invalidTypes = documentTypes.filter(type => !VALID_DOCUMENT_TYPES.includes(type));
        if (invalidTypes.length > 0) {
            console.error(`❌ Invalid document types: ${invalidTypes.join(', ')}`);
            return res.status(400).json({
                success: false,
                error: 'Invalid Input',
                message: `Invalid document types: ${invalidTypes.join(', ')}`,
                validTypes: VALID_DOCUMENT_TYPES
            });
        }

        // ============================================================
        // STEP 3: FETCH EXISTING CASE (DATABASE OR FILE STORAGE)
        // ============================================================
        console.log(`🔍 Fetching case: ${caseId}`);

        let formData = null;
        let isFileBasedSubmission = false;
        let databaseCaseExists = false;

        // Try DATABASE first
        try {
            console.log(`   → Attempting database lookup...`);

            const query = `
                SELECT
                    id,
                    raw_payload,
                    latest_payload
                FROM cases
                WHERE id = $1 AND is_active = true
            `;

            const result = await serverHelpers.pool.query(query, [caseId]);

            if (result.rows.length > 0) {
                // Found in database
                console.log(`✅ Case found in database`);
                const existingCase = result.rows[0];
                formData = existingCase.latest_payload || existingCase.raw_payload;
                databaseCaseExists = true;
                isFileBasedSubmission = false;
            } else {
                console.log(`⚠️ Case not found in database, trying file storage...`);
            }

        } catch (dbError) {
            console.error(`⚠️ Database lookup failed: ${dbError.message}`);
            console.log(`   → Falling back to file storage...`);
        }

        // Fallback to FILE STORAGE if not found in database
        if (!formData) {
            try {
                const filename = `form-entry-${caseId}.json`;
                console.log(`   → Checking for file: ${filename}`);

                const fileExists = await serverHelpers.formDataExists(filename);

                if (fileExists) {
                    console.log(`✅ Case found in file storage`);
                    formData = await serverHelpers.readFormData(filename);
                    isFileBasedSubmission = true;
                    databaseCaseExists = false;
                } else {
                    console.error(`❌ Case not found in file storage either`);
                }

            } catch (fileError) {
                console.error(`❌ File storage lookup failed: ${fileError.message}`);
            }
        }

        // If still no form data, return 404
        if (!formData) {
            console.error(`❌ Case not found: ${caseId}`);
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Case ${caseId} not found in database or file storage`
            });
        }

        console.log(`📦 Form data source: ${isFileBasedSubmission ? 'FILE STORAGE' : 'DATABASE'}`);

        // ============================================================
        // STEP 4: UPDATE DATABASE IF CASE EXISTS IN DATABASE
        // ============================================================
        if (databaseCaseExists) {
            try {
                console.log(`💾 Updating document selection in database...`);

                const updateQuery = `
                    UPDATE cases
                    SET
                        document_types_to_generate = $1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING id
                `;

                await serverHelpers.pool.query(updateQuery, [
                    JSON.stringify(documentTypes),
                    caseId
                ]);

                console.log(`✅ Database updated with new document types: ${JSON.stringify(documentTypes)}`);

            } catch (updateError) {
                console.error(`⚠️ Warning: Failed to update database: ${updateError.message}`);
                // Don't fail the request - regeneration can still proceed
            }
        } else {
            console.log(`ℹ️ Skipping database update (file-based submission)`);
        }

        // ============================================================
        // STEP 6: INVOKE NORMALIZATION PIPELINE
        // ============================================================
        console.log(`🚀 Starting document regeneration pipeline...`);

        // Call existing pipeline function (same one used for initial submission)
        const pipelineResult = await pipelineService.callNormalizationPipeline(
            formData,           // Form data from database
            caseId,             // Use same case ID for tracking
            documentTypes       // New document selection
        );

        console.log(`Pipeline result:`, pipelineResult);

        // ============================================================
        // STEP 7: UPDATE REGENERATION TRACKING (OPTIONAL - DATABASE ONLY)
        // ============================================================
        if (databaseCaseExists) {
            try {
                // Create regeneration history entry
                const historyEntry = {
                    timestamp: new Date().toISOString(),
                    documentTypes: documentTypes,
                    triggeredBy: 'manual' // vs 'automatic', 'scheduled', etc.
                };

                // Update database with regeneration tracking
                const trackingQuery = `
                    UPDATE cases
                    SET
                        last_regenerated_at = NOW(),
                        regeneration_count = COALESCE(regeneration_count, 0) + 1,
                        regeneration_history = COALESCE(regeneration_history, '[]'::JSONB) || $1::JSONB
                    WHERE id = $2
                    RETURNING
                        last_regenerated_at,
                        regeneration_count
                `;

                const trackingResult = await serverHelpers.pool.query(trackingQuery, [
                    JSON.stringify(historyEntry),
                    caseId
                ]);

                if (trackingResult.rows.length > 0) {
                    const tracking = trackingResult.rows[0];
                    console.log(`✅ Regeneration tracking updated: count=${tracking.regeneration_count}, last=${tracking.last_regenerated_at}`);
                }

            } catch (trackingError) {
                // Don't fail the request if tracking fails
                console.error('⚠️ Warning: Failed to update regeneration tracking:', trackingError.message);
            }
        } else {
            console.log(`ℹ️ Skipping regeneration tracking (file-based submission - no database record)`);
        }

        // ============================================================
        // STEP 8: RETURN SUCCESS RESPONSE
        // ============================================================
        return res.status(200).json({
            success: true,
            message: 'Document regeneration started successfully',
            caseId: caseId,
            jobId: caseId,  // Use caseId as jobId for SSE tracking
            documentTypes: documentTypes,
            pipelineEnabled: true,
            pipeline: {
                status: pipelineResult.status || 'running',
                message: pipelineResult.message || 'Pipeline execution started'
            }
        });

    } catch (error) {
        console.error('❌ Error in document regeneration:', error);

        return res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Failed to start document regeneration',
            details: error.message
        });
    }
});

module.exports = router;
module.exports.initializeRouter = initializeRouter;
