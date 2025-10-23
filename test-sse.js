#!/usr/bin/env node

/**
 * SSE Test Script to Reproduce the Error
 */

const { EventSource } = require('eventsource');

const sseUrl = 'https://node-server-zyiwmzwenq-uc.a.run.app/api/jobs/test-123/stream';

console.log('🔌 Connecting to SSE endpoint:', sseUrl);

const eventSource = new EventSource(sseUrl);

eventSource.onopen = () => {
    console.log('✅ SSE connection opened');
};

eventSource.onmessage = (event) => {
    console.log('📨 Message received:', event.data);
};

eventSource.addEventListener('progress', (event) => {
    console.log('📊 Progress event:', event.data);
});

eventSource.addEventListener('complete', (event) => {
    console.log('✅ Complete event:', event.data);
});

eventSource.addEventListener('error', (event) => {
    console.log('❌ Error event received');
    console.log('  Event type:', event.type);
    console.log('  Event data:', event.data);
    console.log('  Data type:', typeof event.data);

    if (event.data === undefined) {
        console.log('  ⚠️  WARNING: event.data is undefined!');
    }

    try {
        const parsed = JSON.parse(event.data);
        console.log('  Parsed data:', parsed);
    } catch (e) {
        console.log('  Failed to parse:', e.message);
    }
});

eventSource.onerror = (error) => {
    console.error('🔴 Connection error:', error);
    if (error.status) {
        console.log('  Status:', error.status);
    }
};

// Keep script running
setTimeout(() => {
    console.log('Closing connection...');
    eventSource.close();
    process.exit(0);
}, 30000);