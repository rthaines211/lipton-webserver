const request = require('supertest');
const express = require('express');
const jobsRoutes = require('../../routes/jobs');

jest.mock('../../services/async-job-manager', () => ({
    listJobs: jest.fn(),
    getJob: jest.fn(),
}));
const AsyncJobManager = require('../../services/async-job-manager');

const app = express();
app.use(express.json());
app.use('/api/jobs', jobsRoutes);

describe('Jobs API', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('GET /api/jobs', () => {
        it('should return list of recent jobs', async () => {
            AsyncJobManager.listJobs.mockResolvedValue([
                { id: 'uuid-1', status: 'complete', case_name: 'Smith v Jones' },
            ]);
            const res = await request(app).get('/api/jobs');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.jobs).toHaveLength(1);
        });

        it('should pass limit query parameter', async () => {
            AsyncJobManager.listJobs.mockResolvedValue([]);
            await request(app).get('/api/jobs?limit=5');
            expect(AsyncJobManager.listJobs).toHaveBeenCalledWith({ limit: 5 });
        });

        it('should default limit to 20', async () => {
            AsyncJobManager.listJobs.mockResolvedValue([]);
            await request(app).get('/api/jobs');
            expect(AsyncJobManager.listJobs).toHaveBeenCalledWith({ limit: 20 });
        });

        it('should return 500 on error', async () => {
            AsyncJobManager.listJobs.mockRejectedValue(new Error('DB down'));
            const res = await request(app).get('/api/jobs');
            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/jobs/:id', () => {
        it('should return a specific job', async () => {
            AsyncJobManager.getJob.mockResolvedValue({
                id: 'uuid-1', status: 'processing', progress: 42,
            });
            const res = await request(app).get('/api/jobs/uuid-1');
            expect(res.status).toBe(200);
            expect(res.body.job.progress).toBe(42);
        });

        it('should return 404 for non-existent job', async () => {
            AsyncJobManager.getJob.mockResolvedValue(null);
            const res = await request(app).get('/api/jobs/nonexistent');
            expect(res.status).toBe(404);
        });

        it('should return 500 on error', async () => {
            AsyncJobManager.getJob.mockRejectedValue(new Error('DB down'));
            const res = await request(app).get('/api/jobs/uuid-1');
            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });
});
