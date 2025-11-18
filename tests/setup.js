/**
 * Jest Test Setup
 * Runs before each test suite
 */

// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests (optional)
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
