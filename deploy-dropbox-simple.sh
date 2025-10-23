#!/bin/bash
###############################################################################
# Simple Dropbox Fix Deployment
#
# Quick one-command fix for Dropbox uploads
###############################################################################

set -e

echo "🚀 Deploying Python Pipeline with Dropbox fix..."
echo ""

# Clear build cache
echo "📦 Clearing build cache..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
gsutil -m rm -r "gs://${PROJECT_ID}_cloudbuild/source/*" 2>/dev/null || echo "   No cache to clear"

echo ""
echo "🔨 Building and deploying..."
echo ""

# Deploy with unique build ID to force rebuild
BUILD_ID="build-$(date +%s)"

gcloud run deploy python-pipeline \
  --source="./normalization work" \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300 \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="DROPBOX_ENABLED=true,DROPBOX_BASE_PATH=/Current Clients,DROPBOX_LOCAL_OUTPUT_PATH=webhook_documents,DROPBOX_CONTINUE_ON_FAILURE=true,BUILD_ID=$BUILD_ID" \
  --set-secrets="DROPBOX_ACCESS_TOKEN=dropbox-token:latest"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 To verify, check logs:"
echo "   gcloud run services logs read python-pipeline --region=us-central1 --limit=50 | grep -i dropbox"
echo ""
echo "📝 Then submit a test form at:"
echo "   https://node-server-945419684329.us-central1.run.app"
