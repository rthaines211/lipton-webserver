/**
 * AppError Tests
 */

const {
    AppError,
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    DatabaseError,
    isOperationalError
} = require('../../errors/AppError');

describe('AppError', () => {
    describe('AppError base class', () => {
        it('should create error with all properties', () => {
            const error = new AppError('Test error', 500, 'TEST_ERROR', { field: 'test' });

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.errorCode).toBe('TEST_ERROR');
            expect(error.isOperational).toBe(true);
            expect(error.metadata).toEqual({ field: 'test' });
            expect(error.timestamp).toBeDefined();
        });

        it('should convert to JSON correctly', () => {
            const error = new AppError('Test error', 400, 'TEST_ERROR');
            const json = error.toJSON();

            expect(json).toHaveProperty('error');
            expect(json.error.message).toBe('Test error');
            expect(json.error.code).toBe('TEST_ERROR');
            expect(json.error.statusCode).toBe(400);
        });
    });

    describe('ValidationError', () => {
        it('should create validation error with correct status code', () => {
            const error = new ValidationError('Invalid email', 'email');

            expect(error.statusCode).toBe(400);
            expect(error.errorCode).toBe('VALIDATION_ERROR');
            expect(error.metadata.field).toBe('email');
        });
    });

    describe('UnauthorizedError', () => {
        it('should create unauthorized error', () => {
            const error = new UnauthorizedError();

            expect(error.statusCode).toBe(401);
            expect(error.errorCode).toBe('UNAUTHORIZED');
            expect(error.message).toBe('Authentication required');
        });
    });

    describe('NotFoundError', () => {
        it('should create not found error with resource and ID', () => {
            const error = new NotFoundError('Form Entry', '123');

            expect(error.statusCode).toBe(404);
            expect(error.errorCode).toBe('NOT_FOUND');
            expect(error.message).toContain('Form Entry');
            expect(error.message).toContain('123');
        });
    });

    describe('DatabaseError', () => {
        it('should create database error with operation', () => {
            const originalError = new Error('Connection timeout');
            originalError.code = '08006';

            const error = new DatabaseError('DB connection failed', 'connect', originalError);

            expect(error.statusCode).toBe(500);
            expect(error.errorCode).toBe('DATABASE_ERROR');
            expect(error.metadata.operation).toBe('connect');
            expect(error.metadata.originalMessage).toBe('Connection timeout');
            expect(error.metadata.code).toBe('08006');
        });
    });

    describe('isOperationalError', () => {
        it('should return true for AppError instances', () => {
            const error = new ValidationError('Test');
            expect(isOperationalError(error)).toBe(true);
        });

        it('should return false for generic Error', () => {
            const error = new Error('Generic error');
            expect(isOperationalError(error)).toBe(false);
        });
    });
});
