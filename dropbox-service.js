/**
 * Dropbox Service Module
 *
 * Handles all Dropbox API operations including file uploads and folder creation.
 * Preserves local folder structure when uploading to Dropbox.
 *
 * Configuration (OAuth Refresh Token - Recommended):
 * - DROPBOX_APP_KEY: OAuth app key (never expires)
 * - DROPBOX_APP_SECRET: OAuth app secret (never expires)
 * - DROPBOX_REFRESH_TOKEN: OAuth refresh token (never expires, auto-refreshes)
 * - DROPBOX_ENABLED: Enable/disable Dropbox uploads
 * - DROPBOX_BASE_PATH: Base folder path in Dropbox (e.g., /Current Clients)
 * - LOCAL_OUTPUT_PATH: Local output directory to mirror to Dropbox
 * - CONTINUE_ON_DROPBOX_FAILURE: Continue on upload failure
 *
 * Legacy Configuration (Short-lived Access Token - Deprecated):
 * - DROPBOX_ACCESS_TOKEN: OAuth token (expires every 4 hours) - DEPRECATED
 *
 * Features:
 * - OAuth refresh token support (automatic token refresh, never expires)
 * - Automatic folder creation in Dropbox
 * - File overwriting (WriteMode.overwrite)
 * - Path mapping from local to Dropbox structure
 * - Comprehensive error handling and logging
 *
 * Example Usage:
 *   const dropboxService = require('./dropbox-service');
 *   await dropboxService.uploadFile('/output/Clients/Case1/file.pdf');
 *
 * Last Updated: 2025-10-27 (Migrated to OAuth refresh tokens)
 */

const { Dropbox } = require('dropbox');
const fs = require('fs').promises;
const path = require('path');

/**
 * Dropbox Configuration
 * Loaded from environment variables with sensible defaults
 *
 * Supports both OAuth refresh tokens (preferred) and legacy access tokens
 */
const DROPBOX_CONFIG = {
    // OAuth refresh token credentials (preferred - never expire)
    appKey: process.env.DROPBOX_APP_KEY || '',
    appSecret: process.env.DROPBOX_APP_SECRET || '',
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN || '',

    // Legacy access token (deprecated - expires every 4 hours)
    accessToken: process.env.DROPBOX_ACCESS_TOKEN || '',

    // General configuration
    enabled: process.env.DROPBOX_ENABLED === 'true',
    basePath: process.env.DROPBOX_BASE_PATH || '/Current Clients',
    localOutputPath: process.env.LOCAL_OUTPUT_PATH || '/output',
    continueOnFailure: process.env.CONTINUE_ON_DROPBOX_FAILURE !== 'false'
};

// Initialize Dropbox client if enabled
let dbx = null;
if (DROPBOX_CONFIG.enabled) {
    try {
        // Prefer OAuth refresh token (never expires)
        if (DROPBOX_CONFIG.refreshToken && DROPBOX_CONFIG.appKey && DROPBOX_CONFIG.appSecret) {
            dbx = new Dropbox({
                refreshToken: DROPBOX_CONFIG.refreshToken,
                clientId: DROPBOX_CONFIG.appKey,
                clientSecret: DROPBOX_CONFIG.appSecret
            });
            console.log('✅ Dropbox service initialized (OAuth refresh token)');
            console.log(`   Base path: ${DROPBOX_CONFIG.basePath}`);
            console.log('   🔄 Token auto-refresh enabled (never expires)');
        }
        // Fall back to legacy access token (will expire)
        else if (DROPBOX_CONFIG.accessToken) {
            dbx = new Dropbox({ accessToken: DROPBOX_CONFIG.accessToken });
            console.log('✅ Dropbox service initialized (legacy access token)');
            console.log(`   Base path: ${DROPBOX_CONFIG.basePath}`);
            console.warn('   ⚠️  WARNING: Using short-lived access token (expires in ~4 hours)');
            console.warn('   ⚠️  Migrate to OAuth refresh tokens to prevent expiration');
        }
        // No credentials provided
        else {
            console.warn('⚠️  Dropbox enabled but no credentials provided');
            console.warn('   Set DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET');
            console.warn('   Or set DROPBOX_ACCESS_TOKEN (legacy, will expire)');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Dropbox service:', error.message);
    }
} else {
    console.log('ℹ️  Dropbox service disabled');
}

/**
 * Maps a local file path to its corresponding Dropbox path
 *
 * @param {string} localPath - Local file path (e.g., /output/Clients/Case1/file.pdf)
 * @returns {string} Dropbox path (e.g., /Current Clients/Clients/Case1/file.pdf)
 *
 * @example
 * mapLocalPathToDropbox('/output/Clients/Case1/file.pdf')
 * // Returns: '/Current Clients/Clients/Case1/file.pdf'
 */
function mapLocalPathToDropbox(localPath) {
    // Normalize paths to use forward slashes
    const normalizedLocal = localPath.replace(/\\/g, '/');
    const normalizedOutputPath = DROPBOX_CONFIG.localOutputPath.replace(/\\/g, '/');

    // Remove the local output path prefix
    let relativePath = normalizedLocal;
    if (normalizedLocal.startsWith(normalizedOutputPath)) {
        relativePath = normalizedLocal.substring(normalizedOutputPath.length);
    }

    // Ensure relative path starts with /
    if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
    }

    // Combine base path with relative path
    let dropboxPath = DROPBOX_CONFIG.basePath + relativePath;

    // Ensure no double slashes
    dropboxPath = dropboxPath.replace(/\/+/g, '/');

    return dropboxPath;
}

/**
 * Creates a folder in Dropbox if it doesn't exist
 *
 * @param {string} folderPath - Dropbox folder path to create
 * @returns {Promise<boolean>} True if folder exists or was created successfully
 *
 * @example
 * await ensureFolderExists('/Current Clients/Clients/Case1')
 */
async function ensureFolderExists(folderPath) {
    if (!dbx) {
        return false;
    }

    try {
        // Check if folder exists by getting its metadata
        await dbx.filesGetMetadata({ path: folderPath });
        return true; // Folder exists
    } catch (error) {
        if (error.status === 409) {
            // Folder doesn't exist, try to create it
            try {
                await dbx.filesCreateFolderV2({
                    path: folderPath,
                    autorename: false
                });
                console.log(`📁 Created Dropbox folder: ${folderPath}`);
                return true;
            } catch (createError) {
                console.error(`❌ Failed to create Dropbox folder ${folderPath}:`, createError.message);
                return false;
            }
        } else {
            console.error(`❌ Error checking Dropbox folder ${folderPath}:`, error.message);
            return false;
        }
    }
}

/**
 * Recursively creates all parent folders for a given path
 *
 * @param {string} dropboxPath - Full Dropbox file path
 * @returns {Promise<boolean>} True if all folders exist or were created
 *
 * @example
 * await ensureParentFoldersExist('/Current Clients/123 Main St/John Doe/Discovery/SROGs/file.pdf')
 * // Creates: /Current Clients, /Current Clients/123 Main St,
 * //          /Current Clients/123 Main St/John Doe, /Current Clients/123 Main St/John Doe/Discovery/SROGs
 */
async function ensureParentFoldersExist(dropboxPath) {
    if (!dbx) {
        return false;
    }

    const pathParts = dropboxPath.split('/').filter(part => part.length > 0);

    // Build folder paths incrementally
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) { // -1 to exclude the filename
        currentPath += '/' + pathParts[i];

        // Skip if it's just the base path (usually already exists)
        if (currentPath === DROPBOX_CONFIG.basePath) {
            continue;
        }

        const folderExists = await ensureFolderExists(currentPath);
        if (!folderExists && !DROPBOX_CONFIG.continueOnFailure) {
            return false;
        }
    }

    return true;
}

/**
 * Uploads a file to Dropbox, preserving the folder structure
 *
 * @param {string} localFilePath - Absolute local file path
 * @param {Buffer|string} fileContent - File content (optional, will read from disk if not provided)
 * @returns {Promise<object>} Upload result with status and paths
 *
 * @example
 * const result = await uploadFile('/output/Clients/Case1/file.pdf');
 * console.log(result);
 * // {
 * //   success: true,
 * //   localPath: '/output/Clients/Case1/file.pdf',
 * //   dropboxPath: '/Current Clients/Clients/Case1/file.pdf'
 * // }
 */
async function uploadFile(localFilePath, fileContent = null) {
    const result = {
        success: false,
        localPath: localFilePath,
        dropboxPath: null,
        error: null
    };

    // Check if Dropbox is enabled and configured
    if (!DROPBOX_CONFIG.enabled) {
        result.error = 'Dropbox is disabled';
        return result;
    }

    if (!dbx) {
        result.error = 'Dropbox client not initialized';
        return result;
    }

    try {
        // Map local path to Dropbox path
        const dropboxPath = mapLocalPathToDropbox(localFilePath);
        result.dropboxPath = dropboxPath;

        // Ensure parent folders exist
        const foldersCreated = await ensureParentFoldersExist(dropboxPath);
        if (!foldersCreated && !DROPBOX_CONFIG.continueOnFailure) {
            result.error = 'Failed to create parent folders';
            return result;
        }

        // Read file content if not provided
        let contents = fileContent;
        if (!contents) {
            contents = await fs.readFile(localFilePath);
        }

        // Upload file to Dropbox (overwrite if exists)
        await dbx.filesUpload({
            path: dropboxPath,
            contents: contents,
            mode: { '.tag': 'overwrite' },
            autorename: false,
            mute: false,
            strict_conflict: false
        });

        result.success = true;
        console.log(`☁️  Uploaded to Dropbox: ${localFilePath} → ${dropboxPath}`);

        return result;

    } catch (error) {
        result.error = error.message;
        console.error(`❌ Dropbox upload failed for ${localFilePath}:`, error.message);

        if (!DROPBOX_CONFIG.continueOnFailure) {
            throw error;
        }

        return result;
    }
}

/**
 * Uploads multiple files to Dropbox in parallel
 *
 * @param {string[]} localFilePaths - Array of absolute local file paths
 * @returns {Promise<object[]>} Array of upload results
 *
 * @example
 * const results = await uploadFiles([
 *   '/output/Clients/Case1/file1.pdf',
 *   '/output/Clients/Case1/file2.pdf'
 * ]);
 */
async function uploadFiles(localFilePaths) {
    if (!DROPBOX_CONFIG.enabled || !dbx) {
        console.log('ℹ️  Dropbox disabled, skipping batch upload');
        return localFilePaths.map(path => ({
            success: false,
            localPath: path,
            dropboxPath: null,
            error: 'Dropbox is disabled'
        }));
    }

    console.log(`📤 Uploading ${localFilePaths.length} files to Dropbox...`);

    const uploadPromises = localFilePaths.map(filePath => uploadFile(filePath));
    const results = await Promise.allSettled(uploadPromises);

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`✅ Successfully uploaded ${successCount}/${localFilePaths.length} files to Dropbox`);

    return results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason });
}

/**
 * Gets Dropbox account information (useful for testing connection)
 *
 * @returns {Promise<object>} Account information
 */
async function getAccountInfo() {
    if (!dbx) {
        throw new Error('Dropbox client not initialized');
    }

    try {
        const response = await dbx.usersGetCurrentAccount();
        return response.result;
    } catch (error) {
        console.error('❌ Failed to get Dropbox account info:', error.message);
        throw error;
    }
}

/**
 * Creates a shared link for a Dropbox folder
 *
 * If a shared link already exists for the folder, returns the existing link.
 * Otherwise, creates a new shared link with TEAM-ONLY viewer access.
 *
 * SECURITY: Links are restricted to team members only. Users must be logged
 * into a Dropbox account that's part of your team to access the documents.
 * This ensures sensitive legal documents are not publicly accessible.
 *
 * @param {string} folderPath - Dropbox folder path (e.g., /Current Clients/123 Main Street/)
 * @returns {Promise<string|null>} Shared link URL or null if fails/disabled
 *
 * @example
 * const link = await createSharedLink('/Current Clients/123 Main Street');
 * // Returns: 'https://www.dropbox.com/sh/abc123xyz/...' (team-only access)
 */
async function createSharedLink(folderPath) {
    // Check if Dropbox is enabled
    if (!dbx || !DROPBOX_CONFIG.enabled) {
        console.log('ℹ️  Dropbox disabled, cannot create shared link');
        return null;
    }

    try {
        console.log(`📎 Creating team-only shared link for: ${folderPath}`);

        // Check if shared link already exists
        const existingLinks = await dbx.sharingListSharedLinks({
            path: folderPath,
            direct_only: true
        });

        if (existingLinks.result.links.length > 0) {
            const existingUrl = existingLinks.result.links[0].url;
            console.log(`✅ Using existing Dropbox shared link: ${existingUrl}`);
            return existingUrl;
        }

        // Try to create shared link with TEAM-ONLY viewer access first
        // This restricts access to only members of your Dropbox team
        try {
            const response = await dbx.sharingCreateSharedLinkWithSettings({
                path: folderPath,
                settings: {
                    requested_visibility: 'team_only',  // Restricted to team members
                    audience: 'team',                    // Only team can access
                    access: 'viewer'                     // View-only (no edit/download)
                }
            });

            const newUrl = response.result.url;
            console.log(`✅ Created new team-only Dropbox shared link: ${newUrl}`);
            return newUrl;

        } catch (teamError) {
            // Team-only failed (might not be a Business account), fall back to public link
            const teamErrorMsg = teamError.error?.error_summary || teamError.message;
            console.warn(`⚠️  Team-only link failed (${teamErrorMsg}), trying public link...`);

            try {
                // Fall back to public link with password protection if available
                const publicResponse = await dbx.sharingCreateSharedLinkWithSettings({
                    path: folderPath,
                    settings: {
                        requested_visibility: 'public',  // Public link (anyone with link)
                        audience: 'public',
                        access: 'viewer'                 // View-only
                    }
                });

                const publicUrl = publicResponse.result.url;
                console.log(`✅ Created public Dropbox shared link: ${publicUrl}`);
                console.warn(`⚠️  Link is public (not team-restricted). Upgrade to Dropbox Business for team-only links.`);
                return publicUrl;

            } catch (publicError) {
                // Both team-only and public failed
                const publicErrorMsg = publicError.error?.error_summary || publicError.message;
                console.error(`❌ Failed to create public link: ${publicErrorMsg}`);
                throw publicError; // Re-throw to outer catch
            }
        }

    } catch (error) {
        // Handle errors gracefully - return null instead of throwing
        const errorMessage = error.error?.error_summary || error.message;
        console.error(`❌ Failed to create Dropbox shared link: ${errorMessage}`);

        // Return null on failure (graceful degradation)
        return null;
    }
}

module.exports = {
    uploadFile,
    uploadFiles,
    mapLocalPathToDropbox,
    getAccountInfo,
    createSharedLink,
    isEnabled: () => DROPBOX_CONFIG.enabled && dbx !== null,
    config: DROPBOX_CONFIG
};
