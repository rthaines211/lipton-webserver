#!/bin/bash
#
# Cloud SQL Proxy Starter Script
# Starts the Cloud SQL Proxy for local development database access
#

set -e

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
INSTANCE="legal-forms-db-dev"
CONNECTION_NAME="$PROJECT_ID:$REGION:$INSTANCE"
LOCAL_PORT=5432

echo "==================================================="
echo "Cloud SQL Proxy - Development Database"
echo "==================================================="
echo ""

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "⚠️  Cloud SQL Proxy not found. Installing..."
    echo ""

    # Download for macOS
    curl -o /tmp/cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64

    chmod +x /tmp/cloud-sql-proxy
    sudo mv /tmp/cloud-sql-proxy /usr/local/bin/cloud-sql-proxy

    echo "✅ Cloud SQL Proxy installed to /usr/local/bin/cloud-sql-proxy"
    echo ""
fi

# Check if port is already in use
if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $LOCAL_PORT is already in use"
    echo ""
    echo "Options:"
    echo "1. Stop the process using port $LOCAL_PORT:"
    echo "   lsof -i :$LOCAL_PORT"
    echo "   kill <PID>"
    echo ""
    echo "2. If it's a local PostgreSQL, stop it:"
    echo "   brew services stop postgresql@14"
    echo ""
    echo "3. Use a different port (edit this script to change LOCAL_PORT)"
    echo ""
    exit 1
fi

# Check gcloud authentication
echo "Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "✅ Authenticated as: $ACTIVE_ACCOUNT"
echo ""

# Start the proxy
echo "Starting Cloud SQL Proxy..."
echo "Instance: $CONNECTION_NAME"
echo "Local port: $LOCAL_PORT"
echo ""
echo "Press Ctrl+C to stop the proxy"
echo "==================================================="
echo ""

cloud-sql-proxy $CONNECTION_NAME --port=$LOCAL_PORT
