#!/bin/bash

###############################################################################
# FIX #1: Add 'total' field to server completion event
#
# PROBLEM: Server sends completion event without 'total' field
# LOCATION: server.js, line ~2311-2316
# SOLUTION: Add 'total: 0' to the completion event data
###############################################################################

echo "🔧 Fixing server.js completion event..."
echo ""

# Backup first
cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created"

# Show what needs to change
echo ""
echo "📝 Current code (around line 2311):"
echo "─────────────────────────────────────"
grep -A 7 "event: complete" server.js | head -10
echo ""

echo "This needs to become:"
echo "─────────────────────────────────────"
cat << 'EOF'
        res.write('event: complete\n');
        res.write(`data: ${JSON.stringify({
            jobId,
            status: 'complete',
            message: 'Job completed or not found',
            phase: 'complete',
            progress: 100,
            total: 0  // ADDED: Provide total field for client
        })}\n\n`);
EOF

echo ""
echo "📋 MANUAL STEPS:"
echo "1. Open server.js in your editor"
echo "2. Search for: event: complete"
echo "3. Find the JSON.stringify block (around line 2311)"
echo "4. Add this line after 'progress: 100,':"
echo "   total: 0  // ADDED: Provide total field for client"
echo ""
echo "Or run this command:"
echo ""
echo "sed -i '' '/progress: 100/a\\
            ,total: 0  // ADDED: Provide total field for client
' server.js"
echo ""

read -p "Apply fix automatically? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Apply the fix
    sed -i '' '/progress: 100/a\
            ,total: 0  // ADDED: Provide total field for client
' server.js

    echo "✅ Fix applied!"
    echo ""
    echo "Verification:"
    grep -A 10 "event: complete" server.js | head -15
else
    echo "❌ Fix not applied - please apply manually"
fi

echo ""
echo "─────────────────────────────────────"
echo "✅ Done! Remember to test and deploy."
