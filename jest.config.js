/**
 * Jest Configuration
 * Testing framework configuration for unit and integration tests
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'services/**/*.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        'config/**/*.js',
        'errors/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/__tests__/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Module paths
    modulePaths: ['<rootDir>'],

    // Test timeout
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks between tests
    restoreMocks: true
};
