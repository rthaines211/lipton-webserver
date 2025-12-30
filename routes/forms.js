/**
 * Form Entry Routes
 *
 * Handles all CRUD operations for the Phase 2 document generation system.
 * These routes accept form submissions, transform data, generate documents via Docmosis,
 * and trigger the Python normalization pipeline for document processing.
 *
 * Extracted from server.js as part of Week 2 refactoring to improve maintainability.
 *
 * @module routes/forms
 */

const express = require('express');
const router = express.Router();
const FormTransformer = require('../services/form-transformer');
const pipelineService = require('../services/pipeline-service');
const dropboxService = require('../dropbox-service');
const logger = require('../monitoring/logger');
const metricsModule = require('../monitoring/metrics');
const { asyncHandler } = require('../middleware/error-handler');

// These will be passed in via router initialization
// to avoid circular dependencies and access helper functions from server.js
let serverHelpers = null;

/**
 * Initialize router with server helper functions
 *
 * This allows the router to use helper functions defined in server.js
 * without creating circular dependencies.
 *
 * @param {Object} helpers - Object containing helper functions from server.js
 * @param {Function} helpers.saveFormData - Save form data to storage
 * @param {Function} helpers.readFormData - Read form data from storage
 * @param {Function} helpers.listFormEntries - List all form entries
 * @param {Function} helpers.deleteFormData - Delete form data from storage
 * @param {Function} helpers.saveToDatabase - Save to PostgreSQL
 * @param {Function} helpers.callNormalizationPipeline - Call Python pipeline
 * @param {Function} helpers.setPipelineStatus - Set pipeline status
 * @param {Function} helpers.getPipelineStatus - Get pipeline status
 * @param {Object} helpers.PIPELINE_CONFIG - Pipeline configuration
 */
function initializeRouter(helpers) {
    serverHelpers = helpers;
}

/**
 * POST /api/form-entries
 * Create new form submission
 *
 * Processes form data through multiple stages:
 * 1. Validation (required fields, document types)
 * 2. Transformation (raw form → structured JSON)
 * 3. Storage (Cloud Storage/local filesystem)
 * 4. Database (PostgreSQL with case tracking)
 * 5. Pipeline (Python normalization - runs in background)
 */
router.post('/', asyncHandler(async (req, res) => {
    const formData = req.body;
    console.log('Received form data:', JSON.stringify(formData, null, 2));

    // Validate required fields - check for at least one plaintiff
    const hasPlaintiff = Object.keys(formData).some(key =>
        key.includes('plaintiff') && key.includes('first-name') && formData[key]
    );

    if (!formData.id || !hasPlaintiff) {
        console.log('Missing fields check:', {
            id: !!formData.id,
            hasPlaintiff: hasPlaintiff
        });
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: id and at least one plaintiff name'
        });
    }

    // ============================================================
    // PHASE 2.1: VALIDATE DOCUMENT SELECTION
    // ============================================================
    // Extract and validate selected document types
    const documentTypesToGenerate = formData.documentTypesToGenerate || ['srogs', 'pods', 'admissions'];
    const validTypes = ['srogs', 'pods', 'admissions', 'cm110', 'civ109', 'cm010', 'sum100', 'sum200a', 'civ010'];

    // Validate: must be an array
    if (!Array.isArray(documentTypesToGenerate)) {
        console.error('❌ Invalid documentTypesToGenerate: not an array');
        return res.status(400).json({
            success: false,
            error: 'documentTypesToGenerate must be an array'
        });
    }

    // Validate: at least one document type required
    if (documentTypesToGenerate.length === 0) {
        console.error('❌ Invalid documentTypesToGenerate: empty array');
        return res.status(400).json({
            success: false,
            error: 'At least one document type must be selected'
        });
    }

    // Validate: all types must be valid
    const invalidTypes = documentTypesToGenerate.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
        console.error(`❌ Invalid document types: ${invalidTypes.join(', ')}`);
        return res.status(400).json({
            success: false,
            error: 'Invalid document types',
            invalidTypes: invalidTypes
        });
    }

    console.log(`📄 Document types to generate: ${documentTypesToGenerate.join(', ')}`);
    // ============================================================

    // Create a temporary case ID for progress tracking (will be replaced by DB ID)
    const tempCaseId = `temp-${formData.id}`;

    // Step 1: Saving form to file (10% progress)
    pipelineService.setPipelineStatus(tempCaseId, {
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

    // Transform the raw form data into structured format
    const structuredData = FormTransformer.transformFormData(formData);

    // Revert normalized keys/values to original human-readable format
    const originalFormatData = FormTransformer.revertToOriginalFormat(structuredData);

    // Add server timestamp to main data
    originalFormatData.serverTimestamp = new Date().toISOString();

    // Create filename with timestamp and ID
    const filename = `form-entry-${formData.id}.json`;

    // Write to storage (Cloud Storage in production, local filesystem in development)
    await serverHelpers.saveFormData(filename, originalFormatData);

    // Log the submission
    console.log(`✅ Form entry saved: ${filename}`);

    // Record form submission metrics
    const plaintiffCount = originalFormatData.PlaintiffDetails?.length || 0;
    const defendantCount = originalFormatData.DefendantDetails2?.length || 0;
    const processingTime = (Date.now() - Date.parse(originalFormatData.serverTimestamp || new Date().toISOString())) / 1000;
    metricsModule.recordFormSubmission(true, plaintiffCount, defendantCount, processingTime);
    console.log(`📊 Metrics recorded: ${plaintiffCount} plaintiffs, ${defendantCount} defendants`);

    // ============================================================
    // DROPBOX UPLOAD (TEMPORARILY DISABLED)
    // ============================================================
    // Temporarily disabled to fix deployment issues (2025-10-22)
    // The Dropbox integration was causing 500 errors due to filepath/filename mismatch
    // Cloud Storage is working correctly for form persistence
    //
    // To re-enable:
    // 1. Uncomment the code block below
    // 2. Ensure DROPBOX_ENABLED is set properly in environment
    // 3. Fix dropbox-service.js uploadFile method to handle filename parameter correctly
    // ============================================================
    /*
    if (dropboxService.isEnabled()) {
        console.log(`☁️  Uploading to Dropbox: ${filename}`);
        dropboxService.uploadFile(filename)
            .then(result => {
                if (result.success) {
                    console.log(`✅ Dropbox upload successful: ${result.dropboxPath}`);
                } else {
                    console.warn(`⚠️  Dropbox upload failed: ${result.error}`);
                }
            })
            .catch(error => {
                console.error(`❌ Dropbox upload error: ${error.message}`);
            });
    }
    */

    // Step 2: Saving to database (20% progress)
    pipelineService.setPipelineStatus(tempCaseId, {
        status: 'processing',
        phase: 'saving_database',
        progress: 20,
        currentPhase: 'Saving to database...',
        totalPhases: 5,
        startTime: Date.now(),
        endTime: null,
        executionTime: null,
        error: null,
        result: null
    });

    // Save to PostgreSQL database
    let dbCaseId = null;
    try {
        dbCaseId = await serverHelpers.saveToDatabase(structuredData, formData, documentTypesToGenerate);
        console.log(`✅ Form entry saved to database with case ID: ${dbCaseId}`);

        // Copy the status from temp ID to actual DB case ID
        const tempStatus = pipelineService.getPipelineStatus(tempCaseId);
        if (tempStatus) {
            pipelineService.setPipelineStatus(dbCaseId, {
                ...tempStatus,
                progress: 30,
                currentPhase: 'Database saved, starting pipeline...'
            });
        }
    } catch (dbError) {
        console.error('⚠️  Database save failed, but JSON file was saved:', dbError.message);
        console.error('   Error details:', dbError.stack);
        // Continue - don't fail the request if database fails
    }

    // ============================================================
    // DETERMINE CASE ID FOR TRACKING
    // ============================================================
    // Use database case ID if available, otherwise fall back to form ID
    // This ensures progress tracking works even if database save fails
    const trackingCaseId = dbCaseId || formData.id;
    console.log(`📊 Tracking Case ID: ${trackingCaseId} (DB: ${dbCaseId ? 'YES' : 'NO'})`);

    // ============================================================
    // SEND RESPONSE IMMEDIATELY - DON'T WAIT FOR PIPELINE
    // ============================================================
    // Send the response NOW so the frontend can reset the form immediately.
    // The pipeline will continue running in the background, and the frontend
    // will poll /api/pipeline-status/:caseId to get real-time progress updates.
    // ============================================================

    // IMPORTANT: Send the database case ID for SSE progress tracking
    // The Python pipeline uses this ID to broadcast progress updates
    console.log(`📤 Sending response with dbCaseId: ${trackingCaseId} (type: ${typeof trackingCaseId})`);
    console.log(`   Form ID (UUID): ${formData.id}`);
    console.log(`   Database ID (integer): ${dbCaseId}`);

    res.status(201).json({
        success: true,
        message: 'Form entry saved successfully',
        id: formData.id, // UUID for file tracking
        filename: filename,
        dbCaseId: trackingCaseId, // Database case ID for SSE progress tracking
        timestamp: originalFormatData.serverTimestamp,
        structuredData: originalFormatData,
        documentTypesToGenerate: documentTypesToGenerate, // PHASE 2.1: Return selected document types
        pipelineEnabled: serverHelpers.PIPELINE_CONFIG.enabled && serverHelpers.PIPELINE_CONFIG.executeOnSubmit, // Tell frontend if pipeline is running
        // Pipeline will execute in background
        pipeline: {
            executed: serverHelpers.PIPELINE_CONFIG.enabled && serverHelpers.PIPELINE_CONFIG.executeOnSubmit,
            status: 'running',
            message: 'Pipeline execution started in background'
        }
    });

    // ============================================================
    // RUN PIPELINE IN BACKGROUND - AFTER RESPONSE SENT
    // ============================================================
    // Execute pipeline asynchronously without blocking the response.
    // The frontend will poll for progress updates via /api/pipeline-status/:caseId
    // ============================================================
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 STARTING BACKGROUND PIPELINE EXECUTION`);
    console.log(`   Tracking Case ID: ${trackingCaseId}`);
    console.log(`   Database Case ID: ${dbCaseId || 'N/A (using form ID)'}`);
    console.log(`   Form ID: ${formData.id}`);
    console.log(`   Pipeline Enabled: ${serverHelpers.PIPELINE_CONFIG.enabled}`);
    console.log(`   Execute on Submit: ${serverHelpers.PIPELINE_CONFIG.executeOnSubmit}`);
    console.log(`${'='.repeat(70)}\n`);

    pipelineService.callNormalizationPipeline(originalFormatData, trackingCaseId, documentTypesToGenerate)
        .then((pipelineResult) => {
            console.log(`\n${'='.repeat(70)}`);
            if (pipelineResult.success) {
                console.log('✅ PIPELINE COMPLETED SUCCESSFULLY');
                console.log(`   Case ID: ${dbCaseId}`);
                console.log(`   Execution time: ${pipelineResult.executionTime}ms`);
                // Record successful pipeline execution
                metricsModule.recordPipelineExecution(true, pipelineResult.executionTime / 1000, pipelineResult.phase || 'complete');
            } else if (pipelineResult.skipped) {
                console.log(`📋 PIPELINE SKIPPED`);
                console.log(`   Reason: ${pipelineResult.reason}`);
            } else {
                console.warn('⚠️  PIPELINE FAILED (but form was saved)');
                console.log(`   Error: ${pipelineResult.error || 'Unknown'}`);
                // Record failed pipeline execution
                metricsModule.recordPipelineExecution(false, pipelineResult.executionTime / 1000 || 0, pipelineResult.phase || 'error');
            }
            console.log(`${'='.repeat(70)}\n`);
        })
        .catch((pipelineError) => {
            console.log(`\n${'='.repeat(70)}`);
            console.error('❌ PIPELINE EXECUTION THREW ERROR');
            console.error(`   Error: ${pipelineError.message}`);
            console.error(`   Stack: ${pipelineError.stack}`);
            console.log(`${'='.repeat(70)}\n`);
            // Record pipeline error
            metricsModule.recordPipelineExecution(false, 0, 'error');
        });
}));

/**
 * GET /api/form-entries
 * List all saved form entries with pagination
 */
router.get('/', asyncHandler(async (req, res) => {
    const fileList = await serverHelpers.listFormEntries();
    const entries = (await Promise.all(fileList.map(async (fileInfo) => {
            try {
                const data = await serverHelpers.readFormData(fileInfo.name);

                // Get first plaintiff name for display - check both structured and raw data
                let plaintiffName = 'Unknown Plaintiff';
                let plaintiffCount = 0;
                let defendantCount = 0;

                // Try to get from structured PlaintiffDetails first
                if (data.PlaintiffDetails && data.PlaintiffDetails.length > 0) {
                    const firstPlaintiff = data.PlaintiffDetails[0];
                    if (firstPlaintiff.PlaintiffItemNumberName && firstPlaintiff.PlaintiffItemNumberName.FirstAndLast) {
                        plaintiffName = firstPlaintiff.PlaintiffItemNumberName.FirstAndLast;
                    } else if (firstPlaintiff.PlaintiffItemNumberName && firstPlaintiff.PlaintiffItemNumberName.First && firstPlaintiff.PlaintiffItemNumberName.Last) {
                        plaintiffName = `${firstPlaintiff.PlaintiffItemNumberName.First} ${firstPlaintiff.PlaintiffItemNumberName.Last}`;
                    }
                    plaintiffCount = data.PlaintiffDetails.length;
                }

                // Count defendants from structured data
                if (data.DefendantDetails2 && data.DefendantDetails2.length > 0) {
                    defendantCount = data.DefendantDetails2.length;
                }

                // Fallback to raw data if structured data not available
                if (plaintiffName === 'Unknown Plaintiff') {
                    const firstPlaintiffFirstName = Object.keys(data).find(key =>
                        key.includes('plaintiff') && key.includes('first-name')
                    );
                    const firstPlaintiffLastName = Object.keys(data).find(key =>
                        key.includes('plaintiff') && key.includes('last-name')
                    );

                    if (firstPlaintiffFirstName && firstPlaintiffLastName) {
                        plaintiffName = `${data[firstPlaintiffFirstName]} ${data[firstPlaintiffLastName]}`;
                    }
                }

                // Extract street address from structured data
                let streetAddress = 'Unknown Address';
                if (data.Full_Address && data.Full_Address.StreetAddress) {
                    streetAddress = data.Full_Address.StreetAddress;
                } else if (data.PropertyAddressLine1) {
                    streetAddress = data.PropertyAddressLine1;
                } else if (data['property-address']) {
                    streetAddress = data['property-address'];
                }

                return {
                    id: fileInfo.name.replace('form-entry-', '').replace('.json', ''),
                    filename: fileInfo.name,
                    timestamp: data.serverTimestamp || fileInfo.updated,
                    submittedAt: data.serverTimestamp || fileInfo.updated, // Frontend expects submittedAt
                    serverTimestamp: data.serverTimestamp || fileInfo.updated, // Fallback field
                    streetAddress: streetAddress, // Frontend expects streetAddress
                    plaintiffName: plaintiffName,
                    plaintiffCount: plaintiffCount,
                    defendantCount: defendantCount,
                    documentTypes: data.documentTypesToGenerate || ['srogs', 'pods', 'admissions'], // Include document types
                    size: fileInfo.size
                };
            } catch (error) {
                logger.error(`Error reading form entry ${fileInfo.name}:`, error);
                return null;
            }
        })))
        .filter(entry => entry !== null)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
        success: true,
        count: entries.length,
        entries: entries
    });
}));

/**
 * GET /api/form-entries/:id
 * Get single form submission by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const filename = `form-entry-${req.params.id}.json`;
    const data = await serverHelpers.readFormData(filename);

    if (!data) {
        return res.status(404).json({
            success: false,
            error: 'Form entry not found'
        });
    }

    // Frontend expects data.entry, not data.data
    res.json({
        success: true,
        entry: data,  // Changed from "data: data" to "entry: data"
        data: data    // Keep for backward compatibility
    });
}));

/**
 * DELETE /api/form-entries/clear-all
 * Clear all form submissions (dev/testing only)
 */
router.delete('/clear-all', asyncHandler(async (req, res) => {
    const fileList = await serverHelpers.listFormEntries();

    // Delete all files
    const deletePromises = fileList.map(fileInfo =>
        serverHelpers.deleteFormData(fileInfo.name)
            .catch(error => {
                console.error(`Error deleting ${fileInfo.name}:`, error);
                return { error: error.message, file: fileInfo.name };
            })
    );

    const results = await Promise.all(deletePromises);
    const errors = results.filter(r => r && r.error);

    res.json({
        success: true,
        message: `Deleted ${fileList.length} form entries`,
        deletedCount: fileList.length - errors.length,
        errors: errors.length > 0 ? errors : undefined
    });
}));

/**
 * PUT /api/form-entries/:id
 * Update existing form submission
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const filename = `form-entry-${req.params.id}.json`;

    // Check if file exists
    const existingData = await serverHelpers.readFormData(filename);
    if (!existingData) {
        return res.status(404).json({
            success: false,
            error: 'Form entry not found'
        });
    }

    // Update the data
    const updatedData = {
        ...existingData,
        ...req.body,
        updatedAt: new Date().toISOString()
    };

    // Save updated data
    await serverHelpers.saveFormData(filename, updatedData);

    res.json({
        success: true,
        message: 'Form entry updated successfully',
        data: updatedData
    });
}));

/**
 * DELETE /api/form-entries/:id
 * Delete single form submission
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const filename = `form-entry-${req.params.id}.json`;

    // Check if file exists first
    try {
        await serverHelpers.readFormData(filename);
    } catch (error) {
        return res.status(404).json({
            success: false,
            error: 'Form entry not found'
        });
    }

    // Delete the file
    await serverHelpers.deleteFormData(filename);

    res.json({
        success: true,
        message: 'Form entry deleted successfully',
        id: req.params.id
    });
}));

// Export router and initialization function
module.exports = router;
module.exports.initializeRouter = initializeRouter;
