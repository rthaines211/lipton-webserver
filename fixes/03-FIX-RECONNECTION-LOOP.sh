#!/bin/bash

###############################################################################
# FIX #3: Prevent SSE reconnection loop after job completion
#
# PROBLEM: Multiple EventSource instances stay open after completion
# LOCATION: js/sse-client.js, onerror handler (line ~130-145)
# SOLUTION: Strengthen jobCompleted check and force close immediately
###############################################################################

echo "🔧 Fixing SSE reconnection loop..."
echo ""

# Backup first
cp js/sse-client.js js/sse-client.js.backup-reconnect-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created"

echo ""
echo "📝 This fix prevents new connections after job completion"
echo ""
echo "LOCATION: js/sse-client.js, onerror handler (line ~130)"
echo ""

cat << 'EOF' > /tmp/sse-onerror-fix.txt
        // Handle connection errors
        this.eventSource.onerror = (event) => {
            // STRENGTHENED: Immediately close if job is done to prevent browser auto-reconnect
            if (this.jobCompleted) {
                console.log(`🛑 Job ${this.jobId} is completed - forcing close to prevent reconnect`);
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                this.isConnected = false;
                return;
            }

            // Check if destroyed
            if (this.isDestroyed) {
                console.log(`SSE error for ${this.jobId} but stream is destroyed, forcing close`);
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                this.isConnected = false;
                return;
            }

            console.error(`SSE connection error for ${this.jobId}:`, event);
            this.handleConnectionError();
        };
EOF

echo "📄 Fixed onerror handler saved to: /tmp/sse-onerror-fix.txt"
echo ""
echo "📋 MANUAL STEPS:"
echo "1. Open js/sse-client.js in your editor"
echo "2. Find the onerror handler (around line 130):"
echo "   this.eventSource.onerror = (event) => {"
echo ""
echo "3. Replace the ENTIRE onerror function with the code from:"
echo "   /tmp/sse-onerror-fix.txt"
echo ""
echo "Key changes:"
echo "  - jobCompleted check FIRST (before other checks)"
echo "  - Explicitly close EventSource and set to null"
echo "  - Force return to prevent handleConnectionError"
echo ""

echo "View the fix:"
cat /tmp/sse-onerror-fix.txt

echo ""
echo "─────────────────────────────────────"
echo "✅ Fix code prepared!"
echo "   Apply it manually by copying from /tmp/sse-onerror-fix.txt"
