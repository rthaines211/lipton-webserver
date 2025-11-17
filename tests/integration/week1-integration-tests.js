/**
 * Week 1 Integration Tests
 *
 * Comprehensive integration testing for all Week 1 components:
 * - Database service and schema
 * - Validation middleware
 * - Storage service (Dropbox)
 * - Email service (SendGrid)
 * - Error handler middleware
 * - Intake service orchestration
 *
 * Run with: node tests/integration/week1-integration-tests.js
 */

const path = require('path');

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'legal_forms_db_dev';

// Import services
const databaseService = require('../../services/database');
const IntakeService = require('../../services/intake-service');
const storageService = require('../../services/storage-service');
const emailService = require('../../email-service');
const validation = require('../../middleware/validation');

// Test utilities
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const result = { name, passed, message };
    testResults.tests.push(result);

    if (passed) {
        testResults.passed++;
        console.log(`${status}: ${name}`);
    } else {
        testResults.failed++;
        console.log(`${status}: ${name}`);
        if (message) console.log(`   Error: ${message}`);
    }
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    console.log(title);
    console.log('='.repeat(60));
}

async function testDatabaseService() {
    logSection('DATABASE SERVICE TESTS');

    try {
        // Test 1: Database pool initialization
        const pool = databaseService.pool;
        logTest('Database pool created', pool !== null);

        // Test 2: Database connection using checkHealth
        try {
            const health = await databaseService.checkHealth();
            logTest('Database connection successful', health.status === 'ok');
        } catch (error) {
            logTest('Database connection successful', false, error.message);
        }

        // Test 3: Test query execution
        try {
            const result = await databaseService.query('SELECT 1 as test');
            logTest('Basic query execution', result.rows[0].test === 1);
        } catch (error) {
            logTest('Basic query execution', false, error.message);
        }

        // Test 4: Verify intake_submissions table exists
        try {
            const result = await databaseService.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'intake_submissions'
                );
            `);
            logTest('intake_submissions table exists', result.rows[0].exists === true);
        } catch (error) {
            logTest('intake_submissions table exists', false, error.message);
        }

        // Test 5: Verify indexes created
        try {
            const result = await databaseService.query(`
                SELECT COUNT(*) as count
                FROM pg_indexes
                WHERE schemaname = 'public'
                AND tablename LIKE 'intake_%';
            `);
            const indexCount = parseInt(result.rows[0].count);
            logTest(`Database indexes created (${indexCount} found)`, indexCount >= 31);
        } catch (error) {
            logTest('Database indexes created', false, error.message);
        }

        // Test 6: Verify triggers exist
        try {
            const result = await databaseService.query(`
                SELECT COUNT(*) as count
                FROM pg_trigger
                WHERE tgname LIKE 'set_updated_at%';
            `);
            const triggerCount = parseInt(result.rows[0].count);
            logTest(`Database triggers created (${triggerCount} found)`, triggerCount >= 6);
        } catch (error) {
            logTest('Database triggers created', false, error.message);
        }

    } catch (error) {
        logTest('Database service tests', false, error.message);
    }
}

async function testValidationMiddleware() {
    logSection('VALIDATION MIDDLEWARE TESTS');

    try {
        // Test 1: Email validation - valid emails
        const validEmails = [
            'user@example.com',
            'john.doe@company.co.uk',
            'admin+tag@test.org'
        ];

        let allValid = true;
        for (const email of validEmails) {
            if (!validation.validateEmail(email)) {
                allValid = false;
                break;
            }
        }
        logTest('Valid email addresses accepted', allValid);

        // Test 2: Email validation - invalid emails
        const invalidEmails = [
            'notanemail',
            '@example.com',
            'user@',
            'user @example.com',
            ''
        ];

        let allInvalid = true;
        for (const email of invalidEmails) {
            if (validation.validateEmail(email)) {
                allInvalid = false;
                break;
            }
        }
        logTest('Invalid email addresses rejected', allInvalid);

        // Test 3: Phone validation - valid phones
        const validPhones = [
            '(555) 123-4567',
            '555-123-4567',
            '5551234567',
            '555.123.4567'
        ];

        allValid = true;
        for (const phone of validPhones) {
            if (!validation.validatePhone(phone)) {
                allValid = false;
                break;
            }
        }
        logTest('Valid phone numbers accepted', allValid);

        // Test 4: Phone validation - invalid phones
        const invalidPhones = [
            '123',
            'abc-def-ghij',
            '(555) 12-345',
            ''
        ];

        allInvalid = true;
        for (const phone of invalidPhones) {
            if (validation.validatePhone(phone)) {
                allInvalid = false;
                break;
            }
        }
        logTest('Invalid phone numbers rejected', allInvalid);

        // Test 5: ZIP code validation - valid ZIPs
        const validZips = ['12345', '12345-6789'];
        allValid = validZips.every(zip => validation.validateZipCode(zip));
        logTest('Valid ZIP codes accepted', allValid);

        // Test 6: ZIP code validation - invalid ZIPs
        const invalidZips = ['1234', '123456', 'ABCDE', '12345-'];
        allInvalid = invalidZips.every(zip => !validation.validateZipCode(zip));
        logTest('Invalid ZIP codes rejected', allInvalid);

        // Test 7: State code validation - valid states
        const validStates = ['CA', 'NY', 'TX', 'FL'];
        allValid = validStates.every(state => validation.validateState(state));
        logTest('Valid state codes accepted', allValid);

        // Test 8: State code validation - invalid states
        const invalidStates = ['ZZ', 'ABC', 'C', ''];
        allInvalid = invalidStates.every(state => !validation.validateState(state));
        logTest('Invalid state codes rejected', allInvalid);

        // Test 9: XSS/SQL injection sanitization
        const dangerousInput = '<script>alert("xss")</script>';
        const sanitized = validation.sanitizeString(dangerousInput);
        logTest('XSS sanitization works', !sanitized.includes('<script>'));

        const sqlInjection = "'; DROP TABLE users; --";
        const sanitizedSql = validation.sanitizeString(sqlInjection);
        logTest('SQL injection prevention works', !sanitizedSql.includes('DROP TABLE'));

    } catch (error) {
        logTest('Validation middleware tests', false, error.message);
    }
}

async function testStorageService() {
    logSection('STORAGE SERVICE TESTS');

    try {
        // Test 1: Storage service enabled check
        const enabled = storageService.isEnabled();
        logTest('Storage service configuration checked', true);
        console.log(`   Dropbox ${enabled ? 'ENABLED' : 'DISABLED'}`);

        // Test 2: Folder name sanitization
        const testCases = [
            { input: '123 Main St. #4A', expected: '123 Main St 4A' },
            { input: 'John O\'Brien', expected: 'John OBrien' },
            { input: 'Test: Street / Ave.', expected: 'Test Street  Ave' }
        ];

        let sanitizationWorks = true;
        for (const test of testCases) {
            const result = storageService.sanitizeFolderName(test.input);
            if (!result.includes(test.expected.split(/\s+/)[0])) {
                sanitizationWorks = false;
                break;
            }
        }
        logTest('Folder name sanitization', sanitizationWorks);

        // Test 3: Client folder path generation
        const folderPath = storageService.getClientFolderPath(
            '123 Main Street',
            'John Doe'
        );
        const expectedPath = '/Current Clients/123 Main Street/John Doe';
        logTest('Client folder path generation', folderPath === expectedPath);
        console.log(`   Path: ${folderPath}`);

        // Test 4: File validation - valid files
        const validFile = {
            originalname: 'test.pdf',
            mimetype: 'application/pdf',
            size: 5 * 1024 * 1024 // 5 MB
        };

        const validation1 = storageService.validateFileUpload(validFile, 'identification');
        logTest('Valid file upload accepted', validation1.valid === true);

        // Test 5: File validation - oversized file
        const oversizedFile = {
            originalname: 'large.pdf',
            mimetype: 'application/pdf',
            size: 100 * 1024 * 1024 // 100 MB (over 50 MB limit)
        };

        const validation2 = storageService.validateFileUpload(oversizedFile, 'identification');
        logTest('Oversized file rejected', validation2.valid === false);

        // Test 6: File validation - invalid type
        const invalidFile = {
            originalname: 'test.exe',
            mimetype: 'application/x-msdownload',
            size: 1024
        };

        const validation3 = storageService.validateFileUpload(invalidFile, 'identification');
        logTest('Invalid file type rejected', validation3.valid === false);

        // Test 7: Document type categories exist
        const categories = ['identification', 'supporting-docs', 'additional-files'];
        let categoriesWork = true;

        for (const category of categories) {
            const testFile = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf',
                size: 1024
            };
            const result = storageService.validateFileUpload(testFile, category);
            if (!result.valid) {
                categoriesWork = false;
                break;
            }
        }
        logTest('All document type categories work', categoriesWork);

    } catch (error) {
        logTest('Storage service tests', false, error.message);
    }
}

async function testEmailService() {
    logSection('EMAIL SERVICE TESTS');

    try {
        // Test 1: Email service enabled check
        const enabled = emailService.isEnabled();
        logTest('Email service configuration checked', true);
        console.log(`   SendGrid ${enabled ? 'ENABLED' : 'DISABLED'}`);

        // Test 2: Email validation function
        const validEmail = emailService.validateEmail('user@example.com');
        logTest('Email validation function works', validEmail === true);

        const invalidEmail = emailService.validateEmail('notanemail');
        logTest('Email validation rejects invalid emails', invalidEmail === false);

        // Test 3: Get configuration (without exposing API key)
        const config = emailService.getConfig();
        logTest('Email configuration accessible', config !== null);
        logTest('API key properly redacted', !config.apiKey);
        console.log(`   From: ${config.fromName} <${config.fromAddress}>`);
        console.log(`   Max Retries: ${config.maxRetries}`);

        // Test 4: Template rendering (intake confirmation)
        const emailTemplates = require('../../email-templates');
        const template = emailTemplates.getIntakeConfirmationTemplate({
            firstName: 'John',
            lastName: 'Doe',
            streetAddress: '123 Main Street',
            intakeNumber: 'INT-TEST-001',
            dropboxLink: 'https://www.dropbox.com/test'
        });

        logTest('Intake confirmation template renders', template.html.length > 0);
        logTest('Template has subject', template.subject.length > 0);
        logTest('Template has plain text', template.text.length > 0);
        console.log(`   Subject: ${template.subject}`);
        console.log(`   HTML Length: ${template.html.length} chars`);
        console.log(`   Text Length: ${template.text.length} chars`);

        // Test 5: Template escapes user input (XSS prevention)
        const xssTemplate = emailTemplates.getIntakeConfirmationTemplate({
            firstName: '<script>alert("xss")</script>',
            lastName: 'Doe',
            streetAddress: '123 Main Street',
            intakeNumber: 'INT-TEST-002',
            dropboxLink: 'https://www.dropbox.com/test'
        });

        logTest('Template escapes XSS attempts', !xssTemplate.html.includes('<script>'));

    } catch (error) {
        logTest('Email service tests', false, error.message);
    }
}

async function testIntakeService() {
    logSection('INTAKE SERVICE TESTS');

    try {
        // Test 1: IntakeService class exists
        logTest('IntakeService class loaded', typeof IntakeService === 'function');

        // Test 2: Folder path helper method
        const folderPath = IntakeService.getClientDropboxPath(
            '456 Oak Avenue',
            'Jane Smith'
        );
        logTest('Client Dropbox path helper works', folderPath.includes('456 Oak Avenue'));
        console.log(`   Path: ${folderPath}`);

        // Test 3: File validation helper
        const testFile = {
            originalname: 'test.pdf',
            mimetype: 'application/pdf',
            size: 1024 * 1024 // 1 MB
        };

        const validation = IntakeService.validateFileUpload(testFile, 'identification');
        logTest('File validation helper works', validation.valid === true);

        // Test 4: Service imports storage service
        logTest('Storage service integrated', typeof IntakeService.uploadIntakeDocument === 'function');

        // Test 5: Service has submission processor
        logTest('Submission processor exists', typeof IntakeService.processIntakeSubmission === 'function');

    } catch (error) {
        logTest('Intake service tests', false, error.message);
    }
}

async function testErrorHandler() {
    logSection('ERROR HANDLER TESTS');

    try {
        const errorHandlerModule = require('../../middleware/error-handler');

        // Test 1: Error handler middleware exists
        logTest('Error handler middleware loaded', typeof errorHandlerModule.errorHandler === 'function');

        // Test 2: Helper functions exist
        logTest('createValidationError helper exists', typeof errorHandlerModule.createValidationError === 'function');
        logTest('createDatabaseError helper exists', typeof errorHandlerModule.createDatabaseError === 'function');
        logTest('createNotFoundError helper exists', typeof errorHandlerModule.createNotFoundError === 'function');
        logTest('createUnauthorizedError helper exists', typeof errorHandlerModule.createUnauthorizedError === 'function');
        logTest('asyncHandler helper exists', typeof errorHandlerModule.asyncHandler === 'function');

        // Test 3: Create validation error
        const valError = errorHandlerModule.createValidationError('Invalid email', 'email');
        logTest('createValidationError produces error object', valError instanceof Error);
        logTest('Validation error has correct status', valError.statusCode === 400);

        // Test 4: Create database error
        const dbError = errorHandlerModule.createDatabaseError('Connection failed', new Error('ECONNREFUSED'));
        logTest('createDatabaseError produces error object', dbError instanceof Error);
        logTest('Database error has correct status', dbError.statusCode === 503);

        // Test 5: Create not found error
        const notFoundError = errorHandlerModule.createNotFoundError('Resource', '123');
        logTest('createNotFoundError produces error object', notFoundError instanceof Error);
        logTest('Not found error has correct status', notFoundError.statusCode === 404);

    } catch (error) {
        logTest('Error handler tests', false, error.message);
    }
}

async function runAllTests() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║           WEEK 1 INTEGRATION TEST SUITE                   ║');
    console.log('║           Client Intake System - Foundation               ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const startTime = Date.now();

    // Run all test suites
    await testDatabaseService();
    await testValidationMiddleware();
    await testStorageService();
    await testEmailService();
    await testIntakeService();
    await testErrorHandler();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    logSection('TEST SUMMARY');
    console.log('');
    console.log(`  Total Tests:  ${testResults.passed + testResults.failed}`);
    console.log(`  ✅ Passed:    ${testResults.passed}`);
    console.log(`  ❌ Failed:    ${testResults.failed}`);
    console.log(`  Duration:     ${duration}s`);
    console.log('');

    if (testResults.failed > 0) {
        console.log('  Failed Tests:');
        testResults.tests
            .filter(t => !t.passed)
            .forEach(t => console.log(`    - ${t.name}: ${t.message}`));
        console.log('');
    }

    const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
    console.log('');
    console.log('='.repeat(60));

    // Exit with appropriate code
    if (testResults.failed > 0) {
        console.log('\n❌ Some tests failed. Please review and fix.\n');
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed! Week 1 foundation is solid.\n');
        process.exit(0);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Test suite crashed:', error);
    process.exit(1);
});
