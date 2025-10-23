#!/bin/bash
###############################################################################
# Fix Dropbox Token - Remove Newline Character
#
# This script properly updates the Dropbox token without adding a newline
###############################################################################

set -e

echo "🔧 Fixing Dropbox Token (Removing Newline)"
echo ""

# Check if token is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the Dropbox token"
    echo ""
    echo "Usage:"
    echo "  ./fix-dropbox-token-newline.sh YOUR_DROPBOX_TOKEN"
    echo ""
    echo "Or get token from Dropbox:"
    echo "  https://www.dropbox.com/developers/apps"
    echo ""
    exit 1
fi

TOKEN="$1"

# Validate token format
if [[ ! "$TOKEN" =~ ^sl\.u\. ]]; then
    echo "⚠️  Warning: Token doesn't start with 'sl.u.' - is this correct?"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📝 Token preview: ${TOKEN:0:20}...${TOKEN: -20}"
echo ""

# Create temporary file WITHOUT newline
echo -n "$TOKEN" > /tmp/dropbox-token-clean.txt

echo "📤 Updating secret in Google Cloud Secret Manager..."
gcloud secrets versions add dropbox-token --data-file=/tmp/dropbox-token-clean.txt

# Clean up
rm /tmp/dropbox-token-clean.txt

echo "✅ Secret updated successfully!"
echo ""

echo "🔄 Updating Python pipeline service..."
gcloud run services update python-pipeline \
  --region=us-central1 \
  --update-secrets=DROPBOX_ACCESS_TOKEN=dropbox-token:latest \
  --quiet

echo "✅ Service updated!"
echo ""

echo "⏳ Waiting 30 seconds for service to restart..."
sleep 30

echo ""
echo "🔍 Checking logs for Dropbox initialization..."
echo ""

LOGS=$(gcloud run services logs read python-pipeline --region=us-central1 --limit=20 2>/dev/null)

if echo "$LOGS" | grep -q "✅.*Dropbox.*initialized"; then
    echo "✅ SUCCESS! Dropbox is initialized and working!"
    echo ""
    echo "$LOGS" | grep -i "dropbox" | tail -5
elif echo "$LOGS" | grep -q "❌.*Dropbox"; then
    echo "❌ Still seeing errors. Recent logs:"
    echo ""
    echo "$LOGS" | grep -i "dropbox" | tail -10
    echo ""
    echo "💡 Tip: Make sure you copied the ENTIRE token from Dropbox"
else
    echo "⚠️  No Dropbox logs yet. Service may still be starting."
    echo "   Check logs manually in 1 minute:"
    echo "   gcloud run services logs read python-pipeline --region=us-central1 --limit=20 | grep -i dropbox"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Submit a test form at: https://node-server-945419684329.us-central1.run.app"
echo "2. Monitor uploads: gcloud run services logs read python-pipeline --region=us-central1 --follow | grep '☁️'"
echo "3. Check Dropbox: /Current Clients/"
echo ""
echo "Done! 🚀"
