# Quick Start - Local Development

Get your local development environment running in 3 steps.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Start Cloud SQL Proxy

Open a new terminal and run:

```bash
./scripts/start-db-proxy.sh
```

**Expected output:**
```
===================================================
Cloud SQL Proxy - Development Database
===================================================

✅ Authenticated as: your-email@example.com

Starting Cloud SQL Proxy...
Instance: docmosis-tornado:us-central1:legal-forms-db-dev
Local port: 5432

Press Ctrl+C to stop the proxy
===================================================

Listening on 127.0.0.1:5432
Ready for new connections
```

**Keep this terminal open!** The proxy must run while you develop.

---

### Step 2: Test Database Connection

Open a **second terminal** and run:

```bash
./scripts/test-db-connection.sh
```

**Expected output:**
```
===================================================
Database Connection Test
===================================================

✅ Cloud SQL Proxy is running on port 5432

Testing database connection...
 current_time
------------------------
 2025-11-17 10:30:45-08

✅ Database connection successful!

Listing tables in database...
Total form entries: 42

✅ All checks passed!
===================================================
```

---

### Step 3: Start Your Application

In the same terminal (or a third one):

```bash
npm start
```

**Expected output:**
```
> lipton-webserver@1.0.0 start
> node server.js

✅ Database connected: 2025-11-17T18:30:45.123Z
🚀 Server running on http://localhost:3000
```

---

## ✅ You're Ready!

Your local development environment is now running with:

- **Database:** Connected to `legal-forms-db-dev` (Cloud SQL)
- **Server:** Running at http://localhost:3000
- **API:** Ready to accept form submissions

---

## 📋 What's Configured

Your [.env](.env) file is now set up with:

```env
# Database - Development instance via Cloud SQL Proxy
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legal_forms_db_dev
DB_USER=app-user-dev
DB_PASSWORD=VVAqB2mUqdAxIBnej1MnYjg3v

# Other settings
NODE_ENV=development
PORT=3000
PIPELINE_API_ENABLED=true
DROPBOX_ENABLED=true
EMAIL_ENABLED=true
```

---

## 🧪 Test Your Setup

### Test the Health Endpoint

```bash
curl http://localhost:3000/health | jq
```

### Submit a Test Form

```bash
curl -X POST http://localhost:3000/api/form-entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8" \
  -d '{
    "caseNumber": "TEST-001",
    "caseTitle": "Test Case",
    "plaintiffName": "Test Client",
    "streetAddress": "123 Test St"
  }'
```

### Check Database

```bash
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev \
  -c "SELECT case_number, plaintiff_name FROM form_entries ORDER BY created_at DESC LIMIT 5;"
```

---

## 🛑 Stopping Development

1. **Stop Node.js server:** Press `Ctrl+C` in the terminal running `npm start`
2. **Stop Cloud SQL Proxy:** Press `Ctrl+C` in the proxy terminal
3. (Optional) **Clean up:** `pkill cloud-sql-proxy`

---

## 🐛 Troubleshooting

### "Port 5432 already in use"

You might have local PostgreSQL running:

```bash
# Stop local PostgreSQL
brew services stop postgresql@14

# Or check what's using the port
lsof -i :5432
```

### "Cloud SQL Proxy not found"

The start script will automatically download it. If that fails:

```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/
```

### "Database connection failed"

Make sure the proxy is running:

```bash
ps aux | grep cloud-sql-proxy
```

If not running, start it:

```bash
./scripts/start-db-proxy.sh
```

---

## 📚 Full Documentation

- **[LOCAL_DB_SETUP.md](LOCAL_DB_SETUP.md)** - Complete database setup guide
- **[DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)** - Deploy to dev/staging/prod
- **[config/development.env](config/development.env)** - Full configuration reference

---

## 💡 Pro Tips

### Run Everything in One Command

Use `tmux` or `iTerm2` split panes:

```bash
# Terminal 1 (top)
./scripts/start-db-proxy.sh

# Terminal 2 (bottom)
npm start
```

### VS Code Integrated Terminal

1. Split terminal (`Cmd+\`)
2. Run proxy in left pane
3. Run `npm start` in right pane

### Check Logs in Real-Time

```bash
# Watch server logs
tail -f /tmp/server-start.log

# Watch database queries
PGPASSWORD='VVAqB2mUqdAxIBnej1MnYjg3v' psql \
  -h localhost -p 5432 -U app-user-dev -d legal_forms_db_dev \
  -c "SELECT * FROM pg_stat_activity WHERE datname = 'legal_forms_db_dev';"
```

---

## 🔄 Daily Workflow

```bash
# Morning: Start development
cd "/Users/ryanhaines/Desktop/Lipton Webserver"

# Terminal 1: Start proxy
./scripts/start-db-proxy.sh

# Terminal 2: Start server
npm start

# ... do your work ...

# End of day: Stop everything
# Ctrl+C in both terminals
```

---

*Last Updated: 2025-11-17*
*Database: legal-forms-db-dev*
