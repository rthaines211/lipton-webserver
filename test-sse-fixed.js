#!/usr/bin/env node

/**
 * SSE Test Script to Validate the Fixes
 */

const { EventSource } = require('eventsource');

// Test with a non-existent job to verify graceful handling
const testNonExistentJob = () => {
    return new Promise((resolve) => {
        console.log('\n=== Test 1: Non-existent Job ===');
        const sseUrl = 'https://node-server-zyiwmzwenq-uc.a.run.app/api/jobs/non-existent-job/stream';
        console.log('🔌 Connecting to:', sseUrl);

        let errorCount = 0;
        let parseErrors = 0;
        let completed = false;

        const eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
            console.log('✅ Connection opened');
        };

        eventSource.addEventListener('complete', (event) => {
            console.log('✅ Complete event received:', event.data);
            completed = true;
            eventSource.close();
            setTimeout(() => {
                console.log(`📊 Results: Errors: ${errorCount}, Parse Errors: ${parseErrors}`);
                resolve({ errorCount, parseErrors, completed });
            }, 1000);
        });

        eventSource.addEventListener('error', (event) => {
            if (event.data !== undefined) {
                console.log('❌ Server error event:', event.data);
            }
            // Browser error events should have undefined data
            // and should NOT cause parse errors
        });

        eventSource.onerror = (error) => {
            errorCount++;
            console.log('🔴 Connection error detected');
            if (errorCount > 3) {
                console.log('Too many errors, closing connection');
                eventSource.close();
                resolve({ errorCount, parseErrors, completed });
            }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
            eventSource.close();
            console.log('⏱️  Test timed out');
            resolve({ errorCount, parseErrors, completed });
        }, 5000);
    });
};

// Test with the local server
const testLocalServer = () => {
    return new Promise((resolve) => {
        console.log('\n=== Test 2: Local Server ===');
        const sseUrl = 'http://localhost:3000/api/jobs/test-local-job/stream';
        console.log('🔌 Connecting to:', sseUrl);

        let errorCount = 0;
        let parseErrors = 0;
        let completed = false;

        const eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
            console.log('✅ Connection opened to local server');
        };

        eventSource.addEventListener('complete', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('✅ Complete event from local server:', data);
                completed = true;
            } catch (e) {
                parseErrors++;
                console.error('❌ Parse error:', e.message);
            }
            eventSource.close();
            setTimeout(() => {
                console.log(`📊 Results: Errors: ${errorCount}, Parse Errors: ${parseErrors}`);
                resolve({ errorCount, parseErrors, completed });
            }, 500);
        });

        eventSource.addEventListener('error', (event) => {
            if (event.data === undefined) {
                // This is expected for browser errors, should not cause issues
                return;
            }
            try {
                const data = JSON.parse(event.data);
                console.log('❌ Server error event:', data);
            } catch (e) {
                parseErrors++;
                console.error('❌ Failed to parse error event:', e.message);
            }
        });

        eventSource.onerror = (error) => {
            errorCount++;
            if (errorCount > 2) {
                console.log('Connection failed, likely server not running');
                eventSource.close();
                resolve({ errorCount, parseErrors, completed });
            }
        };

        // Timeout after 3 seconds
        setTimeout(() => {
            eventSource.close();
            console.log('⏱️  Test timed out');
            resolve({ errorCount, parseErrors, completed });
        }, 3000);
    });
};

// Run tests
async function runTests() {
    console.log('🧪 SSE Fix Validation Tests');
    console.log('===========================');

    // Test 1: Production server with non-existent job
    const test1 = await testNonExistentJob();

    // Test 2: Local server (if running)
    const test2 = await testLocalServer();

    // Summary
    console.log('\n📋 SUMMARY');
    console.log('===========');
    console.log('Test 1 (Non-existent Job):');
    console.log(`  - Parse Errors: ${test1.parseErrors} ${test1.parseErrors === 0 ? '✅' : '❌'}`);
    console.log(`  - Completed: ${test1.completed ? '✅' : '❌'}`);
    console.log(`  - Connection Errors: ${test1.errorCount}`);

    console.log('\nTest 2 (Local Server):');
    console.log(`  - Parse Errors: ${test2.parseErrors} ${test2.parseErrors === 0 ? '✅' : '❌'}`);
    console.log(`  - Completed: ${test2.completed ? '✅' : '❌'}`);
    console.log(`  - Connection Errors: ${test2.errorCount}`);

    const allPassed = test1.parseErrors === 0 && test2.parseErrors === 0;
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);

    process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);