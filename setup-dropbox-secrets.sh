#!/bin/bash
# Dropbox Secret Manager Setup
# Generated: 2025-10-27T09:42:19.646875

set -e

PROJECT_ID="docmosis-tornado"
SERVICE_ACCOUNT="945419684329-compute@developer.gserviceaccount.com"

echo "Creating secrets..."
gcloud secrets create dropbox-app-key --project=$PROJECT_ID 2>/dev/null || echo "Secret already exists"
gcloud secrets create dropbox-app-secret --project=$PROJECT_ID 2>/dev/null || echo "Secret already exists"
gcloud secrets create dropbox-refresh-token --project=$PROJECT_ID 2>/dev/null || echo "Secret already exists"

echo "Storing values..."
echo -n "ty8qxx81kuxaiyr" | gcloud secrets versions add dropbox-app-key --data-file=- --project=$PROJECT_ID
echo -n "kfhjz9vvwhp3rru" | gcloud secrets versions add dropbox-app-secret --data-file=- --project=$PROJECT_ID
echo -n "5tMLDgb937sAAAAAAAAAARdeKPp56KkFLiiuRKZifymFWZBvbII6daBsnmPu25Uy" | gcloud secrets versions add dropbox-refresh-token --data-file=- --project=$PROJECT_ID

echo "Granting access to service account..."
for secret in dropbox-app-key dropbox-app-secret dropbox-refresh-token; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
done

echo "✅ All secrets configured successfully!"
