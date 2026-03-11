const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../services/dropbox-browser');
jest.mock('../../services/exhibit-processor');
jest.mock('../../services/async-job-manager');
jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn(() => ({
        bucket: jest.fn(() => ({
            file: jest.fn(() => ({
                save: jest.fn(),
                getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url']),
            })),
        })),
    })),
}));
jest.mock('@sentry/node', () => ({
    captureException: jest.fn(),
    startSpan: jest.fn((opts, cb) => cb()),
    addBreadcrumb: jest.fn(),
    setContext: jest.fn(),
    withScope: jest.fn(),
}));
jest.mock('../../monitoring/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));
jest.mock('../../middleware/error-handler', () => ({
    asyncHandler: (fn) => fn,
}));

const AsyncJobManager = require('../../services/async-job-manager');

const exhibitRoutes = require('../../routes/exhibits');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/exhibits', exhibitRoutes);

describe('POST /api/exhibits/generate-from-dropbox', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 400 when caseName is missing', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({ exhibitMapping: { A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }] } });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/caseName/);
    });

    it('should return 400 when exhibitMapping is missing', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({ caseName: 'Test' });
        expect(res.status).toBe(400);
    });

    it('should return jobId in realtime mode for small sets', async () => {
        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({
                caseName: 'Smith v Jones',
                exhibitMapping: {
                    A: [{ dropboxPath: '/lease.pdf', name: 'lease.pdf' }],
                },
                mode: 'realtime',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.mode).toBe('realtime');
        expect(res.body.jobId).toBeDefined();
    });

    it('should create async job for large sets', async () => {
        const largeMapping = {};
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            largeMapping[letter] = Array.from({ length: 3 }, (_, j) => ({
                dropboxPath: `/Cases/${letter}_${j}.pdf`,
                name: `${letter}_${j}.pdf`,
            }));
        }

        AsyncJobManager.createJob.mockResolvedValue({
            id: 'uuid-async',
            status: 'pending',
        });

        const res = await request(app)
            .post('/api/exhibits/generate-from-dropbox')
            .send({
                caseName: 'Large Case',
                exhibitMapping: largeMapping,
                mode: 'async',
                email: 'test@example.com',
            });

        expect(AsyncJobManager.createJob).toHaveBeenCalledWith(
            expect.objectContaining({
                caseName: 'Large Case',
                totalFiles: 78,
                email: 'test@example.com',
            })
        );
    });
});
