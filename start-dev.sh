#!/bin/bash

# Start development server with correct dev database configuration
# This script overrides any shell environment variables with dev database settings

cd "$(dirname "$0")"

echo "🚀 Starting development server..."
echo "📦 Using development database: legal_forms_db_dev on localhost:5433"

# Export dev database configuration
export DB_HOST=localhost
export DB_PORT=5433
export DB_NAME=legal_forms_db_dev
export DB_USER=app-user-dev
export DB_PASSWORD=VVAqB2mUqdAxIBnej1MnYjg3v
export NODE_ENV=development

# Unset any Cloud Run variables
unset CLOUD_SQL_CONNECTION_NAME
unset K_SERVICE

# Start the server
npm start
