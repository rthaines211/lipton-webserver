/**
 * Progress State undefined/undefined Diagnostic Test
 *
 * Purpose: Identify why progress-state.js logs "undefined/undefined"
 *
 * What this tests:
 * 1. Are current/total parameters being passed to saveJobState()?
 * 2. Are current/total being passed to updateJobProgress()?
 * 3. What values are in the localStorage state?
 * 4. Is the log statement correctly referencing the variables?
 *
 * Run this in browser console to trace progress state issues
 */

(function() {
    console.log('🔬 Starting Progress State undefined/undefined Diagnostic');
    console.log('==========================================================\n');

    const functionCalls = [];

    // Intercept saveJobState
    if (typeof window.saveJobState === 'function') {
        const originalSaveJobState = window.saveJobState;

        window.saveJobState = function(jobId, current, total, status, outputUrl = null) {
            const call = {
                timestamp: new Date().toISOString(),
                function: 'saveJobState',
                jobId,
                current,
                total,
                status,
                outputUrl,
                currentType: typeof current,
                totalType: typeof total
            };

            functionCalls.push(call);

            console.log('💾 saveJobState() called:', {
                jobId,
                current: `${current} (${typeof current})`,
                total: `${total} (${typeof total})`,
                status,
                outputUrl
            });

            // Check for undefined values
            if (current === undefined || total === undefined) {
                console.error('❌ PROBLEM FOUND: undefined values passed to saveJobState!', {
                    current,
                    total
                });
                console.trace('Call stack:');
            }

            return originalSaveJobState.call(this, jobId, current, total, status, outputUrl);
        };

        console.log('✅ saveJobState() monitoring enabled');
    }

    // Intercept updateJobProgress
    if (typeof window.updateJobProgress === 'function') {
        const originalUpdateJobProgress = window.updateJobProgress;

        window.updateJobProgress = function(jobId, current, total, message = '') {
            const call = {
                timestamp: new Date().toISOString(),
                function: 'updateJobProgress',
                jobId,
                current,
                total,
                message,
                currentType: typeof current,
                totalType: typeof total
            };

            functionCalls.push(call);

            console.log('📊 updateJobProgress() called:', {
                jobId,
                current: `${current} (${typeof current})`,
                total: `${total} (${typeof total})`,
                message
            });

            // Check for undefined values
            if (current === undefined || total === undefined) {
                console.error('❌ PROBLEM FOUND: undefined values passed to updateJobProgress!', {
                    current,
                    total,
                    message
                });
                console.trace('Call stack:');
            }

            return originalUpdateJobProgress.call(this, jobId, current, total, message);
        };

        console.log('✅ updateJobProgress() monitoring enabled');
    }

    // Intercept markJobComplete
    if (typeof window.markJobComplete === 'function') {
        const originalMarkJobComplete = window.markJobComplete;

        window.markJobComplete = function(jobId, total, outputUrl = '') {
            const call = {
                timestamp: new Date().toISOString(),
                function: 'markJobComplete',
                jobId,
                total,
                outputUrl,
                totalType: typeof total
            };

            functionCalls.push(call);

            console.log('✅ markJobComplete() called:', {
                jobId,
                total: `${total} (${typeof total})`,
                outputUrl
            });

            if (total === undefined) {
                console.error('❌ PROBLEM FOUND: undefined total passed to markJobComplete!', {
                    total
                });
                console.trace('Call stack:');
            }

            return originalMarkJobComplete.call(this, jobId, total, outputUrl);
        };

        console.log('✅ markJobComplete() monitoring enabled');
    }

    // Monitor SSE progress events
    if (window.JobProgressStream) {
        const OriginalJobProgressStream = window.JobProgressStream;

        window.JobProgressStream = class extends OriginalJobProgressStream {
            handleProgressEvent(event) {
                console.log('📡 SSE progress event received:', {
                    jobId: this.jobId,
                    eventData: event.data
                });

                try {
                    const data = JSON.parse(event.data);
                    console.log('📦 Parsed progress data:', {
                        current: data.current,
                        total: data.total,
                        message: data.message,
                        currentType: typeof data.current,
                        totalType: typeof data.total
                    });

                    if (data.current === undefined || data.total === undefined) {
                        console.error('❌ PROBLEM FOUND: SSE event missing current/total!', data);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse SSE event data:', error);
                }

                return super.handleProgressEvent(event);
            }

            handleCompleteEvent(event) {
                console.log('✅ SSE complete event received:', {
                    jobId: this.jobId,
                    eventData: event.data
                });

                try {
                    const data = JSON.parse(event.data);
                    console.log('📦 Parsed completion data:', {
                        total: data.total,
                        outputUrl: data.outputUrl,
                        totalType: typeof data.total
                    });

                    if (data.total === undefined) {
                        console.error('❌ PROBLEM FOUND: SSE completion event missing total!', data);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse SSE completion data:', error);
                }

                return super.handleCompleteEvent(event);
            }
        };

        console.log('✅ SSE event monitoring enabled');
    }

    // Utility to inspect localStorage
    window.inspectJobStates = function() {
        console.log('\n🔍 LOCALSTORAGE JOB STATES');
        console.log('===========================\n');

        const jobStates = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (key && key.startsWith('job_')) {
                try {
                    const value = localStorage.getItem(key);
                    const state = JSON.parse(value);

                    jobStates.push({
                        key,
                        jobId: state.jobId,
                        current: state.current,
                        total: state.total,
                        status: state.status,
                        currentType: typeof state.current,
                        totalType: typeof state.total
                    });

                    if (state.current === undefined || state.total === undefined) {
                        console.error(`❌ PROBLEM FOUND in ${key}:`, {
                            current: state.current,
                            total: state.total
                        });
                    }
                } catch (error) {
                    console.error(`Failed to parse ${key}:`, error);
                }
            }
        }

        if (jobStates.length > 0) {
            console.table(jobStates);
        } else {
            console.log('No job states in localStorage');
        }

        return jobStates;
    };

    // Report function
    window.getProgressStateReport = function() {
        console.log('\n📊 PROGRESS STATE DIAGNOSTIC REPORT');
        console.log('====================================\n');

        console.log(`Total function calls logged: ${functionCalls.length}`);

        if (functionCalls.length > 0) {
            console.log('\n📜 Function Call History:');
            console.table(functionCalls);

            // Check for undefined patterns
            const undefinedCalls = functionCalls.filter(c =>
                c.current === undefined || c.total === undefined
            );

            if (undefinedCalls.length > 0) {
                console.error(`\n❌ FOUND ${undefinedCalls.length} calls with undefined values!`);
                console.table(undefinedCalls);

                console.log('\n🔍 Root Cause Analysis:');
                console.log('These functions were called with undefined values.');
                console.log('Check the calling code (see stack traces above) to identify where values are missing.');
            } else {
                console.log('\n✅ All function calls had defined current/total values');
            }
        }

        // Inspect current localStorage state
        console.log('\n📁 Current localStorage state:');
        window.inspectJobStates();

        console.log('\n📋 Common Causes:');
        console.log('  1. SSE event data missing current/total fields');
        console.log('  2. updateJobProgress() called without current/total parameters');
        console.log('  3. Log statement references wrong variables (e.g., done instead of current)');
        console.log('  4. Form submission doesn\'t include progress metadata');

        return { functionCalls };
    };

    console.log('\n📋 Test Instructions:');
    console.log('1. Submit a form to trigger SSE progress tracking');
    console.log('2. Watch for "undefined" warnings in the logs');
    console.log('3. Run getProgressStateReport() to see analysis');
    console.log('4. Run inspectJobStates() to check localStorage\n');

    console.log('✅ Progress state diagnostic test ready.\n');
})();
