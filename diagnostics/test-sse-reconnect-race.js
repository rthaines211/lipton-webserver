/**
 * SSE Reconnection Race Condition Diagnostic Test
 *
 * Purpose: Identify the race condition between reconnection timer and job completion
 *
 * What this tests:
 * 1. Does clearReconnectTimeout() actually prevent scheduled reconnects?
 * 2. Are there multiple EventSource instances being created?
 * 3. Is jobCompleted flag being checked at all critical points?
 * 4. Are there any lingering event handlers after close()?
 *
 * Run this in browser console while monitoring SSE connections
 */

(function() {
    console.log('🔬 Starting SSE Reconnection Race Condition Diagnostic');
    console.log('================================================\n');

    // Override EventSource to track all instances
    const OriginalEventSource = window.EventSource;
    const eventSourceInstances = [];
    let instanceCounter = 0;

    window.EventSource = function(...args) {
        const instanceId = ++instanceCounter;
        const instance = new OriginalEventSource(...args);

        const tracked = {
            id: instanceId,
            url: args[0],
            instance: instance,
            createdAt: new Date().toISOString(),
            closedAt: null,
            readyState: instance.readyState
        };

        eventSourceInstances.push(tracked);

        console.log(`📡 [Instance #${instanceId}] EventSource CREATED:`, {
            url: args[0].substring(0, 50) + '...',
            timestamp: tracked.createdAt
        });

        // Track state changes
        const originalClose = instance.close.bind(instance);
        instance.close = function() {
            tracked.closedAt = new Date().toISOString();
            tracked.readyState = 'CLOSED';
            console.log(`🔌 [Instance #${instanceId}] EventSource CLOSED:`, {
                lifespan: (new Date(tracked.closedAt) - new Date(tracked.createdAt)) + 'ms'
            });
            return originalClose();
        };

        return instance;
    };

    // Copy static properties
    window.EventSource.CONNECTING = OriginalEventSource.CONNECTING;
    window.EventSource.OPEN = OriginalEventSource.OPEN;
    window.EventSource.CLOSED = OriginalEventSource.CLOSED;

    console.log('✅ EventSource tracking enabled\n');

    // Monitor JobProgressStream lifecycle
    if (window.JobProgressStream) {
        const OriginalJobProgressStream = window.JobProgressStream;

        window.JobProgressStream = class extends OriginalJobProgressStream {
            constructor(...args) {
                super(...args);
                console.log(`🎯 [${this.jobId}] JobProgressStream CONSTRUCTED`);
            }

            connect() {
                console.log(`🔗 [${this.jobId}] connect() called:`, {
                    isDestroyed: this.isDestroyed,
                    jobCompleted: this.jobCompleted,
                    isConnected: this.isConnected,
                    hasPendingReconnect: !!this.reconnectTimeout
                });
                return super.connect();
            }

            handleCompleteEvent(event) {
                console.log(`✅ [${this.jobId}] handleCompleteEvent() START:`, {
                    jobCompleted_before: this.jobCompleted,
                    hasPendingReconnect: !!this.reconnectTimeout
                });
                const result = super.handleCompleteEvent(event);
                console.log(`✅ [${this.jobId}] handleCompleteEvent() END:`, {
                    jobCompleted_after: this.jobCompleted,
                    hasPendingReconnect: !!this.reconnectTimeout
                });
                return result;
            }

            clearReconnectTimeout() {
                if (this.reconnectTimeout) {
                    console.log(`🛑 [${this.jobId}] clearReconnectTimeout() - Cancelling timeout ID:`, this.reconnectTimeout);
                } else {
                    console.log(`⚪ [${this.jobId}] clearReconnectTimeout() - No timeout to cancel`);
                }
                return super.clearReconnectTimeout();
            }

            handleConnectionError() {
                console.log(`❌ [${this.jobId}] handleConnectionError() called:`, {
                    isDestroyed: this.isDestroyed,
                    jobCompleted: this.jobCompleted,
                    reconnectAttempts: this.reconnectAttempts,
                    willScheduleReconnect: !this.isDestroyed && !this.jobCompleted && this.reconnectAttempts < this.maxReconnectAttempts
                });
                return super.handleConnectionError();
            }

            close() {
                console.log(`🔌 [${this.jobId}] close() called:`, {
                    isDestroyed_before: this.isDestroyed,
                    hasPendingReconnect: !!this.reconnectTimeout
                });
                const result = super.close();
                console.log(`🔌 [${this.jobId}] close() completed:`, {
                    isDestroyed_after: this.isDestroyed,
                    hasPendingReconnect: !!this.reconnectTimeout
                });
                return result;
            }
        };

        console.log('✅ JobProgressStream monitoring enabled\n');
    }

    // Test scenario simulation
    console.log('📋 Test Instructions:');
    console.log('1. Submit a form to trigger SSE connection');
    console.log('2. Watch for the completion event');
    console.log('3. Observe if new connections are created after completion');
    console.log('4. Check for "connect() called" logs with jobCompleted=true');
    console.log('\n5. Run getTestReport() to see summary\n');

    // Report function
    window.getTestReport = function() {
        console.log('\n📊 SSE RECONNECTION DIAGNOSTIC REPORT');
        console.log('=====================================\n');

        console.log(`Total EventSource instances created: ${eventSourceInstances.length}`);

        const activeInstances = eventSourceInstances.filter(i => !i.closedAt);
        console.log(`Currently active instances: ${activeInstances.length}`);

        if (activeInstances.length > 1) {
            console.error('⚠️ WARNING: Multiple EventSource instances are active!');
            console.table(activeInstances.map(i => ({
                ID: i.id,
                Created: i.createdAt,
                URL: i.url.substring(0, 40) + '...'
            })));
        }

        console.log('\n📜 Full instance history:');
        console.table(eventSourceInstances.map(i => ({
            ID: i.id,
            Created: i.createdAt,
            Closed: i.closedAt || 'STILL OPEN',
            Lifespan: i.closedAt ? (new Date(i.closedAt) - new Date(i.createdAt)) + 'ms' : 'N/A'
        })));

        // Check SSE manager state
        if (window.sseManager) {
            console.log('\n🗂️ SSE Manager State:');
            console.log(window.sseManager.getStatus());
        }

        // Check for race condition indicators
        console.log('\n🔍 Race Condition Indicators:');
        console.log('Look for these patterns in the logs above:');
        console.log('  ❌ "connect() called" AFTER "handleCompleteEvent()"');
        console.log('  ❌ "jobCompleted: true" but connection attempt still made');
        console.log('  ❌ Multiple EventSource instances created for same job');
        console.log('  ❌ "hasPendingReconnect: true" during handleCompleteEvent()');
    };

    console.log('✅ Diagnostic test ready. Submit a form and monitor the output.\n');
})();
