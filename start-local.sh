#!/bin/bash
# Start server with local database configuration

export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=legal_forms_db_dev
export DB_USER=ryanhaines
export DB_PASSWORD=unused_for_local

cd "/Users/ryanhaines/Desktop/Lipton Webserver"
npm start
