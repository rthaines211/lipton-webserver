#!/bin/bash

###############################################################################
# FIX #2: Handle missing 'total' field in client completion handler
#
# PROBLEM: Client expects data.total but server sends data.progress
# LOCATION: js/sse-client.js, line 197-200
# SOLUTION: Add fallback logic to extract total from progress or state
###############################################################################

echo "🔧 Fixing js/sse-client.js completion handler..."
echo ""

# Backup first
cp js/sse-client.js js/sse-client.js.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created"

echo ""
echo "📝 This fix adds fallback logic to handle missing 'total' field"
echo ""
echo "LOCATION: js/sse-client.js, handleCompleteEvent method (line ~197)"
echo ""
echo "CHANGE: Replace lines 197-200 with enhanced version"
echo ""

cat << 'EOF' > /tmp/sse-client-fix.txt
            // Handle missing 'total' field - server may send 'progress: 100' instead
            let total = data.total;

            if (total === undefined && data.progress !== undefined) {
                // Use progress value as total if total is missing
                total = data.progress;
                console.log(`📊 Using progress (${data.progress}) as total since total field is missing`);
            }

            if (total === undefined) {
                // Try to get from existing state
                if (typeof getJobState === 'function') {
                    const existingState = getJobState(this.jobId);
                    if (existingState && existingState.total !== undefined) {
                        total = existingState.total;
                        console.log(`📊 Using existing state total (${total})`);
                    } else {
                        total = 0;
                        console.warn(`⚠️ No total available - using 0 as fallback for ${this.jobId}`);
                    }
                } else {
                    total = 0;
                }
            }

            const outputUrl = data.outputUrl || data.url || '';

            // Update progress state
            if (typeof markJobComplete === 'function') {
                markJobComplete(this.jobId, total, outputUrl);
            }

            // Show success toast
            if (typeof progressToast !== 'undefined' && progressToast.showSuccess) {
                progressToast.showSuccess(this.jobId, total, outputUrl);
            }
EOF

echo "📄 New code saved to: /tmp/sse-client-fix.txt"
echo ""
echo "📋 MANUAL STEPS:"
echo "1. Open js/sse-client.js in your editor"
echo "2. Find the handleCompleteEvent method (around line 187)"
echo "3. Find these lines:"
echo "   // Update progress state"
echo "   if (typeof markJobComplete === 'function') {"
echo "       markJobComplete(this.jobId, data.total, data.outputUrl);"
echo "   }"
echo ""
echo "4. Replace with the code from /tmp/sse-client-fix.txt"
echo ""
echo "5. Also change line ~204 from:"
echo "   progressToast.showSuccess(this.jobId, data.total, data.outputUrl);"
echo "   to:"
echo "   progressToast.showSuccess(this.jobId, total, outputUrl);"
echo ""

echo "Or view the complete replacement:"
cat /tmp/sse-client-fix.txt

echo ""
echo "─────────────────────────────────────"
echo "✅ Fix code prepared!"
echo "   Apply it manually by copying from /tmp/sse-client-fix.txt"
