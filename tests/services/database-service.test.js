/**
 * Database Service Tests
 */

const DatabaseService = require('../../services/database-service');

describe('DatabaseService', () => {
    describe('getPoolStats', () => {
        it('should return pool statistics', () => {
            const stats = DatabaseService.getPoolStats();

            expect(stats).toHaveProperty('totalCount');
            expect(stats).toHaveProperty('idleCount');
            expect(stats).toHaveProperty('waitingCount');
            expect(stats).toHaveProperty('maxSize');
            expect(stats).toHaveProperty('isConnected');
            expect(stats.maxSize).toBe(20); // Default pool size
        });
    });

    describe('getConfig', () => {
        it('should return sanitized configuration', () => {
            const config = DatabaseService.getConfig();

            expect(config).toHaveProperty('host');
            expect(config).toHaveProperty('port');
            expect(config).toHaveProperty('database');
            expect(config).toHaveProperty('user');
            expect(config).not.toHaveProperty('password'); // Sensitive data removed
        });
    });

    describe('healthCheck', () => {
        it('should return health status', async () => {
            const health = await DatabaseService.healthCheck();

            expect(health).toHaveProperty('healthy');
            expect(health).toHaveProperty('poolStats');

            if (health.healthy) {
                expect(health).toHaveProperty('timestamp');
                expect(health).toHaveProperty('database');
                expect(health).toHaveProperty('user');
            }
        }, 15000); // Longer timeout for database operations
    });
});
