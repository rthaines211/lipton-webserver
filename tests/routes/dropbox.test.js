const request = require('supertest');
const express = require('express');
const dropboxRoutes = require('../../routes/dropbox');

// Mock dropbox-browser service
jest.mock('../../services/dropbox-browser', () => ({
    listFolder: jest.fn(),
}));
const DropboxBrowser = require('../../services/dropbox-browser');

jest.mock('../../dropbox-service', () => {
    const mockClient = {
        filesGetThumbnailBatch: jest.fn(),
        filesGetTemporaryLink: jest.fn(),
    };
    return {
        getDropboxClient: () => mockClient,
        isEnabled: () => true,
        _mockClient: mockClient,
    };
});
const { _mockClient: mockDbxClient } = require('../../dropbox-service');

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

describe('POST /api/dropbox/thumbnails', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return thumbnails for image files', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockResolvedValue({
            result: {
                entries: [
                    { '.tag': 'success', metadata: { path_display: '/photo.jpg' }, thumbnail: 'base64data1' },
                    { '.tag': 'success', metadata: { path_display: '/img.png' }, thumbnail: 'base64data2' },
                ],
            },
        });

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/photo.jpg', '/img.png'] });

        expect(res.status).toBe(200);
        expect(res.body.thumbnails).toHaveLength(2);
        expect(res.body.thumbnails[0]).toEqual({ path: '/photo.jpg', data: 'base64data1' });
        expect(res.body.thumbnails[1]).toEqual({ path: '/img.png', data: 'base64data2' });
    });

    it('should return null data for failed thumbnails (e.g. PDFs)', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockResolvedValue({
            result: {
                entries: [
                    { '.tag': 'failure', failure: { '.tag': 'unsupported_extension' }, metadata: { path_display: '/doc.pdf' } },
                ],
            },
        });

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/doc.pdf'] });

        expect(res.status).toBe(200);
        expect(res.body.thumbnails[0]).toEqual({ path: '/doc.pdf', data: null });
    });

    it('should enforce max 25 paths', async () => {
        const paths = Array.from({ length: 30 }, (_, i) => `/file${i}.jpg`);

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/25/);
    });

    it('should return 400 if paths is empty or missing', async () => {
        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({});

        expect(res.status).toBe(400);
    });

    it('should return 503 when Dropbox is disabled', async () => {
        const dropboxService = require('../../dropbox-service');
        const original = dropboxService.getDropboxClient;
        dropboxService.getDropboxClient = () => null;
        try {
            const res = await request(app)
                .post('/api/dropbox/thumbnails')
                .send({ paths: ['/photo.jpg'] });
            expect(res.status).toBe(503);
        } finally {
            dropboxService.getDropboxClient = original;
        }
    });

    it('should return 500 on Dropbox API error', async () => {
        mockDbxClient.filesGetThumbnailBatch.mockRejectedValue(new Error('API error'));

        const res = await request(app)
            .post('/api/dropbox/thumbnails')
            .send({ paths: ['/photo.jpg'] });

        expect(res.status).toBe(500);
    });
});
