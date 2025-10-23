/**
 * 503 Service Unavailable Handling Diagnostic Test
 *
 * Purpose: Monitor how the SSE client handles 503 errors from Cloud Run
 *
 * What this tests:
 * 1. Does the client differentiate between 503 and other connection errors?
 * 2. Is there exponential backoff or immediate retry?
 * 3. How many retry attempts occur after a 503?
 * 4. Does it eventually succeed or fail permanently?
 *
 * Run this in browser console to monitor 503 handling behavior
 */

(function() {
    console.log('🔬 Starting 503 Service Unavailable Diagnostic');
    console.log('================================================\n');

    const errorLog = [];
    let test503Count = 0;

    // Monitor EventSource errors
    const OriginalEventSource = window.EventSource;

    window.EventSource = function(...args) {
        const instance = new OriginalEventSource(...args);
        const url = args[0];

        instance.addEventListener('error', function(event) {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                url: url.substring(0, 50) + '...',
                readyState: instance.readyState,
                readyStateText: ['CONNECTING', 'OPEN', 'CLOSED'][instance.readyState] || 'UNKNOWN'
            };

            errorLog.push(errorEntry);

            console.log(`❌ [Error #${errorLog.length}] EventSource error:`, errorEntry);

            // Check if this might be a 503
            if (instance.readyState === EventSource.CLOSED || instance.readyState === EventSource.CONNECTING) {
                test503Count++;
                console.warn(`⚠️ Possible 503 or connection failure (count: ${test503Count})`);
            }
        });

        // Monitor successful connections after errors
        instance.addEventListener('open', function(event) {
            if (errorLog.length > 0) {
                const lastError = errorLog[errorLog.length - 1];
                const timeSinceError = Date.now() - new Date(lastError.timestamp);

                console.log(`✅ Connection reopened after error:`, {
                    errorCount: errorLog.length,
                    timeSinceLastError: timeSinceError + 'ms',
                    totalTest503s: test503Count
                });
            }
        });

        return instance;
    };

    window.EventSource.CONNECTING = OriginalEventSource.CONNECTING;
    window.EventSource.OPEN = OriginalEventSource.OPEN;
    window.EventSource.CLOSED = OriginalEventSource.CLOSED;

    // Monitor reconnection timing
    if (window.JobProgressStream) {
        const reconnectTimings = [];

        const OriginalJobProgressStream = window.JobProgressStream;

        window.JobProgressStream = class extends OriginalJobProgressStream {
            handleConnectionError() {
                const timing = {
                    timestamp: new Date().toISOString(),
                    jobId: this.jobId,
                    attemptNumber: this.reconnectAttempts + 1,
                    maxAttempts: this.maxReconnectAttempts,
                    plannedDelay: this.reconnectDelays[this.reconnectAttempts] || 'MAX_REACHED'
                };

                reconnectTimings.push(timing);

                console.log(`🔄 [Reconnect #${timing.attemptNumber}]`, {
                    jobId: timing.jobId,
                    delay: timing.plannedDelay + 'ms',
                    attemptsRemaining: timing.maxAttempts - timing.attemptNumber
                });

                return super.handleConnectionError();
            }
        };

        window.getReconnectTimings = function() {
            console.log('\n📊 RECONNECTION TIMING ANALYSIS');
            console.log('================================\n');

            if (reconnectTimings.length === 0) {
                console.log('No reconnection attempts logged yet.');
                return;
            }

            console.table(reconnectTimings);

            // Calculate intervals
            console.log('\n⏱️ Time between reconnection attempts:');
            for (let i = 1; i < reconnectTimings.length; i++) {
                const prev = new Date(reconnectTimings[i - 1].timestamp);
                const curr = new Date(reconnectTimings[i].timestamp);
                const interval = curr - prev;

                console.log(`  Attempt ${i} -> ${i + 1}: ${interval}ms (expected: ${reconnectTimings[i - 1].plannedDelay}ms)`);
            }

            return reconnectTimings;
        };

        console.log('✅ Reconnection timing monitoring enabled\n');
    }

    // Provide analysis function
    window.get503Report = function() {
        console.log('\n📊 503 ERROR HANDLING REPORT');
        console.log('============================\n');

        console.log(`Total EventSource errors: ${errorLog.length}`);
        console.log(`Suspected 503 errors: ${test503Count}`);

        if (errorLog.length > 0) {
            console.log('\n📜 Error History:');
            console.table(errorLog);

            // Check for rapid retries (indication of no backoff)
            console.log('\n⚠️ Checking for rapid retry pattern (no backoff):');
            let rapidRetries = 0;

            for (let i = 1; i < errorLog.length; i++) {
                const prev = new Date(errorLog[i - 1].timestamp);
                const curr = new Date(errorLog[i].timestamp);
                const interval = curr - prev;

                if (interval < 2000) { // Less than 2 seconds between errors
                    rapidRetries++;
                    console.warn(`  ⚡ Rapid retry detected: ${interval}ms between errors ${i} and ${i + 1}`);
                }
            }

            if (rapidRetries > 2) {
                console.error(`\n❌ PROBLEM: ${rapidRetries} rapid retries detected - no exponential backoff!`);
            } else if (rapidRetries > 0) {
                console.warn(`\n⚠️ ${rapidRetries} rapid retries detected - review backoff strategy`);
            } else {
                console.log('\n✅ No rapid retries detected - backoff appears to be working');
            }
        }

        console.log('\n📋 Recommendations:');
        console.log('  1. Check if 503 errors are specifically handled');
        console.log('  2. Verify exponential backoff is implemented');
        console.log('  3. Consider circuit breaker pattern for persistent 503s');
        console.log('  4. Add jitter to prevent thundering herd problem');

        return { errorLog, test503Count };
    };

    console.log('📋 Test Instructions:');
    console.log('1. Submit a form to trigger SSE connection');
    console.log('2. Observe error patterns in the logs');
    console.log('3. Run get503Report() to see analysis');
    console.log('4. Run getReconnectTimings() to see reconnection delays\n');

    console.log('✅ 503 diagnostic test ready.\n');
})();
