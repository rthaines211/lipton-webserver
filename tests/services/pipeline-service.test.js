/**
 * Pipeline Service Tests
 */

const pipelineService = require('../../services/pipeline-service');

describe('PipelineService', () => {
    describe('getConfig', () => {
        it('should return pipeline configuration', () => {
            const config = pipelineService.getConfig();

            expect(config).toHaveProperty('apiUrl');
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('timeout');
            expect(config).toHaveProperty('executeOnSubmit');
            expect(config).toHaveProperty('continueOnFailure');
        });
    });

    describe('getPipelineStatus', () => {
        it('should return null for non-existent case', async () => {
            const status = await pipelineService.getPipelineStatus('non-existent-case-id');
            expect(status).toBeNull();
        });

        it('should return status for existing case', async () => {
            const testCaseId = 'test-case-123';
            const testStatus = {
                status: 'processing',
                phase: 'test',
                message: 'Test message'
            };

            await pipelineService.setPipelineStatus(testCaseId, testStatus);
            const status = await pipelineService.getPipelineStatus(testCaseId);

            expect(status).toEqual(testStatus);
        });
    });

    describe('setPipelineStatus', () => {
        it('should store pipeline status with TTL', async () => {
            const caseId = 'test-case-456';
            const statusData = {
                status: 'completed',
                phase: 'final',
                message: 'All done'
            };

            await pipelineService.setPipelineStatus(caseId, statusData);
            const retrieved = await pipelineService.getPipelineStatus(caseId);

            expect(retrieved).toEqual(statusData);
        });
    });
});
