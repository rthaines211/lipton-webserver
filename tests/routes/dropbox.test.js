const request = require('supertest');
const express = require('express');
const dropboxRoutes = require('../../routes/dropbox');

// Mock dropbox-browser service
jest.mock('../../services/dropbox-browser', () => ({
    listFolder: jest.fn(),
}));
const DropboxBrowser = require('../../services/dropbox-browser');

const app = express();
app.use(express.json());
app.use('/api/dropbox', dropboxRoutes);

describe('GET /api/dropbox/list', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return folder contents for root path', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([
            { name: 'Cases', type: 'folder', path: '/Cases', size: null, modified: null, extension: null, supported: true },
        ]);

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.entries).toHaveLength(1);
        expect(res.body.entries[0].name).toBe('Cases');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/', { refresh: false });
    });

    it('should pass refresh=true when query param set', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([]);

        await request(app).get('/api/dropbox/list?path=/Cases&refresh=true');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/Cases', { refresh: true });
    });

    it('should default path to / when not provided', async () => {
        DropboxBrowser.listFolder.mockResolvedValue([]);

        await request(app).get('/api/dropbox/list');
        expect(DropboxBrowser.listFolder).toHaveBeenCalledWith('/', { refresh: false });
    });

    it('should return 503 when Dropbox is disabled', async () => {
        DropboxBrowser.listFolder.mockResolvedValue(null);

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/disabled/i);
    });

    it('should return 500 on Dropbox API error', async () => {
        DropboxBrowser.listFolder.mockRejectedValue(new Error('Dropbox rate limit'));

        const res = await request(app).get('/api/dropbox/list?path=/');
        expect(res.status).toBe(500);
    });
});
