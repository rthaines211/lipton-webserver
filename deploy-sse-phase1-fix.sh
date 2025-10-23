#!/bin/bash

################################################################################
# SSE Reconnection Fix - Phase 1 Deployment Script
################################################################################
# This script implements server-side fixes to prevent SSE reconnection loops
# after job completion.
#
# Issues Fixed:
# - Race condition between interval polling and connection close
# - Multiple "complete" events sent causing client reconnections
# - Timing issues with interval cleanup
#
# Changes:
# Phase 1A: Immediate interval cleanup when job completes
# Phase 1B: Connection state tracking to prevent duplicate complete events
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/ryanhaines/Desktop/Lipton Webserver"
SERVER_FILE="${PROJECT_DIR}/server.js"
BACKUP_DIR="${PROJECT_DIR}/backups"
BACKUP_FILE="${BACKUP_DIR}/server.js.backup-$(date +%Y%m%d-%H%M%S)"
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SSE Reconnection Fix - Phase 1 Deployment                 ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Phase 0: Pre-deployment Checks
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 0: Pre-deployment Checks${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1️⃣  Verifying server.js exists..."
if [ ! -f "$SERVER_FILE" ]; then
    echo -e "${RED}❌ Error: server.js not found at $SERVER_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ server.js found${NC}"
echo ""

echo "2️⃣  Creating backup directory..."
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}   ✅ Backup directory ready: $BACKUP_DIR${NC}"
echo ""

echo "3️⃣  Creating backup of current server.js..."
cp "$SERVER_FILE" "$BACKUP_FILE"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Backup created: $BACKUP_FILE${NC}"
echo ""

echo "4️⃣  Checking for SSE endpoint in server.js..."
if ! grep -q "app.get('/api/jobs/:jobId/stream'" "$SERVER_FILE"; then
    echo -e "${RED}❌ Error: SSE endpoint not found in server.js${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ SSE endpoint found${NC}"
echo ""

################################################################################
# Phase 1: Apply Code Fixes
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 1: Applying Code Fixes${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "5️⃣  Applying Phase 1A & 1B fixes..."
echo "   - Adding connection state tracking"
echo "   - Implementing immediate interval cleanup"
echo "   - Reducing close delay from 1000ms to 500ms"
echo ""

# Create a Python script to apply the fixes
cat > /tmp/apply_sse_fix.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import re
import sys

def apply_sse_fixes(content):
    """Apply Phase 1A and 1B fixes to the SSE endpoint"""

    # Find the SSE endpoint function
    pattern = r"(app\.get\('/api/jobs/:jobId/stream', \(req, res\) => \{[\s\S]*?)(const sendProgress = \(\) => \{[\s\S]*?\};\n)"

    match = re.search(pattern, content)
    if not match:
        print("ERROR: Could not find SSE endpoint pattern", file=sys.stderr)
        return None

    # Extract the endpoint start and sendProgress function
    endpoint_start = match.group(1)
    send_progress_func = match.group(2)

    # Check if we've already added the completeSent variable
    if 'let completeSent = false;' in endpoint_start:
        print("INFO: Fix already applied - completeSent variable exists", file=sys.stderr)
        return None

    # Add completeSent tracking variable after jobId extraction
    endpoint_start_fixed = endpoint_start.replace(
        'const { jobId } = req.params;',
        '''const { jobId } = req.params;

    // ============================================================
    // PHASE 1B: Connection State Tracking
    // ============================================================
    // Track whether a complete/error event has already been sent
    // This prevents duplicate completion messages and reconnection loops
    let completeSent = false;'''
    )

    # Fix the sendProgress function
    send_progress_fixed = re.sub(
        r'(const sendProgress = \(\) => \{)',
        r'''\1
        // PHASE 1B: Skip if complete event already sent
        if (completeSent) {
            return;
        }
''',
        send_progress_func
    )

    # Fix the completion block - add immediate interval cleanup
    send_progress_fixed = re.sub(
        r'// If complete or failed, close the connection after sending\s*if \(status\.status === \'success\' \|\| status\.status === \'failed\'\) \{\s*setTimeout\(\(\) => \{\s*res\.end\(\);\s*\}, 1000\);\s*\}',
        '''// ============================================================
            // PHASE 1A: Immediate Interval Cleanup
            // ============================================================
            // If complete or failed, immediately clear intervals to prevent
            // race condition where interval fires again before connection closes
            if (status.status === 'success' || status.status === 'failed') {
                completeSent = true;  // Mark complete as sent

                // Clear intervals IMMEDIATELY (before scheduling close)
                clearInterval(interval);
                clearInterval(heartbeat);

                // Close connection after brief delay to allow client to receive message
                // Reduced from 1000ms to 500ms to minimize reconnection window
                setTimeout(() => {
                    if (!res.writableEnded) {
                        res.end();
                    }
                }, 500);
            }''',
        send_progress_fixed
    )

    # Reconstruct the content with fixes
    fixed_content = content.replace(
        match.group(0),
        endpoint_start_fixed + send_progress_fixed
    )

    return fixed_content

# Read the file
try:
    with open(sys.argv[1], 'r') as f:
        content = f.read()
except Exception as e:
    print(f"ERROR: Failed to read file: {e}", file=sys.stderr)
    sys.exit(1)

# Apply fixes
fixed_content = apply_sse_fixes(content)

if fixed_content is None:
    print("ERROR: Failed to apply fixes", file=sys.stderr)
    sys.exit(1)

# Write the fixed content
try:
    with open(sys.argv[1], 'w') as f:
        f.write(fixed_content)
    print("SUCCESS: Fixes applied", file=sys.stderr)
except Exception as e:
    print(f"ERROR: Failed to write file: {e}", file=sys.stderr)
    sys.exit(1)

PYTHON_SCRIPT

chmod +x /tmp/apply_sse_fix.py

# Apply the fix
if python3 /tmp/apply_sse_fix.py "$SERVER_FILE" 2>&1 | grep -q "SUCCESS"; then
    echo -e "${GREEN}   ✅ Phase 1A & 1B fixes applied successfully${NC}"
else
    ERROR_MSG=$(python3 /tmp/apply_sse_fix.py "$SERVER_FILE" 2>&1)
    if echo "$ERROR_MSG" | grep -q "already applied"; then
        echo -e "${YELLOW}   ⚠️  Fixes already applied previously${NC}"
    else
        echo -e "${RED}   ❌ Failed to apply fixes${NC}"
        echo "$ERROR_MSG"
        echo ""
        echo -e "${YELLOW}   Restoring from backup...${NC}"
        cp "$BACKUP_FILE" "$SERVER_FILE"
        echo -e "${GREEN}   ✅ Backup restored${NC}"
        exit 1
    fi
fi
echo ""

echo "6️⃣  Verifying fixes were applied..."
if grep -q "let completeSent = false;" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ Phase 1B: Connection state tracking added${NC}"
else
    echo -e "${RED}   ❌ Phase 1B verification failed${NC}"
    exit 1
fi

if grep -q "completeSent = true;" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ Phase 1A: Immediate interval cleanup added${NC}"
else
    echo -e "${RED}   ❌ Phase 1A verification failed${NC}"
    exit 1
fi

if grep -q ", 500);" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ Close delay reduced to 500ms${NC}"
else
    echo -e "${YELLOW}   ⚠️  Close delay not updated (may already be different)${NC}"
fi
echo ""

################################################################################
# Phase 2: Show Changes
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 2: Review Changes${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "7️⃣  Displaying changes made to server.js..."
echo ""
echo -e "${BLUE}--- Changes Summary ---${NC}"
echo ""

# Show the relevant section with grep context
echo -e "${GREEN}Added at the beginning of SSE endpoint:${NC}"
grep -A 5 "let completeSent = false;" "$SERVER_FILE" || echo "Could not display"
echo ""

echo -e "${GREEN}Modified sendProgress function:${NC}"
grep -A 3 "if (completeSent)" "$SERVER_FILE" | head -4 || echo "Could not display"
echo ""

echo -e "${GREEN}Modified completion handling:${NC}"
grep -A 8 "completeSent = true;" "$SERVER_FILE" | head -12 || echo "Could not display"
echo ""

################################################################################
# Phase 3: Build and Deploy
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 3: Build and Deploy${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Deploy to Cloud Run? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled by user${NC}"
    echo ""
    echo "To deploy manually later, run:"
    echo -e "${BLUE}  cd \"${PROJECT_DIR}\"${NC}"
    echo -e "${BLUE}  gcloud run deploy ${SERVICE_NAME} --source . --region=${REGION}${NC}"
    echo ""
    echo "Backup saved at: $BACKUP_FILE"
    exit 0
fi

echo ""
echo "8️⃣  Building and deploying to Cloud Run..."
echo ""

cd "$PROJECT_DIR"

# Deploy to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --region="$REGION" \
    --quiet

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo ""
    echo -e "${YELLOW}Rolling back changes...${NC}"
    cp "$BACKUP_FILE" "$SERVER_FILE"
    echo -e "${GREEN}✅ Code rolled back to previous version${NC}"
    echo ""
    echo "To retry deployment:"
    echo -e "${BLUE}  ./deploy-sse-phase1-fix.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment completed successfully${NC}"
echo ""

################################################################################
# Phase 4: Post-deployment Verification
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 4: Post-deployment Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "9️⃣  Waiting for new revision to become active..."
sleep 10

LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.latestReadyRevisionName)')

echo -e "${GREEN}   ✅ Latest revision: ${LATEST_REVISION}${NC}"
echo ""

################################################################################
# Phase 5: Deployment Summary
################################################################################

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Phase 1 Deployment Completed Successfully             ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 Summary of Changes:"
echo ""
echo "   Phase 1A - Immediate Interval Cleanup:"
echo "     ✅ Intervals now clear BEFORE connection closes"
echo "     ✅ Close delay reduced from 1000ms to 500ms"
echo ""
echo "   Phase 1B - Connection State Tracking:"
echo "     ✅ Added 'completeSent' flag to prevent duplicate events"
echo "     ✅ sendProgress() returns early if complete already sent"
echo ""
echo "📁 Backup Information:"
echo "   Original file backed up to:"
echo "   ${BACKUP_FILE}"
echo ""
echo "🚀 Cloud Run Information:"
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"
echo "   Latest Revision: ${LATEST_REVISION}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "   1. Run the validation script to test the fix:"
echo -e "      ${BLUE}./validate-sse-phase1-fix.sh${NC}"
echo ""
echo "   2. Submit a test form and verify in browser console:"
echo "      • Should see only ONE 'Job completed' message"
echo "      • Should NOT see repeated SSE reconnections"
echo "      • Should NOT see 'SSE error but job is completed' messages"
echo ""
echo "   3. If issues persist, you can:"
echo "      • Roll back: cp \"$BACKUP_FILE\" \"$SERVER_FILE\""
echo "      • Then redeploy: gcloud run deploy $SERVICE_NAME --source . --region=$REGION"
echo ""
echo -e "${GREEN}✨ Server-side SSE reconnection fixes deployed!${NC}"
echo ""

# Clean up temp files
rm -f /tmp/apply_sse_fix.py
