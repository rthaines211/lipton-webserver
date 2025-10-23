#!/bin/bash
echo "🔄 Rolling back SSE fixes..."

# Restore original files
cp js/sse-client.js.backup js/sse-client.js
cp server.js.backup server.js

# Deploy previous version
echo "Rebuilding and deploying original version..."
gcloud builds submit --tag "gcr.io/docmosis-tornado/node-server:rollback" .
gcloud run deploy node-server \
    --image "gcr.io/docmosis-tornado/node-server:rollback" \
    --region us-central1 \
    --allow-unauthenticated

echo "✅ Rollback completed"
