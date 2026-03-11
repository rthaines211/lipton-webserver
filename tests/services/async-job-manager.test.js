const mockQuery = jest.fn();

jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        query: mockQuery,
    })),
}));

const AsyncJobManager = require('../../services/async-job-manager');

describe('AsyncJobManager', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('createJob', () => {
        it('should insert a job and return the row', async () => {
            const job = {
                caseName: 'Smith v Jones',
                totalFiles: 150,
                exhibitMapping: { A: [{ path: '/a.pdf', name: 'a.pdf' }] },
                dropboxSourcePath: '/Cases/Smith',
                email: 'test@example.com',
            };
            mockQuery.mockResolvedValue({
                rows: [{ id: 'uuid-123', status: 'pending', ...job }],
            });
            const result = await AsyncJobManager.createJob(job);
            expect(result.id).toBe('uuid-123');
            expect(result.status).toBe('pending');
            expect(mockQuery).toHaveBeenCalledTimes(1);
            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/INSERT INTO exhibit_jobs/);
            expect(params).toContain('Smith v Jones');
            expect(params).toContain(150);
        });
    });

    describe('getJob', () => {
        it('should return a job by ID', async () => {
            mockQuery.mockResolvedValue({
                rows: [{ id: 'uuid-123', status: 'processing', progress: 45 }],
            });
            const result = await AsyncJobManager.getJob('uuid-123');
            expect(result.status).toBe('processing');
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['uuid-123']);
        });

        it('should return null for non-existent job', async () => {
            mockQuery.mockResolvedValue({ rows: [] });
            const result = await AsyncJobManager.getJob('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('updateProgress', () => {
        it('should update progress and message', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });
            await AsyncJobManager.updateProgress('uuid-123', {
                status: 'processing', progress: 50, progressMessage: 'Processing files...',
            });
            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/UPDATE exhibit_jobs/);
            expect(params).toContain('processing');
            expect(params).toContain(50);
        });
    });

    describe('completeJob', () => {
        it('should set status to complete with output URLs', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });
            await AsyncJobManager.completeJob('uuid-123', {
                gcsOutputUrl: 'https://storage.googleapis.com/...',
                dropboxOutputPath: '/Cases/Smith/Exhibits.pdf',
            });
            const [sql] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/status = 'complete'/);
            expect(sql).toMatch(/completed_at = NOW/);
        });
    });

    describe('failJob', () => {
        it('should set status to failed with error message', async () => {
            mockQuery.mockResolvedValue({ rowCount: 1 });
            await AsyncJobManager.failJob('uuid-123', 'Out of memory');
            const [sql, params] = mockQuery.mock.calls[0];
            expect(sql).toMatch(/status = 'failed'/);
            expect(params).toContain('Out of memory');
        });
    });

    describe('listJobs', () => {
        it('should return recent jobs ordered by created_at desc', async () => {
            mockQuery.mockResolvedValue({
                rows: [
                    { id: 'uuid-2', status: 'processing', created_at: '2026-03-11' },
                    { id: 'uuid-1', status: 'complete', created_at: '2026-03-10' },
                ],
            });
            const result = await AsyncJobManager.listJobs();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('uuid-2');
        });
    });
});
