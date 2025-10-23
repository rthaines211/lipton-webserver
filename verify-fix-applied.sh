#!/bin/bash

##############################################################################
# Verify SSE Fix Was Applied
##############################################################################

echo "=========================================="
echo "Verifying SSE Authentication Fix"
echo "=========================================="
echo ""

# Check if the fix was applied to js/sse-client.js
echo "1. Checking js/sse-client.js for fix..."
if grep -q "🔐 SSE URL with auth token" js/sse-client.js; then
    echo "  ✅ Fix FOUND in js/sse-client.js"
else
    echo "  ❌ Fix NOT FOUND in js/sse-client.js"
    echo "  The file hasn't been updated!"
fi
echo ""

# Check if the fix was applied to dist/js/sse-client.js
echo "2. Checking dist/js/sse-client.js for fix..."
if grep -q "🔐 SSE URL with auth token" dist/js/sse-client.js; then
    echo "  ✅ Fix FOUND in dist/js/sse-client.js"
else
    echo "  ❌ Fix NOT FOUND in dist/js/sse-client.js"
    echo "  The dist file hasn't been updated!"
fi
echo ""

# Show current token extraction logic
echo "3. Current token extraction logic:"
grep -A5 "URLSearchParams\|get('token')" js/sse-client.js || echo "  ❌ Token extraction code NOT FOUND"
echo ""

# Show current SSE URL construction
echo "4. Current SSE URL construction:"
grep "this.sseUrl = " js/sse-client.js
echo ""

echo "=========================================="
echo "File Checksums"
echo "=========================================="
echo ""
echo "js/sse-client.js:"
md5 js/sse-client.js 2>/dev/null || md5sum js/sse-client.js 2>/dev/null || echo "  (checksum tool not available)"
echo ""
echo "dist/js/sse-client.js:"
md5 dist/js/sse-client.js 2>/dev/null || md5sum dist/js/sse-client.js 2>/dev/null || echo "  (checksum tool not available)"
echo ""

echo "=========================================="
echo "Recommendation"
echo "=========================================="
echo ""

if grep -q "🔐 SSE URL with auth token" js/sse-client.js; then
    echo "✅ Fix is applied to source files"
    echo ""
    echo "Next steps:"
    echo "  1. Clear browser cache (Cmd+Shift+R on Mac)"
    echo "  2. Restart local server: npm start"
    echo "  3. Access: http://localhost:3000/?token=a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"
    echo "  4. Check console for '🔐 SSE URL with auth token' message"
else
    echo "❌ Fix NOT applied"
    echo ""
    echo "Run the fix script again:"
    echo "  ./fix-sse-auth.sh"
fi
echo ""
