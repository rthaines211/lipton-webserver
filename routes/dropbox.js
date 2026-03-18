const express = require('express');
const router = express.Router();
const DropboxBrowser = require('../services/dropbox-browser');
const dropboxService = require('../dropbox-service');

/**
 * GET /api/dropbox/list
 * List contents of a Dropbox folder.
 *
 * Query params:
 *   path    - Dropbox folder path (default: '/')
 *   refresh - Set to 'true' to bypass cache
 */
router.get('/list', async (req, res) => {
    try {
        const folderPath = req.query.path || '/';
        const refresh = req.query.refresh === 'true';

        const entries = await DropboxBrowser.listFolder(folderPath, { refresh });

        if (entries === null) {
            return res.status(503).json({
                success: false,
                error: 'Dropbox integration is disabled or not configured',
            });
        }

        res.json({ success: true, path: folderPath, entries });
    } catch (error) {
        console.error('Dropbox list error:', error.message);
        if (error.status === 429) {
            const retryAfter = error.headers?.['retry-after'] || '5';
            res.set('Retry-After', retryAfter);
            return res.status(429).json({ success: false, error: 'Dropbox rate limit exceeded. Please wait a moment and try again.', retryAfter: Number(retryAfter) || 5 });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to list Dropbox folder',
            details: error.message,
        });
    }
});

/**
 * POST /api/dropbox/thumbnails
 * Batch fetch thumbnails from Dropbox.
 *
 * Body: { paths: string[] } (max 25)
 * Returns: { thumbnails: [{ path: string, data: string|null }] }
 */
router.post('/thumbnails', async (req, res) => {
    try {
        const { paths } = req.body;
        if (!Array.isArray(paths) || paths.length === 0) {
            return res.status(400).json({ success: false, error: 'paths array is required' });
        }
        if (paths.length > 25) {
            return res.status(400).json({ success: false, error: 'Maximum 25 paths per request' });
        }

        const dbx = dropboxService.getDropboxClient();
        if (!dbx) {
            return res.status(503).json({ success: false, error: 'Dropbox is not configured' });
        }

        const response = await dbx.filesGetThumbnailBatch({
            entries: paths.map(p => ({
                path: p,
                format: { '.tag': 'jpeg' },
                size: { '.tag': 'w64h64' },
            })),
        });

        const thumbnails = response.result.entries.map(entry => {
            if (entry['.tag'] === 'success') {
                return { path: entry.metadata.path_display, data: entry.thumbnail };
            }
            const failPath = entry.metadata?.path_display || entry.failure?.path || null;
            return { path: failPath, data: null };
        });

        res.json({ thumbnails });
    } catch (error) {
        console.error('Dropbox thumbnails error:', error.message);
        // Forward Dropbox rate limit as 429 with Retry-After
        if (error.status === 429) {
            const retryAfter = error.headers?.['retry-after'] || '5';
            res.set('Retry-After', retryAfter);
            return res.status(429).json({ success: false, error: 'Dropbox rate limit exceeded', retryAfter: Number(retryAfter) || 5 });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch thumbnails' });
    }
});

/**
 * GET /api/dropbox/temp-link
 * Get a temporary direct download link for a Dropbox file.
 *
 * Query params:
 *   path - Dropbox file path (required)
 * Returns: { success: true, link: string }
 */
router.get('/temp-link', async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'path query parameter is required' });
        }

        const dbx = dropboxService.getDropboxClient();
        if (!dbx) {
            return res.status(503).json({ success: false, error: 'Dropbox is not configured' });
        }

        const response = await dbx.filesGetTemporaryLink({ path: filePath });
        res.json({ success: true, link: response.result.link });
    } catch (error) {
        console.error('Dropbox temp-link error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to get temporary link' });
    }
});

module.exports = router;
