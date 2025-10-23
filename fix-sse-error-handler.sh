#!/bin/bash

################################################################################
# SSE Error Handler Fix Deployment Script
################################################################################
# This script fixes the "Cannot set headers after they are sent" error that
# crashes SSE connections mid-stream.
#
# Root Cause:
# - Express error handler tries to send JSON response during SSE streaming
# - SSE already sent headers with res.writeHead()
# - Error handler attempts res.status().json() → tries to set headers again
# - Result: ERR_HTTP_HEADERS_SENT crash → 503 error → reconnection loop
#
# Solution:
# - Check if headers already sent before attempting error response
# - For streaming responses (SSE), skip JSON response and close gracefully
# - For normal requests, send JSON error response as usual
################################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/Users/ryanhaines/Desktop/Lipton Webserver"
SERVER_FILE="${PROJECT_DIR}/server.js"
BACKUP_DIR="${PROJECT_DIR}/backups"
BACKUP_FILE="${BACKUP_DIR}/server.js.backup-sse-fix-$(date +%Y%m%d-%H%M%S)"
PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SSE Error Handler Fix Deployment                          ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

################################################################################
# Phase 1: Pre-deployment Checks
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 1: Pre-deployment Checks${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "1️⃣  Verifying server.js exists..."
if [ ! -f "$SERVER_FILE" ]; then
    echo -e "${RED}❌ Error: server.js not found at $SERVER_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ server.js found${NC}"
echo ""

echo "2️⃣  Creating backup..."
mkdir -p "$BACKUP_DIR"
cp "$SERVER_FILE" "$BACKUP_FILE"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Backup created: $BACKUP_FILE${NC}"
echo ""

echo "3️⃣  Checking for error handler in server.js..."
if ! grep -q "app.use((error, req, res, next)" "$SERVER_FILE"; then
    echo -e "${RED}❌ Error: Error handler not found in server.js${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Error handler found${NC}"
echo ""

################################################################################
# Phase 2: Apply Fix
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 2: Applying SSE Error Handler Fix${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "4️⃣  Applying fix to error handler..."
echo ""

# Create a Python script to apply the fix
cat > /tmp/fix_sse_error_handler.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import re
import sys

def fix_error_handler(content):
    """Fix the Express error handler to handle SSE streaming responses"""

    # Find the error handler
    pattern = r"(// Error handler\n)(app\.use\(\(error, req, res, next\) => \{\n    // Error already logged by errorLoggingMiddleware\n    res\.status\(error\.statusCode \|\| error\.status \|\| 500\)\.json\(\{)"

    match = re.search(pattern, content)
    if not match:
        print("ERROR: Could not find error handler pattern", file=sys.stderr)
        return None

    # Check if fix already applied
    if 'res.headersSent' in content:
        print("INFO: Fix already applied - headersSent check exists", file=sys.stderr)
        return None

    # Replace with fixed version
    fixed_error_handler = r"""\1app.use((error, req, res, next) => {
    // Error already logged by errorLoggingMiddleware

    // ============================================================
    // SSE/STREAMING RESPONSE FIX
    // ============================================================
    // Check if headers were already sent (indicates SSE or streaming response)
    // If headers are already sent, we can't send a JSON error response
    // because that would try to set headers again, causing ERR_HTTP_HEADERS_SENT
    if (res.headersSent) {
        // Headers already sent - this is a streaming response (like SSE)
        // Log the error but don't try to send a response
        console.error('Error in streaming response:', error.message);
        console.error('Stack:', error.stack);

        // Let Express clean up the connection
        return next(error);
    }

    // Headers not yet sent - send normal JSON error response
    res.status(error.statusCode || error.status || 500).json({"""

    fixed_content = re.sub(pattern, fixed_error_handler, content)

    if fixed_content == content:
        print("ERROR: Fix was not applied", file=sys.stderr)
        return None

    return fixed_content

# Read the file
try:
    with open(sys.argv[1], 'r') as f:
        content = f.read()
except Exception as e:
    print(f"ERROR: Failed to read file: {e}", file=sys.stderr)
    sys.exit(1)

# Apply fix
fixed_content = fix_error_handler(content)

if fixed_content is None:
    print("ERROR: Failed to apply fix", file=sys.stderr)
    sys.exit(1)

# Write the fixed content
try:
    with open(sys.argv[1], 'w') as f:
        f.write(fixed_content)
    print("SUCCESS: Fix applied", file=sys.stderr)
except Exception as e:
    print(f"ERROR: Failed to write file: {e}", file=sys.stderr)
    sys.exit(1)

PYTHON_SCRIPT

chmod +x /tmp/fix_sse_error_handler.py

# Apply the fix
if python3 /tmp/fix_sse_error_handler.py "$SERVER_FILE" 2>&1 | grep -q "SUCCESS"; then
    echo -e "${GREEN}   ✅ SSE error handler fix applied successfully${NC}"
else
    ERROR_MSG=$(python3 /tmp/fix_sse_error_handler.py "$SERVER_FILE" 2>&1)
    if echo "$ERROR_MSG" | grep -q "already applied"; then
        echo -e "${YELLOW}   ⚠️  Fix already applied previously${NC}"
    else
        echo -e "${RED}   ❌ Failed to apply fix${NC}"
        echo "$ERROR_MSG"
        echo ""
        echo -e "${YELLOW}   Restoring from backup...${NC}"
        cp "$BACKUP_FILE" "$SERVER_FILE"
        echo -e "${GREEN}   ✅ Backup restored${NC}"
        exit 1
    fi
fi
echo ""

echo "5️⃣  Verifying fix was applied..."
if grep -q "res.headersSent" "$SERVER_FILE"; then
    echo -e "${GREEN}   ✅ headersSent check found in error handler${NC}"
else
    echo -e "${RED}   ❌ Verification failed - fix not applied${NC}"
    cp "$BACKUP_FILE" "$SERVER_FILE"
    exit 1
fi
echo ""

################################################################################
# Phase 3: Show Changes
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 3: Review Changes${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "6️⃣  Displaying changes made to error handler..."
echo ""
echo -e "${BLUE}--- Error Handler Fix ---${NC}"
echo ""
grep -A 15 "res.headersSent" "$SERVER_FILE" | head -18 || echo "Could not display"
echo ""

################################################################################
# Phase 4: Build and Deploy
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 4: Build and Deploy${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Deploy to Cloud Run? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled by user${NC}"
    echo ""
    echo "Changes have been applied locally but not deployed."
    echo "To deploy later, run:"
    echo -e "${BLUE}  cd \"${PROJECT_DIR}\"${NC}"
    echo -e "${BLUE}  gcloud run deploy ${SERVICE_NAME} --source . --region=${REGION}${NC}"
    echo ""
    echo "Backup saved at: $BACKUP_FILE"
    exit 0
fi

echo ""
echo "7️⃣  Building and deploying to Cloud Run..."
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
    echo -e "${BLUE}  ./fix-sse-error-handler.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment completed successfully${NC}"
echo ""

################################################################################
# Phase 5: Post-deployment Verification
################################################################################

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Phase 5: Post-deployment Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "8️⃣  Waiting for new revision to become active..."
sleep 10

LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.latestReadyRevisionName)')

echo -e "${GREEN}   ✅ Latest revision: ${LATEST_REVISION}${NC}"
echo ""

################################################################################
# Phase 6: Summary
################################################################################

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ SSE Error Handler Fix Deployed                        ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo ""

echo "📊 What Was Fixed:"
echo ""
echo "   Before:"
echo "     ❌ SSE connections crashed mid-stream with ERR_HTTP_HEADERS_SENT"
echo "     ❌ 503 Service Unavailable errors during document generation"
echo "     ❌ Multiple 'Job completed' reconnection loops"
echo ""
echo "   After:"
echo "     ✅ Error handler checks if headers already sent"
echo "     ✅ Streaming responses (SSE) handle errors gracefully"
echo "     ✅ No more header conflicts during SSE streaming"
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
echo -e "${YELLOW}📋 Testing Instructions:${NC}"
echo ""
echo "   1. Open your browser to:"
echo -e "      ${CYAN}https://node-server-zyiwmzwenq-uc.a.run.app${NC}"
echo ""
echo "   2. Open Developer Console (F12) and clear it"
echo ""
echo "   3. Submit a test form with any data"
echo ""
echo "   4. Expected SUCCESS behavior:"
echo "      ✅ Progress updates: 0/X → 1/X → 2/X → X/X"
echo "      ✅ 'Job completed' message (ONE TIME ONLY)"
echo "      ✅ Connection closes cleanly"
echo "      ✅ NO '503 Service Unavailable' errors"
echo "      ✅ NO 'SSE connection error' messages"
echo "      ✅ NO multiple 'Job completed' duplicates"
echo ""
echo "   5. Check server logs:"
echo -e "      ${CYAN}gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}${NC}"
echo ""
echo "      Expected SUCCESS indicators:"
echo "      ✅ NO 'ERR_HTTP_HEADERS_SENT' errors"
echo "      ✅ NO '503' status codes"
echo "      ✅ Clean SSE connection lifecycle"
echo ""
echo -e "${GREEN}✨ SSE streaming should now work without crashes!${NC}"
echo ""

# Clean up temp files
rm -f /tmp/fix_sse_error_handler.py
