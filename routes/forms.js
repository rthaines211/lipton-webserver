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
const { getPool } = require('../server/services/database-service');

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

// ============================================================================
// Phase 7B.3: Document Logging Hook for CRM Dashboard
// ============================================================================
/**
 * Log generated documents and update dashboard status
 * Called after pipeline completes successfully
 *
 * @param {Object} formData - Original form data
 * @param {Object} pipelineResult - Result from pipeline execution
 * @param {Array<string>} documentTypes - Document types that were generated
 */
async function logGeneratedDocuments(formData, pipelineResult, documentTypes) {
    const intakeId = formData.intakeId || formData.intake_id;
    if (!intakeId) {
        logger.info('No intake_id in form data, skipping CRM dashboard document logging');
        return;
    }

    try {
        const pool = getPool();

        // Find dashboard entry for this intake
        const dashboardResult = await pool.query(
            'SELECT id FROM case_dashboard WHERE intake_id = $1',
            [intakeId]
        );

        if (dashboardResult.rows.length === 0) {
            logger.warn('No dashboard entry found for intake, skipping document logging', { intakeId });
            return;
        }

        const dashboardId = dashboardResult.rows[0].id;
        const webhookSummary = pipelineResult.webhook_summary || {};
        const totalDocs = webhookSummary.total_sets || documentTypes.length;

        // Log each document type as a generated document
        for (const docType of documentTypes) {
            await pool.query(`
                INSERT INTO generated_documents (intake_id, document_type, document_name, generated_by, status)
                VALUES ($1, $2, $3, 'system', 'generated')
                ON CONFLICT DO NOTHING
            `, [intakeId, docType, `${docType.toUpperCase()} Document Set`]);
        }

        // Update dashboard status to 'docs_generated' and record counts
        await pool.query(`
            UPDATE case_dashboard
            SET status = CASE
                  WHEN status IN ('new', 'in_review', 'docs_in_progress') THEN 'docs_generated'
                  ELSE status
                END,
                status_changed_by = 'system',
                docs_generated_at = CURRENT_TIMESTAMP,
                docs_generated_by = 'system',
                last_doc_gen_count = $1
            WHERE id = $2
            RETURNING status
        `, [totalDocs, dashboardId]);

        // Log activity
        await pool.query(`
            INSERT INTO case_activities (dashboard_id, intake_id, activity_type, description, performed_by, metadata)
            VALUES ($1, $2, 'doc_generated', $3, 'system', $4)
        `, [
            dashboardId,
            intakeId,
            `Generated ${totalDocs} document set(s): ${documentTypes.join(', ')}`,
            JSON.stringify({ documentTypes, totalSets: totalDocs, executionTime: pipelineResult.executionTime })
        ]);

        logger.info('Documents logged to CRM dashboard', {
            intakeId,
            dashboardId,
            documentTypes,
            totalDocs
        });

    } catch (error) {
        // Log error but don't fail - this is a non-critical operation
        logger.error('Failed to log documents to CRM dashboard', {
            intakeId,
            error: error.message
        });
    }
}
// ============================================================================

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
    logger.debug('Received form data', { formId: formData.id });

    // Validate required fields - check for at least one plaintiff
    const hasPlaintiff = Object.keys(formData).some(key =>
        key.includes('plaintiff') && key.includes('first-name') && formData[key]
    );

    if (!formData.id || !hasPlaintiff) {
        logger.warn('Form validation failed', { hasId: !!formData.id, hasPlaintiff });
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
    const validTypes = ['srogs', 'pods', 'admissions', 'cm110'];

    // Validate: must be an array
    if (!Array.isArray(documentTypesToGenerate)) {
        logger.warn('Invalid documentTypesToGenerate: not an array');
        return res.status(400).json({
            success: false,
            error: 'documentTypesToGenerate must be an array'
        });
    }

    // Validate: at least one document type required
    if (documentTypesToGenerate.length === 0) {
        logger.warn('Invalid documentTypesToGenerate: empty array');
        return res.status(400).json({
            success: false,
            error: 'At least one document type must be selected'
        });
    }

    // Validate: all types must be valid
    const invalidTypes = documentTypesToGenerate.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
        logger.warn('Invalid document types submitted', { invalidTypes });
        return res.status(400).json({
            success: false,
            error: 'Invalid document types',
            invalidTypes: invalidTypes
        });
    }

    logger.info('Document types to generate', { documentTypes: documentTypesToGenerate });
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

    logger.info('Form entry saved', { filename });

    // Record form submission metrics
    const plaintiffCount = originalFormatData.PlaintiffDetails?.length || 0;
    const defendantCount = originalFormatData.DefendantDetails2?.length || 0;
    const processingTime = (Date.now() - Date.parse(originalFormatData.serverTimestamp || new Date().toISOString())) / 1000;
    metricsModule.recordFormSubmission(true, plaintiffCount, defendantCount, processingTime);

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
        logger.info('Form entry saved to database', { caseId: dbCaseId });

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
        logger.error('Database save failed, but JSON file was saved', { error: dbError.message });
        // Continue - don't fail the request if database fails
    }

    // ============================================================
    // DETERMINE CASE ID FOR TRACKING
    // ============================================================
    // Use database case ID if available, otherwise fall back to form ID
    // This ensures progress tracking works even if database save fails
    const trackingCaseId = dbCaseId || formData.id;

    // ============================================================
    // SEND RESPONSE IMMEDIATELY - DON'T WAIT FOR PIPELINE
    // ============================================================
    // Send the response NOW so the frontend can reset the form immediately.
    // The pipeline will continue running in the background, and the frontend
    // will poll /api/pipeline-status/:caseId to get real-time progress updates.
    // ============================================================

    // IMPORTANT: Send the database case ID for SSE progress tracking
    // The Python pipeline uses this ID to broadcast progress updates

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
    logger.info('Starting background pipeline execution', {
        trackingCaseId,
        dbCaseId,
        formId: formData.id,
        pipelineEnabled: serverHelpers.PIPELINE_CONFIG.enabled,
        executeOnSubmit: serverHelpers.PIPELINE_CONFIG.executeOnSubmit
    });

    pipelineService.callNormalizationPipeline(originalFormatData, trackingCaseId, documentTypesToGenerate)
        .then(async (pipelineResult) => {
            if (pipelineResult.success) {
                logger.info('Pipeline completed successfully', {
                    caseId: dbCaseId,
                    executionTime: pipelineResult.executionTime
                });
                // Record successful pipeline execution
                metricsModule.recordPipelineExecution(true, pipelineResult.executionTime / 1000, pipelineResult.phase || 'complete');

                // Phase 7B.3: Log documents and update dashboard status
                await logGeneratedDocuments(originalFormatData, pipelineResult, documentTypesToGenerate);
            } else if (pipelineResult.skipped) {
                logger.info('Pipeline skipped', { reason: pipelineResult.reason });
            } else {
                logger.warn('Pipeline failed (form was saved)', { error: pipelineResult.error });
                // Record failed pipeline execution
                metricsModule.recordPipelineExecution(false, pipelineResult.executionTime / 1000 || 0, pipelineResult.phase || 'error');
            }
        })
        .catch((pipelineError) => {
            logger.error('Pipeline execution error', {
                error: pipelineError.message,
                stack: pipelineError.stack
            });
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
                logger.error('Error reading form entry', { file: fileInfo.name, error: error.message });
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

    // Transform array-based discovery data to individual checkbox fields for doc-gen form
    if (data.PlaintiffDetails && data.PlaintiffDetails.length > 0) {
        const plaintiff = data.PlaintiffDetails[0];
        const discovery = plaintiff.PlaintiffItemNumberDiscovery || {};

        const transformed = {
            ...data,

            // ===== VERMIN ISSUES (6 items) =====
            'vermin-RatsMice-1': discovery.Vermin?.includes('Rats/Mice') || false,
            'vermin-Bats-1': discovery.Vermin?.includes('Bats') || false,
            'vermin-Pigeons-1': discovery.Vermin?.includes('Pigeons') || false,
            'vermin-Skunks-1': discovery.Vermin?.includes('Skunks') || false,
            'vermin-Raccoons-1': discovery.Vermin?.includes('Raccoons') || false,
            'vermin-Opossums-1': discovery.Vermin?.includes('Opossums') || false,

            // ===== INSECT ISSUES (10 items) =====
            'insect-Ants-1': discovery.Insects?.includes('Ants') || false,
            'insect-Bedbugs-1': discovery.Insects?.includes('Bedbugs') || false,
            'insect-Spiders-1': discovery.Insects?.includes('Spiders') || false,
            'insect-Mosquitos-1': discovery.Insects?.includes('Mosquitos') || false,
            'insect-Roaches-1': discovery.Insects?.includes('Roaches') || false,
            'insect-Wasps-1': discovery.Insects?.includes('Wasps') || false,
            'insect-Termites-1': discovery.Insects?.includes('Termites') || false,
            'insect-Bees-1': discovery.Insects?.includes('Bees') || false,
            'insect-Flies-1': discovery.Insects?.includes('Flies') || false,
            'insect-Hornets-1': discovery.Insects?.includes('Hornets') || false,

            // ===== PLUMBING ISSUES (12 items) =====
            'plumbing-Toilet-1': discovery.Plumbing?.includes('Toilet') || false,
            'plumbing-Sink-1': discovery.Plumbing?.includes('Sink') || false,
            'plumbing-Bathtub-1': discovery.Plumbing?.includes('Bathtub') || false,
            'plumbing-Shower-1': discovery.Plumbing?.includes('Shower') || false,
            'plumbing-WaterHeater-1': discovery.Plumbing?.includes('Water Heater') || false,
            'plumbing-Faucets-1': discovery.Plumbing?.includes('Faucets') || false,
            'plumbing-Pipes-1': discovery.Plumbing?.includes('Pipes') || false,
            'plumbing-Drainage-1': discovery.Plumbing?.includes('Drainage') || false,
            'plumbing-Leaks-1': discovery.Plumbing?.includes('Leaks') || false,
            'plumbing-Clogs-1': discovery.Plumbing?.includes('Clogs') || false,
            'plumbing-Pressure-1': discovery.Plumbing?.includes('Pressure') || false,
            'plumbing-SewerSmell-1': discovery.Plumbing?.includes('Sewer Smell') || false,

            // ===== ELECTRICAL ISSUES (7 items) =====
            'electrical-Outlets-1': discovery.Electrical?.includes('Outlets') || false,
            'electrical-Switches-1': discovery.Electrical?.includes('Switches') || false,
            'electrical-Wiring-1': discovery.Electrical?.includes('Wiring') || false,
            'electrical-Breakers-1': discovery.Electrical?.includes('Breakers') || false,
            'electrical-Lighting-1': discovery.Electrical?.includes('Lighting') || false,
            'electrical-Panel-1': discovery.Electrical?.includes('Panel') || false,
            'electrical-Fixtures-1': discovery.Electrical?.includes('Fixtures') || false,

            // ===== HVAC ISSUES (3 items) =====
            'hvac-AirConditioner-1': discovery.HVAC?.includes('Air Conditioner') || false,
            'hvac-Heater-1': discovery.HVAC?.includes('Heater') || false,
            'hvac-Ventilation-1': discovery.HVAC?.includes('Ventilation') || false,

            // ===== APPLIANCE ISSUES (6 items) =====
            'appliances-Refrigerator-1': discovery.Appliances?.includes('Refrigerator') || false,
            'appliances-Stove-1': discovery.Appliances?.includes('Stove') || false,
            'appliances-Oven-1': discovery.Appliances?.includes('Oven') || false,
            'appliances-Dishwasher-1': discovery.Appliances?.includes('Dishwasher') || false,
            'appliances-GarbageDisposal-1': discovery.Appliances?.includes('Garbage Disposal') || false,
            'appliances-Microwave-1': discovery.Appliances?.includes('Microwave') || false,

            // ===== HEALTH HAZARD ISSUES (10 items) =====
            'health-hazard-Mold-1': discovery['Health hazard']?.includes('Mold') || false,
            'health-hazard-Mildew-1': discovery['Health hazard']?.includes('Mildew') || false,
            'health-hazard-LeadPaint-1': discovery['Health hazard']?.includes('Lead Paint') || false,
            'health-hazard-Asbestos-1': discovery['Health hazard']?.includes('Asbestos') || false,
            'health-hazard-SewageBackup-1': discovery['Health hazard']?.includes('Sewage Backup') || false,
            'health-hazard-WaterDamage-1': discovery['Health hazard']?.includes('Water Damage') || false,
            'health-hazard-Flooding-1': discovery['Health hazard']?.includes('Flooding') || false,
            'health-hazard-GasLeak-1': discovery['Health hazard']?.includes('Gas Leak') || false,
            'health-hazard-CarbonMonoxide-1': discovery['Health hazard']?.includes('Carbon Monoxide') || false,
            'health-hazard-AirQuality-1': discovery['Health hazard']?.includes('Air Quality') || false,

            // ===== STRUCTURAL ISSUES (10 items) =====
            'structure-Foundation-1': discovery.Structure?.includes('Foundation') || false,
            'structure-Walls-1': discovery.Structure?.includes('Walls') || false,
            'structure-Ceiling-1': discovery.Structure?.includes('Ceiling') || false,
            'structure-Roof-1': discovery.Structure?.includes('Roof') || false,
            'structure-Stairs-1': discovery.Structure?.includes('Stairs') || false,
            'structure-Railings-1': discovery.Structure?.includes('Railings') || false,
            'structure-Balcony-1': discovery.Structure?.includes('Balcony') || false,
            'structure-Porch-1': discovery.Structure?.includes('Porch') || false,
            'structure-Cracks-1': discovery.Structure?.includes('Cracks') || false,
            'structure-Sagging-1': discovery.Structure?.includes('Sagging') || false,

            // ===== FLOORING ISSUES (7 items) =====
            'flooring-Carpet-1': discovery.Flooring?.includes('Carpet') || false,
            'flooring-Tile-1': discovery.Flooring?.includes('Tile') || false,
            'flooring-Hardwood-1': discovery.Flooring?.includes('Hardwood') || false,
            'flooring-Linoleum-1': discovery.Flooring?.includes('Linoleum') || false,
            'flooring-Uneven-1': discovery.Flooring?.includes('Uneven') || false,
            'flooring-Damage-1': discovery.Flooring?.includes('Damage') || false,
            'flooring-Subfloor-1': discovery.Flooring?.includes('Subfloor') || false,

            // ===== CABINET ISSUES (4 items) =====
            'cabinets-Kitchen-1': discovery.Cabinets?.includes('Kitchen') || false,
            'cabinets-Bathroom-1': discovery.Cabinets?.includes('Bathroom') || false,
            'cabinets-Counters-1': discovery.Cabinets?.includes('Counters') || false,
            'cabinets-Hardware-1': discovery.Cabinets?.includes('Hardware') || false,

            // ===== DOOR ISSUES (5 items) =====
            'door-Entry-1': discovery.Doors?.includes('Entry') || false,
            'door-Interior-1': discovery.Doors?.includes('Interior') || false,
            'door-Locks-1': discovery.Doors?.includes('Locks') || false,
            'door-Frames-1': discovery.Doors?.includes('Frames') || false,
            'door-Threshold-1': discovery.Doors?.includes('Threshold') || false,

            // ===== WINDOW ISSUES (6 items) =====
            'windows-Broken-1': discovery.Windows?.includes('Broken') || false,
            'windows-Cracked-1': discovery.Windows?.includes('Cracked') || false,
            'windows-Seals-1': discovery.Windows?.includes('Seals') || false,
            'windows-Locks-1': discovery.Windows?.includes('Locks') || false,
            'windows-Screens-1': discovery.Windows?.includes('Screens') || false,
            'windows-Frames-1': discovery.Windows?.includes('Frames') || false,

            // ===== FIRE HAZARD ISSUES (5 items) =====
            'fire-hazard-SmokeDetectors-1': discovery['Fire Hazard']?.includes('Smoke Detectors') || false,
            'fire-hazard-CarbonMonoxideDetector-1': discovery['Fire Hazard']?.includes('Carbon Monoxide Detector') || false,
            'fire-hazard-FireExtinguisher-1': discovery['Fire Hazard']?.includes('Fire Extinguisher') || false,
            'fire-hazard-EmergencyExits-1': discovery['Fire Hazard']?.includes('Emergency Exits') || false,
            'fire-hazard-Uneffective-1': discovery['Fire Hazard']?.includes('Uneffective') || discovery['Fire Hazard']?.includes('Ineffective') || false,

            // ===== NUISANCE ISSUES (8 items) =====
            'nuisance-Noise-1': discovery.Nuisance?.includes('Noise') || false,
            'nuisance-Odors-1': discovery.Nuisance?.includes('Odors') || false,
            'nuisance-Pests-1': discovery.Nuisance?.includes('Pests') || false,
            'nuisance-Vibrations-1': discovery.Nuisance?.includes('Vibrations') || false,
            'nuisance-Smoke-1': discovery.Nuisance?.includes('Smoke') || false,
            'nuisance-Light-1': discovery.Nuisance?.includes('Light') || false,
            'nuisance-Privacy-1': discovery.Nuisance?.includes('Privacy') || false,
            'nuisance-Access-1': discovery.Nuisance?.includes('Access') || false,

            // ===== TRASH ISSUES (5 items) =====
            'trash-Collection-1': discovery['Select Trash Problems']?.includes('Collection') || false,
            'trash-Bins-1': discovery['Select Trash Problems']?.includes('Bins') || false,
            'trash-Disposal-1': discovery['Select Trash Problems']?.includes('Disposal') || false,
            'trash-Overflowing-1': discovery['Select Trash Problems']?.includes('Overflowing') || false,
            'trash-Pests-1': discovery['Select Trash Problems']?.includes('Pests') || false,

            // ===== COMMON AREA ISSUES (9 items) =====
            'common-areas-Hallways-1': discovery['Common areas']?.includes('Hallways') || false,
            'common-areas-Stairwells-1': discovery['Common areas']?.includes('Stairwells') || false,
            'common-areas-Elevators-1': discovery['Common areas']?.includes('Elevators') || false,
            'common-areas-Laundry-1': discovery['Common areas']?.includes('Laundry') || false,
            'common-areas-Parking-1': discovery['Common areas']?.includes('Parking') || false,
            'common-areas-Mailboxes-1': discovery['Common areas']?.includes('Mailboxes') || false,
            'common-areas-Lighting-1': discovery['Common areas']?.includes('Lighting') || false,
            'common-areas-Cleanliness-1': discovery['Common areas']?.includes('Cleanliness') || false,
            'common-areas-Security-1': discovery['Common areas']?.includes('Security') || false,

            // ===== NOTICE ISSUES (7 items) =====
            'notices-Eviction-1': discovery['Select Notices Issues']?.includes('Eviction') || false,
            'notices-Rent-1': discovery['Select Notices Issues']?.includes('Rent') || false,
            'notices-Inspection-1': discovery['Select Notices Issues']?.includes('Inspection') || false,
            'notices-Entry-1': discovery['Select Notices Issues']?.includes('Entry') || false,
            'notices-Violation-1': discovery['Select Notices Issues']?.includes('Violation') || false,
            'notices-Lease-1': discovery['Select Notices Issues']?.includes('Lease') || false,
            'notices-Legal-1': discovery['Select Notices Issues']?.includes('Legal') || false,

            // ===== UTILITY ISSUES (7 items) - Note: May need to check actual field name =====
            'utility-Water-1': discovery.Unit?.includes('Water') || false,
            'utility-Gas-1': discovery.Unit?.includes('Gas') || false,
            'utility-Electric-1': discovery.Unit?.includes('Electric') || false,
            'utility-Trash-1': discovery.Unit?.includes('Trash') || false,
            'utility-Sewer-1': discovery.Unit?.includes('Sewer') || false,
            'utility-Internet-1': discovery.Unit?.includes('Internet') || false,
            'utility-Billing-1': discovery.Unit?.includes('Billing') || false,

            // ===== SAFETY ISSUES (8 items) =====
            'safety-Railings-1': discovery['Select Safety Issues']?.includes('Railings') || false,
            'safety-Lighting-1': discovery['Select Safety Issues']?.includes('Lighting') || false,
            'safety-Locks-1': discovery['Select Safety Issues']?.includes('Locks') || false,
            'safety-Security-1': discovery['Select Safety Issues']?.includes('Security') || false,
            'safety-Cameras-1': discovery['Select Safety Issues']?.includes('Cameras') || false,
            'safety-Gates-1': discovery['Select Safety Issues']?.includes('Gates') || false,
            'safety-Fencing-1': discovery['Select Safety Issues']?.includes('Fencing') || false,
            'safety-Pool-1': discovery['Select Safety Issues']?.includes('Pool') || false,

            // ===== HARASSMENT ISSUES (7 items) =====
            'harassment-Verbal-1': discovery.Harassment?.includes('Verbal') || false,
            'harassment-Physical-1': discovery.Harassment?.includes('Physical') || false,
            'harassment-Sexual-1': discovery.Harassment?.includes('Sexual') || false,
            'harassment-Discrimination-1': discovery.Harassment?.includes('Discrimination') || false,
            'harassment-Retaliation-1': discovery.Harassment?.includes('Retaliation') || false,
            'harassment-Intimidation-1': discovery.Harassment?.includes('Intimidation') || false,
            'harassment-Threats-1': discovery.Harassment?.includes('Threats') || false,
        };

        return res.json({
            success: true,
            entry: transformed,
            data: transformed
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
                logger.error('Error deleting form entry', { file: fileInfo.name, error: error.message });
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
