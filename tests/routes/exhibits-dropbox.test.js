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
    startSpan: jest.fn((opts, cb) => cb({ setAttribute: jest.fn(), setStatus: jest.fn() })),
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

describe('POST /api/exhibits/jobs/:jobId/resolve - group format', () => {
    let jobId;
    let jobs;

    beforeEach(() => {
        jest.clearAllMocks();
        // Access the internal jobs Map via the test export
        jobs = require('../../routes/exhibits')._getJobsMap();
        jobId = `test-job-${Date.now()}`;

        // Seed a job in awaiting_resolution state with group-based duplicates
        jobs.set(jobId, {
            sessionId: 'sess-test',
            status: 'awaiting_resolution',
            caseName: 'Test Case',
            sseClients: [],
            tempDir: null,
            exhibits: {
                A: [
                    { name: 'a.png', type: 'png', filePath: '/tmp/a.png' },
                    { name: 'b.png', type: 'png', filePath: '/tmp/b.png' },
                    { name: 'c.png', type: 'png', filePath: '/tmp/c.png' },
                ],
            },
            duplicates: {
                A: [
                    {
                        groupId: 'A-g0',
                        matchType: 'EXACT_DUPLICATE',
                        files: ['a.png', 'b.png', 'c.png'],
                    },
                ],
            },
        });
    });

    afterEach(() => {
        jobs.delete(jobId);
    });

    it('should accept group-based resolutions and remove files', async () => {
        // Mock ExhibitProcessor.resume to resolve successfully
        const ExhibitProcessor = require('../../services/exhibit-processor');
        ExhibitProcessor.resume = jest.fn().mockResolvedValue({
            filename: 'Test_Case_Exhibits.pdf',
            outputPath: '/tmp/out.pdf',
            pdfBuffer: Buffer.from('pdf'),
        });

        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{ groupId: 'A-g0', keep: ['a.png'], remove: ['b.png', 'c.png'] }],
                },
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should reject resolutions with empty keep array', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{ groupId: 'A-g0', keep: [], remove: ['a.png', 'b.png', 'c.png'] }],
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/keep at least one file/);
    });

    it('should reject resolutions where keep+remove does not match group files', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{ groupId: 'A-g0', keep: ['a.png'], remove: ['b.png'] }], // missing c.png
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/does not match files/);
    });

    it('should reject resolutions for non-existent exhibit letter', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    Z: [{ groupId: 'Z-g0', keep: ['x.png'], remove: [] }],
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Exhibit letter Z not found/);
    });

    it('should reject resolutions for unknown groupId', async () => {
        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({
                resolutions: {
                    A: [{ groupId: 'A-BOGUS', keep: ['a.png'], remove: ['b.png', 'c.png'] }],
                },
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Unknown groupId/);
    });

    it('should return 404 for unknown job', async () => {
        const res = await request(app)
            .post('/api/exhibits/jobs/nonexistent-job/resolve')
            .send({ resolutions: {} });

        expect(res.status).toBe(404);
    });

    it('should return 400 if job is not awaiting resolution', async () => {
        jobs.get(jobId).status = 'processing';

        const res = await request(app)
            .post(`/api/exhibits/jobs/${jobId}/resolve`)
            .send({ resolutions: {} });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/not awaiting resolution/);
    });
});
