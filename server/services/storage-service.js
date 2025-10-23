/**
 * Storage Service
 *
 * Abstraction layer for file storage operations, supporting both:
 * - Google Cloud Storage (production)
 * - Local filesystem (development)
 *
 * This service automatically switches between storage backends based on
 * the NODE_ENV environment variable, making development easier while
 * ensuring production uses scalable cloud storage.
 *
 * Features:
 * - Automatic storage backend selection
 * - Consistent API across backends
 * - JSON serialization/deserialization
 * - File listing and deletion
 * - Metadata support (size, timestamps)
 *
 * GCP Cloud Storage Integration:
 * - Uses bucket: docmosis-tornado-form-submissions
 * - Automatic authentication via service account
 * - Content-Type: application/json
 * - Cache-Control: no-cache
 *
 * Environment Variables:
 *   NODE_ENV - 'production' enables Cloud Storage, otherwise local filesystem
 *   GCS_BUCKET_NAME - Cloud Storage bucket name (optional)
 *   GCLOUD_PROJECT - GCP project ID (optional)
 *
 * Usage:
 *   const { saveFormData, readFormData } = require('./services/storage-service');
 *   await saveFormData('form-entry-12345.json', { caseNumber: '...' });
 *   const data = await readFormData('form-entry-12345.json');
 *
 * Last Updated: 2025-10-23
 * Changes: Extracted from monolithic server.js (Phase 1 refactoring)
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const logger = require('../../monitoring/logger');

// Determine storage backend based on environment
const USE_CLOUD_STORAGE = process.env.NODE_ENV === 'production';

// Cloud Storage Configuration
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ||
    `${process.env.GCLOUD_PROJECT || 'docmosis-tornado'}-form-submissions`;
const bucket = storage.bucket(BUCKET_NAME);

// Local filesystem configuration
const dataDir = path.join(__dirname, '../../data');

// Initialize storage on module load
if (!USE_CLOUD_STORAGE) {
    // Create local data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Using local file storage (development mode)');
        logger.info('Local file storage initialized', { dataDir });
    }
} else {
    console.log('☁️  Using Cloud Storage (production mode)');
    logger.info('Cloud Storage initialized', {
        bucketName: BUCKET_NAME,
        projectId: process.env.GCLOUD_PROJECT || 'auto-detected'
    });
}

console.log('☁️  Cloud Storage Configuration:', {
    bucketName: BUCKET_NAME,
    projectId: process.env.GCLOUD_PROJECT || 'auto-detected',
    mode: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem'
});

/**
 * Save form data to storage
 *
 * Serializes data to JSON and saves to appropriate storage backend.
 * In production, saves to Cloud Storage. In development, saves to local filesystem.
 *
 * @param {string} filename - Filename to save (e.g., 'form-entry-12345.json')
 * @param {Object} data - Form data object to save
 * @returns {Promise<void>}
 *
 * @example
 * await saveFormData('form-entry-12345.json', {
 *   caseNumber: 'CASE-12345',
 *   plaintiffs: [...]
 * });
 */
async function saveFormData(filename, data) {
    const jsonData = JSON.stringify(data, null, 2);

    try {
        if (USE_CLOUD_STORAGE) {
            const file = bucket.file(filename);
            await file.save(jsonData, {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'no-cache'
                }
            });
            console.log(`☁️  Saved to GCS: ${filename}`);
            logger.info('Form data saved to Cloud Storage', {
                filename,
                size: jsonData.length
            });
        } else {
            const filepath = path.join(dataDir, filename);
            fs.writeFileSync(filepath, jsonData);
            console.log(`📁 Saved locally: ${filename}`);
            logger.info('Form data saved locally', {
                filename,
                filepath,
                size: jsonData.length
            });
        }
    } catch (error) {
        logger.error('Failed to save form data', {
            filename,
            error: error.message,
            backend: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem'
        });
        throw error;
    }
}

/**
 * Read form data from storage
 *
 * Retrieves and parses JSON data from storage backend.
 *
 * @param {string} filename - Filename to read
 * @returns {Promise<Object>} Parsed JSON data
 *
 * @example
 * const formData = await readFormData('form-entry-12345.json');
 * console.log(formData.caseNumber); // 'CASE-12345'
 */
async function readFormData(filename) {
    try {
        if (USE_CLOUD_STORAGE) {
            const file = bucket.file(filename);
            const [contents] = await file.download();
            const data = JSON.parse(contents.toString());
            logger.debug('Form data read from Cloud Storage', { filename });
            return data;
        } else {
            const filepath = path.join(dataDir, filename);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            logger.debug('Form data read from local filesystem', { filename, filepath });
            return data;
        }
    } catch (error) {
        logger.error('Failed to read form data', {
            filename,
            error: error.message,
            backend: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem'
        });
        throw error;
    }
}

/**
 * Check if form data file exists
 *
 * @param {string} filename - Filename to check
 * @returns {Promise<boolean>} True if file exists
 *
 * @example
 * if (await formDataExists('form-entry-12345.json')) {
 *   console.log('Form exists');
 * }
 */
async function formDataExists(filename) {
    try {
        if (USE_CLOUD_STORAGE) {
            const file = bucket.file(filename);
            const [exists] = await file.exists();
            return exists;
        } else {
            const filepath = path.join(dataDir, filename);
            return fs.existsSync(filepath);
        }
    } catch (error) {
        logger.error('Failed to check file existence', {
            filename,
            error: error.message
        });
        return false;
    }
}

/**
 * List all form entries in storage
 *
 * Returns metadata for all form submissions.
 * Filters to only files matching 'form-entry-*.json' pattern.
 *
 * @returns {Promise<Array<Object>>} Array of file metadata objects
 *
 * @example
 * const entries = await listFormEntries();
 * entries.forEach(entry => {
 *   console.log(entry.name, entry.size, entry.created);
 * });
 */
async function listFormEntries() {
    try {
        if (USE_CLOUD_STORAGE) {
            const [files] = await bucket.getFiles({ prefix: 'form-entry-' });
            const entries = files.map(file => ({
                name: file.name,
                size: file.metadata.size,
                created: file.metadata.timeCreated,
                updated: file.metadata.updated
            }));
            logger.debug('Listed Cloud Storage entries', { count: entries.length });
            return entries;
        } else {
            const files = fs.readdirSync(dataDir)
                .filter(file => file.startsWith('form-entry-') && file.endsWith('.json'));
            const entries = files.map(file => {
                const filepath = path.join(dataDir, file);
                const stats = fs.statSync(filepath);
                return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    updated: stats.mtime
                };
            });
            logger.debug('Listed local filesystem entries', { count: entries.length });
            return entries;
        }
    } catch (error) {
        logger.error('Failed to list form entries', {
            error: error.message,
            backend: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem'
        });
        throw error;
    }
}

/**
 * Delete form entry from storage
 *
 * @param {string} filename - Filename to delete
 * @returns {Promise<void>}
 *
 * @example
 * await deleteFormData('form-entry-12345.json');
 */
async function deleteFormData(filename) {
    try {
        if (USE_CLOUD_STORAGE) {
            const file = bucket.file(filename);
            await file.delete();
            console.log(`☁️  Deleted from GCS: ${filename}`);
            logger.info('Form data deleted from Cloud Storage', { filename });
        } else {
            const filepath = path.join(dataDir, filename);
            fs.unlinkSync(filepath);
            console.log(`📁 Deleted locally: ${filename}`);
            logger.info('Form data deleted from local filesystem', { filename, filepath });
        }
    } catch (error) {
        logger.error('Failed to delete form data', {
            filename,
            error: error.message,
            backend: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem'
        });
        throw error;
    }
}

/**
 * Get storage configuration information
 *
 * Useful for debugging and health checks.
 *
 * @returns {Object} Storage configuration
 */
function getStorageInfo() {
    return {
        backend: USE_CLOUD_STORAGE ? 'Cloud Storage' : 'Local Filesystem',
        bucketName: USE_CLOUD_STORAGE ? BUCKET_NAME : null,
        dataDirectory: !USE_CLOUD_STORAGE ? dataDir : null,
        projectId: process.env.GCLOUD_PROJECT || 'auto-detected'
    };
}

module.exports = {
    saveFormData,
    readFormData,
    formDataExists,
    listFormEntries,
    deleteFormData,
    getStorageInfo
};
