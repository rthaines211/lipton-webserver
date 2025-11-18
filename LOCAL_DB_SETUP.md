# Local Database Connection Setup

This guide shows you how to connect to the Cloud SQL development database from your local machine.

---

## 🎯 Connection Information

**Cloud SQL Instance:**
- Instance Name: `legal-forms-db-dev`
- Connection Name: `docmosis-tornado:us-central1:legal-forms-db-dev`
- Region: `us-central1`

**Database Credentials:**
- Database: `legal_forms_db_dev`
- User: `app-user-dev`
- Password: `VVAqB2mUqdAxIBnej1MnYjg3v`
- Port: `5432` (local proxy port)

---

## 📋 Setup Methods

### Method 1: Cloud SQL Proxy (Recommended)

The Cloud SQL Proxy creates a secure tunnel to your Cloud SQL instance.

#### Step 1: Install Cloud SQL Proxy

```bash
# Download the proxy (macOS)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64

# Make it executable
chmod +x cloud-sql-proxy

# Move to PATH (optional)
sudo mv cloud-sql-proxy /usr/local/bin/
```

#### Step 2: Start the Proxy

```bash
# Start Cloud SQL Proxy in the background
cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev \
  --port=5432 &

# Or run in foreground (recommended for debugging)
cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev \
  --port=5432
```

**You should see:**
```
Listening on 127.0.0.1:5432
Ready for new connections
```

#### Step 3: Test Connection

```bash
# Test with psql
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost \
  -p 5432 \
  -U app-user-dev \
  -d legal_forms_db_dev

# Or use environment variable
export PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v'
psql -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev
```

**Successful connection shows:**
```
psql (14.x, server 14.x)
Type "help" for help.

legal_forms_db_dev=>
```

---

### Method 2: Direct Cloud SQL Connection (Alternative)

You can also connect via gcloud without the proxy:

```bash
gcloud sql connect legal-forms-db-dev \
  --user=app-user-dev \
  --database=legal_forms_db_dev \
  --project=docmosis-tornado
```

---

## 🔧 Application Configuration

### For Local Development (.env)

Create or update your `.env` file:

```env
# Database Configuration (via Cloud SQL Proxy)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legal_forms_db_dev
DB_USER=app-user-dev
DB_PASSWORD=VVAqB2mUqdAxIBnej1MnYjg3v

# Other settings
NODE_ENV=development
PORT=3000
```

### For Node.js Application

Your `server.js` should use these environment variables:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'legal_forms_db_dev',
  user: process.env.DB_USER || 'app-user-dev',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0]);
  }
});
```

---

## 🧪 Verification Commands

### Check Database Connection

```bash
# List all tables
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev \
  -c "\dt"

# Count form entries
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev \
  -c "SELECT COUNT(*) FROM form_entries;"

# Show recent entries
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev \
  -c "SELECT id, case_number, created_at FROM form_entries ORDER BY created_at DESC LIMIT 5;"
```

### Check Cloud SQL Proxy Status

```bash
# Check if proxy is running
ps aux | grep cloud-sql-proxy

# Check proxy logs
# (If running in foreground, you'll see connection logs)

# Stop proxy
pkill cloud-sql-proxy
```

---

## 🚀 Complete Workflow

### Starting Local Development

```bash
# Terminal 1: Start Cloud SQL Proxy
cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev --port=5432

# Terminal 2: Start Node.js server
cd "/Users/ryanhaines/Desktop/Lipton Webserver"
npm start

# Terminal 3: (Optional) Monitor database
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev
```

### Sample .env File for Local Dev

```env
# ==================================================
# Local Development Environment Variables
# ==================================================

# Core
NODE_ENV=development
PORT=3000

# Database (Cloud SQL via Proxy)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legal_forms_db_dev
DB_USER=app-user-dev
DB_PASSWORD=VVAqB2mUqdAxIBnej1MnYjg3v

# Pipeline (run locally)
PIPELINE_API_URL=http://localhost:8000
PIPELINE_API_ENABLED=true
EXECUTE_PIPELINE_ON_SUBMIT=true

# Authentication (dev mode bypasses this)
ACCESS_TOKEN=dev-token-not-required

# Email (disabled for local dev)
EMAIL_ENABLED=false
EMAIL_FROM_ADDRESS=dev@liptonlegal.com

# Dropbox (disabled for local dev)
DROPBOX_ENABLED=false

# GCP (only for deployed environments)
GCLOUD_PROJECT=docmosis-tornado
GCS_BUCKET_NAME=docmosis-tornado-form-submissions-dev
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Password is dev-only** - Production uses different credentials
3. **Cloud SQL Proxy** - Creates secure, encrypted tunnel
4. **IAM Authentication** - Your gcloud credentials authorize the proxy
5. **Local only** - Database password only works via Cloud SQL Proxy from authorized accounts

---

## 🐛 Troubleshooting

### "Connection refused"
```bash
# Check if proxy is running
ps aux | grep cloud-sql-proxy

# Restart proxy
pkill cloud-sql-proxy
cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev --port=5432
```

### "Password authentication failed"
```bash
# Verify credentials
gcloud secrets versions access latest --secret=DB_PASSWORD_DEV

# Test direct gcloud connection
gcloud sql connect legal-forms-db-dev --user=app-user-dev
```

### "Could not find Cloud SQL instance"
```bash
# Verify instance exists
gcloud sql instances describe legal-forms-db-dev --project=docmosis-tornado

# Check your gcloud auth
gcloud auth list
gcloud config get-value project
```

### Port 5432 already in use
```bash
# Find what's using the port
lsof -i :5432

# Kill PostgreSQL if running locally
brew services stop postgresql@14

# Or use a different port for the proxy
cloud-sql-proxy docmosis-tornado:us-central1:legal-forms-db-dev --port=5433
# Then update DB_PORT=5433 in .env
```

---

## 📊 Quick Reference

| Setting | Value |
|---------|-------|
| Instance | `legal-forms-db-dev` |
| Connection Name | `docmosis-tornado:us-central1:legal-forms-db-dev` |
| Database | `legal_forms_db_dev` |
| User | `app-user-dev` |
| Password | `VVAqB2mUqdAxIBnej1MnYjg3v` |
| Local Host | `localhost` |
| Local Port | `5432` |

---

## 🔗 Related Documentation

- [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md) - Environment deployment guide
- [config/development.env](config/development.env) - Full development configuration
- [Cloud SQL Proxy Docs](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy)

---

*Last Updated: 2025-11-17*
*Database: legal-forms-db-dev (Development)*
