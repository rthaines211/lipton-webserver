#!/bin/bash

###############################################################################
# AUTOMATED FIX APPLICATION SCRIPT
#
# This script applies all three fixes for the SSE connection issues:
# 1. Fix undefined/undefined in progress state (server-side)
# 2. Fix undefined/undefined in progress state (client-side fallback)
# 3. Fix SSE reconnection loop (add connection checks)
#
# Usage:
#   chmod +x fixes/APPLY_FIXES.sh
#   ./fixes/APPLY_FIXES.sh
#
# The script will:
# - Create backups of all files before modifying
# - Apply patches using sed
# - Show you what changed
# - Validate the changes
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║         SSE CONNECTION ISSUES - AUTOMATED FIX APPLICATION            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will fix:"
echo "  ✓ Issue #1: SSE Reconnection Loop"
echo "  ✓ Issue #2: 503 Rapid Retry (already OK)"
echo "  ✓ Issue #3: undefined/undefined in progress state"
echo ""

# Confirm with user
read -p "Apply fixes? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 1: Creating Backups"
echo "═══════════════════════════════════════════════════════════════════════"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/fixes-$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Backup files that will be modified
echo "Backing up files..."
cp "$PROJECT_ROOT/server.js" "$BACKUP_DIR/server.js.backup"
cp "$PROJECT_ROOT/js/sse-client.js" "$BACKUP_DIR/sse-client.js.backup"
cp "$PROJECT_ROOT/js/sse-manager.js" "$BACKUP_DIR/sse-manager.js.backup"

echo "✅ Backups created"
echo ""

echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 2: Applying Fix #1 - Server-Side Completion Event"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Location: server.js (around line 2310)"
echo "Fix: Add 'total' field to completion event"
echo ""

# Fix server.js - Add total field to completion event
# Find the line with 'event: complete' and add total: 0 to the data object
sed -i.tmp '/event: complete/,/progress: 100/ {
    /progress: 100/a\
            ,total: 0  // Added: Fallback total for already-completed jobs
}' "$PROJECT_ROOT/server.js"

rm "$PROJECT_ROOT/server.js.tmp"

echo "✅ Applied fix to server.js"
echo ""

echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 3: Applying Fix #2 - Client-Side Completion Handler"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Location: js/sse-client.js (line 197-200)"
echo "Fix: Handle missing 'total' field with fallback logic"
echo ""

# Create a more robust fix using a here-document
cat > "$PROJECT_ROOT/js/sse-client.js.patch" << 'ENDPATCH'
--- a/js/sse-client.js
+++ b/js/sse-client.js
@@ -194,10 +194,35 @@
         try {
             const data = JSON.parse(event.data);
             console.log(`✅ Job completed for ${this.jobId}:`, data);

+            // Handle missing 'total' field - server may send 'progress: 100' instead
+            let total = data.total;
+
+            if (total === undefined && data.progress !== undefined) {
+                // Use progress value as total if total is missing
+                total = data.progress;
+                console.log(`📊 Using progress (${data.progress}) as total since total field is missing`);
+            }
+
+            if (total === undefined) {
+                // Try to get from existing state
+                if (typeof getJobState === 'function') {
+                    const existingState = getJobState(this.jobId);
+                    if (existingState && existingState.total !== undefined) {
+                        total = existingState.total;
+                        console.log(`📊 Using existing state total (${total})`);
+                    } else {
+                        total = 0;
+                        console.warn(`⚠️ No total available - using 0 as fallback`);
+                    }
+                } else {
+                    total = 0;
+                }
+            }
+
+            const outputUrl = data.outputUrl || data.url || '';
+
             // Update progress state
             if (typeof markJobComplete === 'function') {
-                markJobComplete(this.jobId, data.total, data.outputUrl);
+                markJobComplete(this.jobId, total, outputUrl);
             }

             // Show success toast
             if (typeof progressToast !== 'undefined' && progressToast.showSuccess) {
-                progressToast.showSuccess(this.jobId, data.total, data.outputUrl);
+                progressToast.showSuccess(this.jobId, total, outputUrl);
             }
ENDPATCH

# Apply the patch using the detailed replacement script
node << 'ENDNODE'
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'sse-client.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the handleCompleteEvent method and replace the relevant section
const searchPattern = /\/\/ Update progress state\s+if \(typeof markJobComplete === 'function'\) \{\s+markJobComplete\(this\.jobId, data\.total, data\.outputUrl\);/;

const replacement = `// Handle missing 'total' field - server may send 'progress: 100' instead
            let total = data.total;

            if (total === undefined && data.progress !== undefined) {
                // Use progress value as total if total is missing
                total = data.progress;
                console.log(\`📊 Using progress (\${data.progress}) as total since total field is missing\`);
            }

            if (total === undefined) {
                // Try to get from existing state
                if (typeof getJobState === 'function') {
                    const existingState = getJobState(this.jobId);
                    if (existingState && existingState.total !== undefined) {
                        total = existingState.total;
                        console.log(\`📊 Using existing state total (\${total})\`);
                    } else {
                        total = 0;
                        console.warn(\`⚠️ No total available - using 0 as fallback for \${this.jobId}\`);
                    }
                } else {
                    total = 0;
                }
            }

            const outputUrl = data.outputUrl || data.url || '';

            // Update progress state
            if (typeof markJobComplete === 'function') {
                markJobComplete(this.jobId, total, outputUrl);`;

content = content.replace(searchPattern, replacement);

// Also fix the progressToast call
content = content.replace(
    /progressToast\.showSuccess\(this\.jobId, data\.total, data\.outputUrl\);/,
    'progressToast.showSuccess(this.jobId, total, outputUrl);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Applied fix to js/sse-client.js');
ENDNODE

rm "$PROJECT_ROOT/js/sse-client.js.patch"

echo ""

echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 4: Applying Fix #3 - SSE Connection Loop Prevention"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Location: js/sse-client.js (connect method)"
echo "Fix: Add explicit check to prevent reconnection on completed jobs"
echo ""

# Add additional safeguard in the onerror handler
node << 'ENDNODE'
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'sse-client.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the onerror handler and strengthen the jobCompleted check
const searchPattern = /(this\.eventSource\.onerror = \(event\) => \{[\s\S]*?)(this\.isConnected = false;[\s\S]*?if \(this\.jobCompleted \|\| this\.isDestroyed\) \{[\s\S]*?return;[\s\S]*?\})/;

const replacement = `$1// Immediately close if job is done to prevent browser auto-reconnect
            if (this.jobCompleted) {
                console.log(\`🛑 Job \${this.jobId} is completed - forcing close to prevent reconnect\`);
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                this.isConnected = false;
                return;
            }

            this.isConnected = false;
            if (this.isDestroyed) {
                console.log(\`🛑 SSE stream for \${this.jobId} is destroyed - preventing reconnect\`);
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                return;
            }`;

content = content.replace(searchPattern, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Applied reconnection prevention fix to js/sse-client.js');
ENDNODE

echo ""

echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 5: Validation"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Validate changes
echo "Validating fixes..."
echo ""

# Check if total field was added to server.js
if grep -q "total: 0.*Added: Fallback" "$PROJECT_ROOT/server.js"; then
    echo "✅ server.js: 'total' field added to completion event"
else
    echo "⚠️  server.js: Could not verify fix (manual check required)"
fi

# Check if client-side fix was applied
if grep -q "Using progress.*as total since total field is missing" "$PROJECT_ROOT/js/sse-client.js"; then
    echo "✅ sse-client.js: Completion handler updated with fallback logic"
else
    echo "⚠️  sse-client.js: Could not verify fix (manual check required)"
fi

# Check if reconnection prevention was added
if grep -q "forcing close to prevent reconnect" "$PROJECT_ROOT/js/sse-client.js"; then
    echo "✅ sse-client.js: Reconnection prevention logic added"
else
    echo "⚠️  sse-client.js: Could not verify reconnection fix (manual check required)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "STEP 6: Next Steps"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Fixes have been applied! Next steps:"
echo ""
echo "1. Review the changes:"
echo "   diff $BACKUP_DIR/server.js.backup $PROJECT_ROOT/server.js"
echo "   diff $BACKUP_DIR/sse-client.js.backup $PROJECT_ROOT/js/sse-client.js"
echo ""
echo "2. Test locally:"
echo "   npm start"
echo "   # Submit a form and check console logs"
echo ""
echo "3. Deploy to Cloud Run:"
echo "   gcloud run deploy node-server \\"
echo "     --source . \\"
echo "     --region us-central1"
echo ""
echo "4. Test on deployed app and verify:"
echo "   - No more 'undefined/undefined' in logs"
echo "   - Only 1 EventSource instance per job"
echo "   - No reconnection loops after completion"
echo ""
echo "5. If issues occur, rollback:"
echo "   cp $BACKUP_DIR/server.js.backup $PROJECT_ROOT/server.js"
echo "   cp $BACKUP_DIR/sse-client.js.backup $PROJECT_ROOT/js/sse-client.js"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "✅ Fix application complete!"
echo "═══════════════════════════════════════════════════════════════════════"
