const express = require('express');
const router = express.Router();
const DropboxBrowser = require('../services/dropbox-browser');

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
        res.status(500).json({
            success: false,
            error: 'Failed to list Dropbox folder',
            details: error.message,
        });
    }
});

module.exports = router;
