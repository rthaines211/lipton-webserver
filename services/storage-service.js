/**
 * Storage Service Module
 *
 * Handles file storage operations for the intake system using Dropbox.
 * Wraps the existing dropbox-service with intake-specific folder structure
 * and business logic.
 *
 * Folder Structure:
 * /Current Clients/
 *   ├── <Street Address>/
 *   │   └── <Full Name>/
 *   │       ├── intake-submission.json
 *   │       └── uploaded-documents/
 *   │           ├── identification/
 *   │           ├── supporting-docs/
 *   │           └── additional-files/
 *
 * Features:
 * - Automatic folder creation with street address and client name
 * - Path sanitization (removes special characters)
 * - Shared link generation for client uploads
 * - File validation (type, size)
 * - Error handling with graceful fallback
 *
 * Usage:
 *   const storageService = require('./services/storage-service');
 *
 *   // Create client folder and get shared link
 *   const link = await storageService.createClientFolder('123 Main St', 'John Doe');
 *
 *   // Upload document
 *   await storageService.uploadIntakeDocument('123 Main St', 'John Doe', file, 'identification');
 *
 * @module services/storage-service
 */

const dropboxService = require('../dropbox-service');
const path = require('path');

// Try to load logger, fallback to console if not available
let logger;
try {
    logger = require('../monitoring/logger');
} catch (error) {
    logger = {
        info: console.log,
        error: console.error,
        warn: console.warn
    };
}

/**
 * File size limits (in bytes)
 */
const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,      // 10 MB for images
    pdf: 50 * 1024 * 1024,        // 50 MB for PDFs
    document: 25 * 1024 * 1024,   // 25 MB for Word/Excel
    default: 20 * 1024 * 1024     // 20 MB default
};

/**
 * Allowed file types by category
 */
const ALLOWED_FILE_TYPES = {
    identification: ['.pdf', '.jpg', '.jpeg', '.png'],
    'supporting-docs': ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    'additional-files': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.txt']
};

/**
 * Sanitize a string for use as a Dropbox folder name
 * Removes or replaces characters that are problematic in file paths
 *
 * @param {string} name - String to sanitize (street address or person name)
 * @returns {string} Sanitized string safe for folder names
 *
 * @example
 * sanitizeFolderName('123 Main St. #4A')
 * // Returns: '123 Main St 4A'
 *
 * sanitizeFolderName('John O\'Brien')
 * // Returns: 'John OBrien'
 */
function sanitizeFolderName(name) {
    if (!name || typeof name !== 'string') {
        return 'Unknown';
    }

    return name
        .trim()
        // Remove characters that are problematic in paths
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid filename chars
        .replace(/[#]/g, '')                    // Remove hash
        .replace(/[.']+/g, '')                  // Remove periods and apostrophes
        .replace(/\s+/g, ' ')                   // Collapse multiple spaces
        .trim()
        || 'Unknown'; // Fallback if everything was removed
}

/**
 * Get the Dropbox folder path for a specific client
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name (first + last)
 * @returns {string} Full Dropbox path
 *
 * @example
 * getClientFolderPath('123 Main Street', 'John Doe')
 * // Returns: '/Current Clients/123 Main Street/John Doe'
 */
function getClientFolderPath(streetAddress, fullName) {
    const sanitizedAddress = sanitizeFolderName(streetAddress);
    const sanitizedName = sanitizeFolderName(fullName);

    return `/Current Clients/${sanitizedAddress}/${sanitizedName}`;
}

/**
 * Get the Dropbox path for a specific document type subfolder
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name
 * @param {string} documentType - Type of document (identification, supporting-docs, additional-files)
 * @returns {string} Full Dropbox path to document type folder
 *
 * @example
 * getDocumentTypePath('123 Main St', 'John Doe', 'identification')
 * // Returns: '/Current Clients/123 Main St/John Doe/uploaded-documents/identification'
 */
function getDocumentTypePath(streetAddress, fullName, documentType) {
    const clientPath = getClientFolderPath(streetAddress, fullName);
    return `${clientPath}/uploaded-documents/${documentType}`;
}

/**
 * Validate uploaded file
 * Checks file type and size constraints
 *
 * @param {Object} file - File object (from multer or similar)
 * @param {string} file.originalname - Original filename
 * @param {number} file.size - File size in bytes
 * @param {string} file.mimetype - MIME type
 * @param {string} documentType - Type of document being uploaded
 * @returns {{valid: boolean, error?: string}} Validation result
 *
 * @example
 * const result = validateFileUpload({
 *   originalname: 'license.pdf',
 *   size: 1024000,
 *   mimetype: 'application/pdf'
 * }, 'identification');
 * // Returns: { valid: true }
 */
function validateFileUpload(file, documentType) {
    if (!file || !file.originalname) {
        return {
            valid: false,
            error: 'No file provided'
        };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedTypes = ALLOWED_FILE_TYPES[documentType] || ALLOWED_FILE_TYPES['additional-files'];

    if (!allowedTypes.includes(ext)) {
        return {
            valid: false,
            error: `File type ${ext} not allowed for ${documentType}. Allowed types: ${allowedTypes.join(', ')}`
        };
    }

    // Check file size
    const maxSize = FILE_SIZE_LIMITS[getFileCategoryFromExtension(ext)] || FILE_SIZE_LIMITS.default;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(0)}MB`
        };
    }

    return { valid: true };
}

/**
 * Get file category from extension for size limit lookup
 * @private
 * @param {string} ext - File extension (e.g., '.pdf')
 * @returns {string} Category name
 */
function getFileCategoryFromExtension(ext) {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif'];
    const documentExts = ['.doc', '.docx', '.xls', '.xlsx'];

    if (imageExts.includes(ext)) return 'image';
    if (ext === '.pdf') return 'pdf';
    if (documentExts.includes(ext)) return 'document';
    return 'default';
}

/**
 * Create client folder structure in Dropbox
 * Creates: /Current Clients/<Street Address>/<Full Name>/
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name (firstName + lastName)
 * @returns {Promise<{success: boolean, path: string, error?: string}>}
 *
 * @example
 * const result = await createClientFolder('123 Main Street', 'John Doe');
 * // Returns: { success: true, path: '/Current Clients/123 Main Street/John Doe' }
 */
async function createClientFolder(streetAddress, fullName) {
    const result = {
        success: false,
        path: null,
        error: null
    };

    // Check if Dropbox is enabled
    if (!dropboxService.isEnabled()) {
        result.error = 'Dropbox is not enabled';
        logger.warn('⚠️  Cannot create client folder: Dropbox disabled');
        return result;
    }

    try {
        const folderPath = getClientFolderPath(streetAddress, fullName);
        result.path = folderPath;

        logger.info(`📁 Creating client folder: ${folderPath}`);

        // Use existing Dropbox service to create folder
        // Note: Dropbox API automatically creates parent folders if they don't exist
        const uploadResult = await dropboxService.uploadFile(
            `${folderPath}/.intake-folder`,
            Buffer.from('') // Empty placeholder file to ensure folder exists
        );

        if (uploadResult.success) {
            result.success = true;
            logger.info(`✅ Client folder created: ${folderPath}`);
        } else {
            result.error = uploadResult.error || 'Failed to create folder';
            logger.error(`❌ Failed to create client folder: ${uploadResult.error}`);
        }

        return result;

    } catch (error) {
        result.error = error.message;
        logger.error(`❌ Error creating client folder:`, error);
        return result;
    }
}

/**
 * Create shared Dropbox link for client folder
 * Clients can use this link to upload additional documents
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name
 * @returns {Promise<string|null>} Shared link URL or null if failed
 *
 * @example
 * const link = await createDropboxSharedLink('123 Main Street', 'John Doe');
 * // Returns: 'https://www.dropbox.com/sh/abc123...'
 */
async function createDropboxSharedLink(streetAddress, fullName) {
    if (!dropboxService.isEnabled()) {
        logger.warn('⚠️  Cannot create shared link: Dropbox disabled');
        return null;
    }

    try {
        const folderPath = getClientFolderPath(streetAddress, fullName);

        logger.info(`🔗 Creating shared link for: ${folderPath}`);

        // Use existing Dropbox service to create shared link
        const sharedLink = await dropboxService.createSharedLink(folderPath);

        if (sharedLink) {
            logger.info(`✅ Shared link created: ${sharedLink}`);
        } else {
            logger.warn(`⚠️  Failed to create shared link for ${folderPath}`);
        }

        return sharedLink;

    } catch (error) {
        logger.error(`❌ Error creating shared link:`, error);
        return null;
    }
}

/**
 * Upload a single document to client's Dropbox folder
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name
 * @param {Object} file - File object with buffer or local path
 * @param {string} file.originalname - Original filename
 * @param {Buffer|string} file.buffer - File content or path to file
 * @param {number} file.size - File size in bytes
 * @param {string} documentType - Type category (identification, supporting-docs, additional-files)
 * @returns {Promise<{success: boolean, dropboxPath?: string, error?: string}>}
 *
 * @example
 * const result = await uploadIntakeDocument(
 *   '123 Main Street',
 *   'John Doe',
 *   { originalname: 'license.pdf', buffer: fileBuffer, size: 1024000 },
 *   'identification'
 * );
 */
async function uploadIntakeDocument(streetAddress, fullName, file, documentType = 'additional-files') {
    const result = {
        success: false,
        dropboxPath: null,
        error: null
    };

    // Validate file
    const validation = validateFileUpload(file, documentType);
    if (!validation.valid) {
        result.error = validation.error;
        logger.warn(`⚠️  File validation failed: ${validation.error}`);
        return result;
    }

    // Check if Dropbox is enabled
    if (!dropboxService.isEnabled()) {
        result.error = 'Dropbox is not enabled';
        logger.warn('⚠️  Cannot upload document: Dropbox disabled');
        return result;
    }

    try {
        // Get document type subfolder path
        const documentFolderPath = getDocumentTypePath(streetAddress, fullName, documentType);
        const dropboxPath = `${documentFolderPath}/${file.originalname}`;
        result.dropboxPath = dropboxPath;

        logger.info(`📤 Uploading ${file.originalname} to ${dropboxPath}`);

        // Upload file using existing Dropbox service
        const uploadResult = await dropboxService.uploadFile(
            dropboxPath,
            file.buffer || file.path // Support both buffer and file path
        );

        if (uploadResult.success) {
            result.success = true;
            logger.info(`✅ Document uploaded: ${dropboxPath}`);
        } else {
            result.error = uploadResult.error || 'Upload failed';
            logger.error(`❌ Failed to upload document: ${uploadResult.error}`);
        }

        return result;

    } catch (error) {
        result.error = error.message;
        logger.error(`❌ Error uploading document:`, error);
        return result;
    }
}

/**
 * Upload multiple documents to client's Dropbox folder
 *
 * @param {string} streetAddress - Client's street address
 * @param {string} fullName - Client's full name
 * @param {Array<Object>} files - Array of file objects
 * @param {string} documentType - Type category for all files
 * @returns {Promise<Array<{success: boolean, dropboxPath?: string, error?: string}>>}
 *
 * @example
 * const results = await uploadIntakeDocuments(
 *   '123 Main Street',
 *   'John Doe',
 *   [file1, file2, file3],
 *   'supporting-docs'
 * );
 */
async function uploadIntakeDocuments(streetAddress, fullName, files, documentType = 'additional-files') {
    if (!Array.isArray(files) || files.length === 0) {
        logger.warn('⚠️  No files provided for upload');
        return [];
    }

    logger.info(`📤 Uploading ${files.length} documents for ${fullName}`);

    // Upload all files in parallel
    const uploadPromises = files.map(file =>
        uploadIntakeDocument(streetAddress, fullName, file, documentType)
    );

    const results = await Promise.allSettled(uploadPromises);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    logger.info(`✅ Successfully uploaded ${successCount}/${files.length} documents`);

    return results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason });
}

/**
 * Check if storage service is enabled and ready
 *
 * @returns {boolean} True if Dropbox is enabled and configured
 */
function isEnabled() {
    return dropboxService.isEnabled();
}

/**
 * Get current storage configuration (for debugging)
 *
 * @returns {Object} Configuration object
 */
function getConfig() {
    return {
        enabled: dropboxService.isEnabled(),
        basePath: dropboxService.config.basePath,
        fileSizeLimits: FILE_SIZE_LIMITS,
        allowedFileTypes: ALLOWED_FILE_TYPES
    };
}

// Export public functions
module.exports = {
    createClientFolder,
    createDropboxSharedLink,
    uploadIntakeDocument,
    uploadIntakeDocuments,
    getClientFolderPath,
    getDocumentTypePath,
    sanitizeFolderName,
    validateFileUpload,
    isEnabled,
    getConfig
};
