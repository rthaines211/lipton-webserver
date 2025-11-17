/**
 * Intake Service
 *
 * Business logic for client intake form submissions.
 * Handles creating, retrieving, searching, and updating intake records.
 * Integrates with storage and email services for complete workflow.
 *
 * @module services/intake-service
 */

const db = require('./database');
const storageService = require('./storage-service');
const emailService = require('../email-service');

class IntakeService {
    /**
     * Create a new intake submission
     *
     * This method will:
     * 1. Generate a unique intake number (INT-YYYY-#####)
     * 2. Insert into intake_submissions table
     * 3. Insert page data into intake_page_1 through intake_page_5
     * 4. All within a transaction for data consistency
     *
     * @param {Object} formData - Complete intake form data
     * @param {Object} formData.personalInfo - Personal and contact information
     * @param {Object} formData.page1 - Page 1 data (sections 1-5)
     * @param {Object} formData.page2 - Page 2 data (sections 6-10)
     * @param {Object} formData.page3 - Page 3 data (sections 11-15)
     * @param {Object} formData.page4 - Page 4 data (sections 16-20)
     * @param {Object} formData.page5 - Page 5 data (sections 21-25)
     * @returns {Promise<Object>} Created intake object with id and intake_number
     *
     * @example
     * const intake = await IntakeService.createIntake({
     *   personalInfo: {
     *     firstName: 'John',
     *     lastName: 'Doe',
     *     email: 'john@example.com',
     *     phone: '555-1234'
     *   },
     *   page1: { section1: {...}, section2: {...} },
     *   page2: { section6: {...}, section7: {...} },
     *   // ... etc
     * });
     */
    static async createIntake(formData) {
        // TODO: Implement in Week 3
        const intakeNumber = await this.generateIntakeNumber();
        return {
            id: 1,
            intake_number: intakeNumber,
            message: 'Intake creation will be implemented in Week 3'
        };
    }

    /**
     * Get intake by ID with all related page data
     *
     * Joins intake_submissions with all 5 page tables to return complete intake.
     *
     * @param {number} id - Intake submission ID
     * @returns {Promise<Object|null>} Complete intake object or null if not found
     *
     * @example
     * const intake = await IntakeService.getIntakeById(123);
     * console.log(intake.intake_number); // 'INT-2025-00123'
     * console.log(intake.page1); // {...page 1 data...}
     */
    static async getIntakeById(id) {
        // TODO: Implement in Week 3
        return {
            id,
            intake_number: 'INT-2025-00001',
            status: 'new',
            message: 'Full retrieval will be implemented in Week 3'
        };
    }

    /**
     * Search intakes with filters
     *
     * Supports filtering by:
     * - status (new, reviewing, approved, rejected)
     * - urgency_level (normal, urgent, emergency)
     * - assigned_attorney_id
     * - client_email
     * - date range (created_at)
     * - search term (searches name, email, intake_number)
     *
     * @param {Object} filters - Search filters
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.urgency] - Filter by urgency level
     * @param {number} [filters.attorneyId] - Filter by assigned attorney
     * @param {string} [filters.email] - Filter by client email
     * @param {string} [filters.startDate] - Filter by created_at >= this date
     * @param {string} [filters.endDate] - Filter by created_at <= this date
     * @param {string} [filters.search] - Search term for name/email/number
     * @param {number} [filters.limit=50] - Max results to return
     * @param {number} [filters.offset=0] - Pagination offset
     * @returns {Promise<Object>} Search results with total count
     *
     * @example
     * const results = await IntakeService.searchIntakes({
     *   status: 'new',
     *   urgency: 'urgent',
     *   limit: 10
     * });
     * console.log(results.total); // Total matching records
     * console.log(results.results); // Array of intake objects
     */
    static async searchIntakes(filters = {}) {
        // TODO: Implement in Week 6
        return {
            results: [],
            total: 0,
            message: 'Search will be implemented in Week 6'
        };
    }

    /**
     * Update intake status
     *
     * Updates the status and logs the action to audit_logs.
     *
     * @param {number} id - Intake submission ID
     * @param {string} status - New status (new, reviewing, approved, rejected)
     * @param {string} userId - Email of user making the change
     * @returns {Promise<Object>} Updated intake object
     *
     * @example
     * const updated = await IntakeService.updateIntakeStatus(
     *   123,
     *   'approved',
     *   'attorney@lawfirm.com'
     * );
     */
    static async updateIntakeStatus(id, status, userId) {
        // TODO: Implement in Week 6
        return {
            id,
            status,
            message: 'Status updates will be implemented in Week 6'
        };
    }

    /**
     * Generate unique intake number
     *
     * Format: INT-YYYY-#####
     * Example: INT-2025-00001
     *
     * Gets the highest number for current year and increments by 1.
     * If first intake of the year, starts at 00001.
     *
     * @returns {Promise<string>} New intake number
     *
     * @example
     * const number = await IntakeService.generateIntakeNumber();
     * console.log(number); // 'INT-2025-00123'
     */
    static async generateIntakeNumber() {
        const year = new Date().getFullYear();

        try {
            // Get the highest intake number for this year
            const result = await db.query(
                `SELECT intake_number
                 FROM intake_submissions
                 WHERE intake_number LIKE $1
                 ORDER BY intake_number DESC
                 LIMIT 1`,
                [`INT-${year}-%`]
            );

            let nextNumber = 1;

            if (result.rows.length > 0) {
                // Extract the number part and increment
                const lastNumber = result.rows[0].intake_number;
                const numberPart = parseInt(lastNumber.split('-')[2], 10);
                nextNumber = numberPart + 1;
            }

            // Format as INT-YYYY-#####
            const paddedNumber = String(nextNumber).padStart(5, '0');
            return `INT-${year}-${paddedNumber}`;
        } catch (error) {
            console.error('Error generating intake number:', error);
            // Fallback: use timestamp-based number to ensure uniqueness
            const timestamp = Date.now().toString().slice(-5);
            return `INT-${year}-${timestamp}`;
        }
    }

    /**
     * Assign intake to attorney
     *
     * @param {number} id - Intake submission ID
     * @param {number} attorneyId - Attorney ID
     * @param {string} attorneyName - Attorney full name
     * @returns {Promise<Object>} Updated intake object
     */
    static async assignToAttorney(id, attorneyId, attorneyName) {
        // TODO: Implement in Week 6
        return {
            id,
            assigned_attorney_id: attorneyId,
            assigned_attorney_name: attorneyName,
            message: 'Assignment will be implemented in Week 6'
        };
    }

    /**
     * Save incomplete intake for resume later
     *
     * Creates a saved_sessions record with a unique token.
     * Token expires after 30 days.
     *
     * @param {Object} intakeData - Partial intake form data
     * @param {string} email - Client email for resume link
     * @returns {Promise<Object>} Session object with token
     */
    static async saveForLater(intakeData, email) {
        // TODO: Implement in Week 3
        return {
            token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            message: 'Save/resume will be implemented in Week 3'
        };
    }

    /**
     * Resume intake from saved session
     *
     * @param {string} token - Resume token (UUID)
     * @returns {Promise<Object|null>} Saved intake data or null if invalid/expired
     */
    static async resumeFromToken(token) {
        // TODO: Implement in Week 3
        return {
            intake_data: {},
            message: 'Resume will be implemented in Week 3'
        };
    }

    /**
     * Create Dropbox folder and send confirmation email for intake submission
     *
     * This method orchestrates the post-submission workflow:
     * 1. Creates client folder in Dropbox: /Current Clients/<Street>/<Name>/
     * 2. Generates shared link for client document uploads
     * 3. Sends confirmation email with intake number and Dropbox link
     *
     * @param {Object} intakeData - Intake submission data
     * @param {string} intakeData.client_email - Client email address
     * @param {string} intakeData.first_name - Client first name
     * @param {string} intakeData.last_name - Client last name
     * @param {string} intakeData.current_street_address - Property street address
     * @param {string} intakeNumber - Generated intake number (INT-2025-00001)
     * @returns {Promise<{folderCreated: boolean, linkCreated: boolean, emailSent: boolean, dropboxLink?: string}>}
     *
     * @example
     * const result = await IntakeService.processIntakeSubmission(intakeData, 'INT-2025-00001');
     * // Returns: { folderCreated: true, linkCreated: true, emailSent: true, dropboxLink: '...' }
     */
    static async processIntakeSubmission(intakeData, intakeNumber) {
        const result = {
            folderCreated: false,
            linkCreated: false,
            emailSent: false,
            dropboxLink: null,
            errors: []
        };

        const fullName = `${intakeData.first_name} ${intakeData.last_name}`;
        const streetAddress = intakeData.current_street_address;

        // Step 1: Create client folder in Dropbox
        if (storageService.isEnabled()) {
            const folderResult = await storageService.createClientFolder(streetAddress, fullName);

            if (folderResult.success) {
                result.folderCreated = true;
                console.log(`✅ Dropbox folder created for ${fullName}`);

                // Step 2: Create shared link
                const sharedLink = await storageService.createDropboxSharedLink(streetAddress, fullName);

                if (sharedLink) {
                    result.linkCreated = true;
                    result.dropboxLink = sharedLink;
                    console.log(`✅ Dropbox link generated: ${sharedLink}`);
                } else {
                    result.errors.push('Failed to create Dropbox shared link');
                    console.warn('⚠️  Could not create shared link, will skip in email');
                }
            } else {
                result.errors.push(`Dropbox folder creation failed: ${folderResult.error}`);
                console.error(`❌ Dropbox folder creation failed: ${folderResult.error}`);
            }
        } else {
            result.errors.push('Dropbox is disabled');
            console.warn('⚠️  Dropbox is disabled, skipping folder creation');
        }

        // Step 3: Send confirmation email (with or without Dropbox link)
        if (emailService.isEnabled()) {
            const emailResult = await emailService.sendIntakeConfirmation({
                to: intakeData.client_email,
                firstName: intakeData.first_name,
                lastName: intakeData.last_name,
                streetAddress: streetAddress,
                intakeNumber: intakeNumber,
                dropboxLink: result.dropboxLink || 'https://liptonlegal.com' // Fallback URL
            });

            if (emailResult.success) {
                result.emailSent = true;
                console.log(`✅ Confirmation email sent to ${intakeData.client_email}`);
            } else {
                result.errors.push(`Email failed: ${emailResult.error}`);
                console.error(`❌ Email send failed: ${emailResult.error}`);
            }
        } else {
            result.errors.push('Email service is disabled');
            console.warn('⚠️  Email service is disabled, skipping confirmation email');
        }

        return result;
    }

    /**
     * Upload document to client's Dropbox folder
     *
     * @param {string} streetAddress - Client's street address
     * @param {string} fullName - Client's full name
     * @param {Object} file - File object (from multer)
     * @param {string} documentType - Type: identification, supporting-docs, additional-files
     * @returns {Promise<{success: boolean, dropboxPath?: string, error?: string}>}
     *
     * @example
     * const result = await IntakeService.uploadIntakeDocument(
     *   '123 Main Street',
     *   'John Doe',
     *   req.file,
     *   'identification'
     * );
     */
    static async uploadIntakeDocument(streetAddress, fullName, file, documentType = 'additional-files') {
        if (!storageService.isEnabled()) {
            return {
                success: false,
                error: 'Dropbox storage is not enabled'
            };
        }

        return await storageService.uploadIntakeDocument(streetAddress, fullName, file, documentType);
    }

    /**
     * Get Dropbox folder path for a client
     *
     * @param {string} streetAddress - Client's street address
     * @param {string} fullName - Client's full name
     * @returns {string} Dropbox folder path
     *
     * @example
     * const path = IntakeService.getClientDropboxPath('123 Main St', 'John Doe');
     * // Returns: '/Current Clients/123 Main St/John Doe'
     */
    static getClientDropboxPath(streetAddress, fullName) {
        return storageService.getClientFolderPath(streetAddress, fullName);
    }

    /**
     * Validate file for upload
     *
     * @param {Object} file - File object
     * @param {string} documentType - Document type
     * @returns {{valid: boolean, error?: string}}
     */
    static validateFileUpload(file, documentType) {
        return storageService.validateFileUpload(file, documentType);
    }
}

module.exports = IntakeService;
