/**
 * Pipeline Service
 * Extracted from server.js as part of Week 2 Day 3 refactoring
 *
 * Handles integration with Python normalization pipeline:
 * - Job submission and execution
 * - Real-time progress tracking
 * - Status caching for SSE streaming
 * - Document generation monitoring
 * - Email notifications on completion
 */

const axios = require('axios');
const dropboxService = require('../dropbox-service');
const emailService = require('../email-service');

/**
 * In-memory cache for pipeline job status
 * Used by SSE streaming to provide real-time updates to clients
 *
 * Structure:
 * {
 *   [caseId]: {
 *     status: 'processing' | 'success' | 'failed' | 'skipped',
 *     phase: string,
 *     progress: number (0-100),
 *     currentPhase: string,
 *     totalPhases: number,
 *     startTime: number,
 *     endTime: number | null,
 *     executionTime: number | null,
 *     error: string | null,
 *     result: object | null,
 *     documentProgress: { completed, total, current },
 *     webhookSummary: object | null,
 *     expiresAt: number
 *   }
 * }
 */
class PipelineService {
    constructor() {
        this.config = {
            enabled: process.env.PIPELINE_API_ENABLED === 'true',
            executeOnSubmit: process.env.EXECUTE_PIPELINE_ON_SUBMIT === 'true',
            apiUrl: process.env.PIPELINE_API_URL || 'http://localhost:5001',
            apiKey: process.env.PIPELINE_API_KEY || null,
            timeout: parseInt(process.env.PIPELINE_TIMEOUT) || 300000, // 5 minutes default
            continueOnFailure: process.env.PIPELINE_CONTINUE_ON_FAILURE !== 'false'
        };

        this.pool = null;
        this._fallback = new Map(); // instance-local safety net, used only on DB error

        // Start periodic cache cleanup
        this.startCacheCleanup();
    }

    /**
     * Inject the shared pg Pool. Called once from server.js after the pool is created.
     * @param {import('pg').Pool} pool
     */
    setPool(pool) {
        this.pool = pool;
    }

    /**
     * Store pipeline status. Upserts to Postgres; falls back to an instance-local
     * Map on DB error so the pipeline never crashes on a status write.
     * @param {string} caseId
     * @param {Object} statusData
     */
    async setPipelineStatus(caseId, statusData) {
        try {
            if (!this.pool) throw new Error('pipeline status pool not initialized');
            await this.pool.query(
                `INSERT INTO pipeline_status (case_id, status, expires_at)
                 VALUES ($1, $2, NOW() + interval '15 minutes')
                 ON CONFLICT (case_id) DO UPDATE
                   SET status = $2, expires_at = NOW() + interval '15 minutes'`,
                [caseId, JSON.stringify(statusData)]
            );
        } catch (err) {
            // ponytail: in-memory fallback is instance-local; DB is source of truth, covers DB blips only
            console.warn(`⚠️  pipeline status DB write failed for ${caseId}, using fallback: ${err.message}`);
            this._fallback.set(caseId, { ...statusData, expiresAt: Date.now() + 15 * 60 * 1000 });
        }
    }

    /**
     * Retrieve pipeline status. Reads from Postgres; on DB error, reads the
     * instance-local fallback. Returns null if neither has a live entry.
     * @param {string} caseId
     * @returns {Promise<Object|null>}
     */
    async getPipelineStatus(caseId) {
        try {
            if (!this.pool) throw new Error('pipeline status pool not initialized');
            const { rows } = await this.pool.query(
                `SELECT status FROM pipeline_status WHERE case_id = $1 AND expires_at > NOW()`,
                [caseId]
            );
            return rows[0] ? rows[0].status : null;
        } catch (err) {
            console.warn(`⚠️  pipeline status DB read failed for ${caseId}, using fallback: ${err.message}`);
            const fb = this._fallback.get(caseId);
            if (fb && Date.now() <= fb.expiresAt) {
                const { expiresAt, ...status } = fb;
                return status;
            }
            return null;
        }
    }

    /**
     * Delete expired status rows. Idempotent; safe to run from every instance.
     */
    async cleanupExpiredCache() {
        try {
            if (!this.pool) return;
            // ponytail: every instance runs the sweep; idempotent DELETE, no lock needed
            const { rowCount } = await this.pool.query(
                `DELETE FROM pipeline_status WHERE expires_at < NOW()`
            );
            if (rowCount > 0) console.log(`🧹 Cleaned ${rowCount} expired pipeline status rows`);
        } catch (err) {
            console.warn(`⚠️  pipeline status cleanup failed: ${err.message}`);
        }
    }

    /**
     * Start periodic cache cleanup (every 5 minutes)
     */
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache().catch(() => {});
        }, 5 * 60 * 1000);
    }

    /**
     * Check if pipeline API is healthy
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        if (!this.config.enabled) {
            return false;
        }

        try {
            const response = await axios.get(`${this.config.apiUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.warn('⚠️  Pipeline health check failed:', error.message);
            return false;
        }
    }

    /**
     * Transform form data for Python API compatibility
     * Handles field name conversions and formatting
     * @param {Object} data - Form data to transform
     * @private
     */
    _transformForPythonAPI(data) {
        const transformed = { ...data };

        // Convert ItemNumber to item_number for PlaintiffDetails
        if (transformed.PlaintiffDetails && Array.isArray(transformed.PlaintiffDetails)) {
            transformed.PlaintiffDetails = transformed.PlaintiffDetails.map(plaintiff => ({
                ...plaintiff,
                item_number: plaintiff.ItemNumber || plaintiff.item_number || 1
            }));
        }

        // Convert ItemNumber to item_number for DefendantDetails2
        if (transformed.DefendantDetails2 && Array.isArray(transformed.DefendantDetails2)) {
            transformed.DefendantDetails2 = transformed.DefendantDetails2.map(defendant => ({
                ...defendant,
                item_number: defendant.ItemNumber || defendant.item_number || 1
            }));
        }

        // Add property_address and zip fields that Python expects
        if (transformed.Full_Address) {
            transformed.property_address = transformed.Full_Address.StreetAddress ||
                                         transformed.Full_Address.Line1 ||
                                         transformed.streetAddress ||
                                         '';
            transformed.zip = transformed.Full_Address.PostalCode ||
                           transformed.Full_Address.zipCode ||
                           transformed.zipCode ||
                           '';

            // Also ensure Full_Address has the expected fields
            transformed.Full_Address.property_address = transformed.property_address;
            transformed.Full_Address.zip = transformed.zip;
        }

        // CRITICAL FIX: Ensure filing fields are sent to Python
        // Keys with spaces don't serialize properly via axios
        const filingCity = transformed['Filing city'] || transformed.FilingCity || '';
        const filingCounty = transformed['Filing county'] || transformed.FilingCounty || '';
        const notifOptIn = transformed['Notification Email Opt-In'] || false;
        const notifEmail = transformed['Notification Email'] || null;

        // Delete the space-separated keys that axios can't serialize
        delete transformed['Filing city'];
        delete transformed['Filing county'];
        delete transformed['Notification Email Opt-In'];
        delete transformed['Notification Email'];

        // Set PascalCase versions that axios CAN serialize
        transformed.FilingCity = filingCity;
        transformed.FilingCounty = filingCounty;
        transformed.NotificationEmailOptIn = notifOptIn;
        transformed.NotificationEmail = notifEmail;

        return transformed;
    }

    /**
     * Send email notification on pipeline completion
     * @param {Object} formData - Form submission data
     * @param {string} caseId - Case identifier
     * @param {Object} webhookSummary - Document generation summary
     * @private
     */
    async _sendCompletionEmail(formData, caseId, webhookSummary) {
        const shouldSendEmail = formData.NotificationEmail &&
                               formData.NotificationEmailOptIn === true;

        if (!shouldSendEmail) {
            console.log(`ℹ️  Email notification skipped (user did not opt in)`);
            return;
        }

        console.log(`📧 Preparing email notification for: ${formData.NotificationEmail}`);

        // Run email sending async (non-blocking)
        (async () => {
            try {
                // Extract street address from form data
                const streetAddress =
                    formData['Property address'] ||
                    formData.Full_Address?.StreetAddress ||
                    formData['street-address'] ||
                    'your property';

                console.log(`📍 Property address: ${streetAddress}`);

                // Try to get Dropbox shared link (if Dropbox enabled)
                let dropboxLink = null;

                if (dropboxService.isEnabled()) {
                    const folderPath = `${dropboxService.config.basePath}/${streetAddress}`;
                    console.log(`📁 Checking Dropbox folder: ${folderPath}`);

                    dropboxLink = await dropboxService.createSharedLink(folderPath);

                    if (dropboxLink) {
                        console.log(`✅ Dropbox link generated successfully`);
                    } else {
                        console.log(`⚠️  Dropbox link generation failed (will send email without link)`);
                    }
                } else {
                    console.log(`ℹ️  Dropbox disabled (will send email without link)`);
                }

                // Send email notification
                const emailResult = await emailService.sendCompletionNotification({
                    to: formData.NotificationEmail,
                    name: formData.NotificationName || 'User',
                    streetAddress: streetAddress,
                    caseId: caseId,
                    dropboxLink: dropboxLink,
                    documentCount: webhookSummary?.total_sets || 32
                });

                if (emailResult.success) {
                    console.log(`✅ Email notification sent successfully to ${formData.NotificationEmail}`);
                } else {
                    console.error(`❌ Email notification failed: ${emailResult.error}`);
                }

            } catch (emailError) {
                // Log error but don't fail the pipeline
                console.error('❌ Email notification error (non-blocking):', emailError);
            }
        })();
    }

    /**
     * Poll Python API for document generation progress
     * Updates status cache with real-time progress
     * @param {string} caseId - Case identifier
     * @returns {Function} Cleanup function to stop polling
     * @private
     */
    _startProgressPolling(caseId) {
        console.log(`🚀 Starting document progress polling for case ${caseId} every 2 seconds...`);

        const progressInterval = setInterval(async () => {
            try {
                console.log(`🔄 Polling document progress for case ${caseId}...`);
                const progressResponse = await axios.get(
                    `${this.config.apiUrl}/api/progress/${caseId}`,
                    { timeout: 10000 }
                );

                console.log(`📡 Progress response received:`, JSON.stringify(progressResponse.data));

                if (progressResponse.data && progressResponse.data.total > 0) {
                    const docProgress = {
                        completed: progressResponse.data.completed,
                        total: progressResponse.data.total,
                        current: progressResponse.data.current_doc
                    };

                    console.log(`📊 Document progress: ${docProgress.completed}/${docProgress.total} - ${docProgress.current}`);

                    // Update cache with document progress
                    const currentStatus = await this.getPipelineStatus(caseId);
                    // ponytail: never let a slow poller tick clobber a terminal status.
                    // The success/failed write can land while this callback is awaiting;
                    // without this guard it overwrites 'success' back to 'processing'.
                    if (currentStatus && currentStatus.status !== 'success' && currentStatus.status !== 'failed') {
                        console.log(`✅ Updating pipeline status cache with document progress`);
                        await this.setPipelineStatus(caseId, {
                            ...currentStatus,
                            documentProgress: docProgress,
                            currentPhase: `Generating legal documents... (${docProgress.completed}/${docProgress.total} completed)`,
                            progress: Math.min(90, 40 + (docProgress.completed / docProgress.total) * 50)
                        });
                    } else {
                        console.warn(`⚠️  No current status found in cache for case ${caseId}`);
                    }
                } else {
                    console.log(`⏳ No document progress data yet (total: ${progressResponse.data?.total || 0})`);
                }
            } catch (error) {
                // Progress polling failed, but don't fail the main pipeline
                console.log(`⚠️  Progress polling failed: ${error.message}`);
            }
        }, 2000);

        // Return cleanup function
        return () => {
            clearInterval(progressInterval);
            console.log(`🧹 Progress polling cleaned up for case ${caseId}`);
        };
    }

    /**
     * Call normalization pipeline for document generation
     *
     * @param {Object} structuredData - The structured form data
     * @param {string} caseId - The database case ID for reference
     * @param {Array<string>} documentTypes - Array of document types to generate
     * @returns {Promise<Object>} Pipeline execution results
     */
    async callNormalizationPipeline(structuredData, caseId, documentTypes = ['srogs', 'pods', 'admissions']) {
        // Check if pipeline is enabled
        if (!this.config.enabled || !this.config.executeOnSubmit) {
            await this.setPipelineStatus(caseId, {
                status: 'skipped',
                phase: 'complete',
                progress: 100,
                currentPhase: null,
                totalPhases: 5,
                startTime: Date.now(),
                endTime: Date.now(),
                executionTime: 0,
                error: null,
                result: { reason: 'Pipeline disabled in configuration' }
            });
            return { skipped: true, reason: 'Pipeline disabled in configuration' };
        }

        try {
            console.log(`📋 Calling normalization pipeline (Case ID: ${caseId})...`);
            const startTime = Date.now();

            // Store initial processing status in cache
            await this.setPipelineStatus(caseId, {
                status: 'processing',
                phase: 'pipeline_started',
                progress: 40,
                currentPhase: 'Generating legal documents...',
                totalPhases: 5,
                startTime: startTime,
                endTime: null,
                executionTime: null,
                error: null,
                result: null,
                documentProgress: { completed: 0, total: 0, current: '' }
            });

            // Prepare headers
            const headers = { 'Content-Type': 'application/json' };
            if (this.config.apiKey) {
                headers['X-API-Key'] = this.config.apiKey;
            }

            // Transform data for Python API compatibility
            const transformedData = this._transformForPythonAPI(structuredData);

            // Add case ID and document types to request
            transformedData.case_id = caseId;
            transformedData.document_types = documentTypes;
            console.log(`📄 Passing document types to pipeline: ${documentTypes.join(', ')}`);

            // Wait 1.5 seconds for SSE connection to establish
            console.log(`⏸️  Waiting 1.5 seconds for SSE connection to establish...`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Start the pipeline in the background
            const pipelinePromise = axios.post(
                `${this.config.apiUrl}/api/normalize`,
                transformedData,
                {
                    headers: headers,
                    timeout: this.config.timeout,
                    validateStatus: (status) => status < 500
                }
            );

            // Start progress polling
            const stopPolling = this._startProgressPolling(caseId);

            // Ensure progress polling is always cleaned up
            try {
                // Wait for pipeline completion
                const response = await pipelinePromise;
                const executionTime = Date.now() - startTime;

                if (response.data.success) {
                    console.log(`✅ Pipeline completed successfully in ${executionTime}ms`);

                    // Extract webhook summary
                    const webhookSummary = response.data.webhook_summary || null;
                    if (webhookSummary) {
                        console.log(`📄 Documents generated: ${webhookSummary.total_sets} (${webhookSummary.succeeded} succeeded, ${webhookSummary.failed} failed)`);
                    }

                    if (response.data.phase_results) {
                        Object.entries(response.data.phase_results).forEach(([phase, results]) => {
                            console.log(`   - ${phase}:`, JSON.stringify(results));
                        });
                    }

                    // ponytail: stop the progress poller BEFORE writing success so no
                    // in-flight poller tick can overwrite the terminal status. The finally
                    // block calls stopPolling() again — clearInterval is idempotent.
                    stopPolling();

                    // Store success status in cache
                    const outputUrl = webhookSummary?.output_url || response.data?.output_url || '';
                    console.log(`🔗 Dropbox output_url for ${caseId}: ${outputUrl}`);
                    await this.setPipelineStatus(caseId, {
                        status: 'success',
                        phase: 'complete',
                        progress: 100,
                        currentPhase: webhookSummary ? `Generated ${webhookSummary.total_sets} documents` : 'Complete',
                        totalPhases: 5,
                        startTime: startTime,
                        endTime: Date.now(),
                        executionTime: executionTime,
                        error: null,
                        result: { ...response.data, output_url: outputUrl },
                        webhookSummary: webhookSummary
                    });

                    // Send email notification (async, non-blocking)
                    await this._sendCompletionEmail(transformedData, caseId, webhookSummary);

                    return {
                        success: true,
                        executionTime: executionTime,
                        case_id: caseId,
                        ...response.data
                    };

                } else {
                    // Pipeline failed
                    const errorMessage = response.data.error || 'Unknown pipeline error';
                    console.error(`❌ Pipeline failed: ${errorMessage}`);

                    await this.setPipelineStatus(caseId, {
                        status: 'failed',
                        phase: 'failed',
                        progress: 0,
                        currentPhase: null,
                        totalPhases: 5,
                        startTime: startTime,
                        endTime: Date.now(),
                        executionTime: executionTime,
                        error: errorMessage,
                        result: null
                    });

                    if (this.config.continueOnFailure) {
                        console.log('⚠️  Continuing despite pipeline failure');
                        return {
                            success: false,
                            error: errorMessage,
                            case_id: caseId,
                            continued: true
                        };
                    } else {
                        throw new Error(`Pipeline failed: ${errorMessage}`);
                    }
                }
            } finally {
                // Always cleanup progress polling
                stopPolling();
            }

        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message;
            console.error('❌ Pipeline API call failed:', errorMessage);

            if (error.code === 'ECONNREFUSED') {
                console.error(`   ⚠️  Connection refused - is the Python API running on ${this.config.apiUrl}?`);
            }

            // Store error status in cache
            await this.setPipelineStatus(caseId, {
                status: 'failed',
                phase: 'failed',
                progress: 0,
                currentPhase: null,
                totalPhases: 5,
                startTime: Date.now(),
                endTime: Date.now(),
                executionTime: 0,
                error: errorMessage,
                result: null
            });

            if (this.config.continueOnFailure) {
                console.log('⚠️  Continuing despite pipeline error');
                return {
                    success: false,
                    error: errorMessage,
                    case_id: caseId,
                    continued: true
                };
            } else {
                throw error;
            }
        }
    }

    /**
     * Get pipeline configuration for display/logging
     * @returns {Object} Configuration summary
     */
    getConfig() {
        return {
            apiUrl: this.config.apiUrl,
            enabled: this.config.enabled,
            executeOnSubmit: this.config.executeOnSubmit
        };
    }
}

// Singleton instance
const pipelineService = new PipelineService();

module.exports = pipelineService;
