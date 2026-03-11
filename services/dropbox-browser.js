/**
 * Dropbox Browser Service
 *
 * Provides folder listing and file download capabilities for browsing
 * Dropbox content from the exhibit collector UI. Includes in-memory
 * caching with configurable TTL and support for pagination.
 *
 * Usage:
 *   const DropboxBrowser = require('./services/dropbox-browser');
 *   const entries = await DropboxBrowser.listFolder('/Current Clients/Case1');
 *   const file = await DropboxBrowser.downloadFile('/path/to/file.pdf', '/tmp');
 */

const path = require('path');
const fs = require('fs').promises;
const { getDropboxClient, isEnabled } = require('../dropbox-service');

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'heic']);
const HIDDEN_FILES = new Set(['.ds_store', 'thumbs.db', '.thumbs', 'desktop.ini']);
const CACHE_TTL_MS = 30_000;

const _cache = new Map();

/**
 * Lists contents of a Dropbox folder with metadata.
 *
 * Automatically paginates through all results, filters hidden files,
 * and annotates each entry with type/extension/supported info.
 * Results are cached for CACHE_TTL_MS (30s) unless refresh is requested.
 *
 * @param {string} folderPath - Dropbox folder path (use '/' for root)
 * @param {object} [options]
 * @param {boolean} [options.refresh=false] - Bypass cache and re-fetch
 * @returns {Promise<Array|null>} Array of entry objects, or null if Dropbox disabled
 */
async function listFolder(folderPath, { refresh = false } = {}) {
    const dbx = getDropboxClient();
    if (!dbx) return null;

    const cacheKey = folderPath.toLowerCase();
    if (!refresh && _cache.has(cacheKey)) {
        const cached = _cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
        _cache.delete(cacheKey);
    }

    const allEntries = [];
    let response = await dbx.filesListFolder({ path: folderPath === '/' ? '' : folderPath });
    allEntries.push(...response.result.entries);
    while (response.result.has_more) {
        response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
        allEntries.push(...response.result.entries);
    }

    const entries = allEntries
        .filter(entry => !HIDDEN_FILES.has(entry.name.toLowerCase()))
        .map(entry => {
            const isFile = entry['.tag'] === 'file';
            const ext = isFile ? path.extname(entry.name).slice(1).toLowerCase() : null;
            return {
                name: entry.name,
                type: entry['.tag'],
                path: entry.path_display,
                size: isFile ? entry.size : null,
                modified: isFile ? entry.server_modified : null,
                extension: ext,
                supported: isFile ? SUPPORTED_EXTENSIONS.has(ext) : true,
            };
        });

    _cache.set(cacheKey, { data: entries, timestamp: Date.now() });
    return entries;
}

/**
 * Downloads a single file from Dropbox to a local directory.
 *
 * @param {string} dropboxPath - Full Dropbox path to the file
 * @param {string} localDir - Local directory to save the file into
 * @returns {Promise<{localPath: string, name: string, size: number}>}
 */
async function downloadFile(dropboxPath, localDir) {
    const dbx = getDropboxClient();
    if (!dbx) throw new Error('Dropbox client not initialized');

    const response = await dbx.filesDownload({ path: dropboxPath });
    const fileName = response.result.name;
    const localPath = path.join(localDir, fileName);
    await fs.writeFile(localPath, response.result.fileBinary);
    return { localPath, name: fileName, size: response.result.size };
}

/**
 * Downloads multiple files from Dropbox with bounded concurrency.
 *
 * Files are organized by letter into subdirectories of baseDir.
 * Each file object must have { letter, dropboxPath } properties.
 *
 * @param {Array<{letter: string, dropboxPath: string}>} files - Files to download
 * @param {string} baseDir - Base directory for letter subdirectories
 * @param {number} [concurrency=15] - Max concurrent downloads
 * @param {Function|null} [onProgress] - Callback(completed, total) for progress
 * @returns {Promise<Map<string, Array>>} Map of letter -> array of download results
 */
async function downloadFiles(files, baseDir, concurrency = 15, onProgress = null) {
    const dbx = getDropboxClient();
    if (!dbx) throw new Error('Dropbox client not initialized');

    const results = new Map();
    let completed = 0;
    const total = files.length;

    // Group files by letter and create directories
    const byLetter = new Map();
    for (const file of files) {
        if (!byLetter.has(file.letter)) byLetter.set(file.letter, []);
        byLetter.get(file.letter).push(file);
    }

    for (const letter of byLetter.keys()) {
        const letterDir = path.join(baseDir, letter);
        await fs.mkdir(letterDir, { recursive: true });
        results.set(letter, []);
    }

    // Worker pool pattern for bounded concurrency
    const queue = [...files];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
            const file = queue.shift();
            if (!file) break;
            const letterDir = path.join(baseDir, file.letter);
            const result = await downloadFile(file.dropboxPath, letterDir);
            results.get(file.letter).push(result);
            completed++;
            if (onProgress) onProgress(completed, total);
        }
    });

    await Promise.all(workers);
    return results;
}

/**
 * Clears the folder listing cache.
 */
function clearCache() {
    _cache.clear();
}

module.exports = { listFolder, downloadFile, downloadFiles, clearCache, SUPPORTED_EXTENSIONS };
