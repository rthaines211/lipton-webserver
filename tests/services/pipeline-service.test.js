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
        it('should return null for non-existent case', () => {
            const status = pipelineService.getPipelineStatus('non-existent-case-id');
            expect(status).toBeNull();
        });

        it('should return status for existing case', () => {
            const testCaseId = 'test-case-123';
            const testStatus = {
                status: 'processing',
                phase: 'test',
                message: 'Test message'
            };

            pipelineService.setPipelineStatus(testCaseId, testStatus);
            const status = pipelineService.getPipelineStatus(testCaseId);

            expect(status).toEqual(testStatus);
        });
    });

    describe('setPipelineStatus', () => {
        it('should store pipeline status with TTL', () => {
            const caseId = 'test-case-456';
            const statusData = {
                status: 'completed',
                phase: 'final',
                message: 'All done'
            };

            pipelineService.setPipelineStatus(caseId, statusData);
            const retrieved = pipelineService.getPipelineStatus(caseId);

            expect(retrieved).toEqual(statusData);
        });
    });
});
