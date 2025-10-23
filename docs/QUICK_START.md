# Quick Start Guide
## Legal Form Application

Get up and running in **5-10 minutes** for local development or **2-3 hours** for production deployment.

---

## Choose Your Path

### 🚀 Local Development (5-10 minutes)
**Best for:** Developers, testing, quick demo

### ☁️ Production Deployment (2-3 hours)
**Best for:** Live deployment on Google Cloud Platform

---

## 🚀 Local Development

### Prerequisites

- Node.js 14+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- Git

### Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/your-org/legal-form-app.git
cd legal-form-app

# Install dependencies
npm install

# Expected output: "added XXX packages"
```

### Step 2: Database Setup (3 minutes)

```bash
# Create database
createdb legal_forms_db

# Import schema
psql legal_forms_db < schema.sql

# Verify tables
psql legal_forms_db -c "\dt"
# Expected: cases, parties, party_issue_selections
```

### Step 3: Environment Configuration (1 minute)

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Minimal .env for local development:**
```env
# Database
DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=legal_forms_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# Application
NODE_ENV=development
ACCESS_TOKEN=dev-token-12345

# Optional: Dropbox Integration
DROPBOX_ENABLED=false
```

### Step 4: Start the Application (1 minute)

```bash
# Build production assets
npm run build

# Start server
npm start

# Expected output:
# ✅ Database connected successfully
# 🚀 Server running on http://localhost:3000
# 📚 API docs available at /api-docs
```

### Step 5: Test It Works ✅

```bash
# In another terminal, test the API
curl http://localhost:3000/health

# Expected: {"status":"healthy"}

# Open in browser
open http://localhost:3000

# You should see the form!
```

---

## ☁️ Production Deployment (GCP)

### Prerequisites

- Google Cloud Platform account with billing
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Docker installed
- Domain name (optional but recommended)

### Phase Overview

| Phase | Time | Description |
|-------|------|-------------|
| 1. Security | 15-20 min | Create secrets in GCP Secret Manager |
| 2. Database | 20-30 min | Deploy Cloud SQL PostgreSQL |
| 3. Network | 10-15 min | Setup VPC connector |
| 4. Python Service | 20-30 min | Deploy normalization pipeline |
| 5. Node.js Service | 20-30 min | Deploy main API |
| 6. Cloud Storage | 10-15 min | Setup file storage |
| 7. Dropbox | 10-15 min | Optional cloud backup |
| **Total** | **2-3 hours** | Complete production deployment |

### Quick Deploy Script

For experienced users, run this automated script:

```bash
#!/bin/bash
# Quick production deployment

set -e

# Configuration
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"

# Authenticate
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable APIs (5 minutes)
gcloud services enable \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    compute.googleapis.com \
    vpcaccess.googleapis.com \
    secretmanager.googleapis.com \
    storage.googleapis.com

# Phase 1: Secrets (5 minutes)
echo "🔒 Phase 1: Creating secrets..."
DB_PASSWORD=$(openssl rand -base64 32)
ACCESS_TOKEN=$(openssl rand -hex 32)

echo -n "app-user" | gcloud secrets create db-user --data-file=-
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "$ACCESS_TOKEN" | gcloud secrets create access-token --data-file=-

echo "Generated credentials:"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "ACCESS_TOKEN: $ACCESS_TOKEN"
echo "⚠️  Save these credentials securely!"

# Phase 2: Database (15 minutes)
echo "💾 Phase 2: Creating Cloud SQL instance..."
gcloud sql instances create legal-forms-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password="$DB_PASSWORD" \
    --storage-size=10GB \
    --backup-start-time=03:00

gcloud sql databases create legal_forms_db --instance=legal-forms-db
gcloud sql users create app-user --instance=legal-forms-db --password="$DB_PASSWORD"

# Import schema
BUCKET="${PROJECT_ID}-db-migration"
gsutil mb -l $REGION gs://$BUCKET
gsutil cp schema_no_owner.sql gs://$BUCKET/
gcloud sql import sql legal-forms-db gs://$BUCKET/schema_no_owner.sql --database=legal_forms_db
gsutil rm -r gs://$BUCKET

# Phase 3: Network (5 minutes)
echo "🌐 Phase 3: Creating VPC connector..."
gcloud compute networks vpc-access connectors create cloud-run-connector \
    --region=$REGION \
    --network=default \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=3

# Phase 4: Python Service (10 minutes)
echo "🐍 Phase 4: Deploying Python pipeline..."
cd server/python-pipeline
gcloud run deploy python-pipeline \
    --source . \
    --region=$REGION \
    --memory=512Mi \
    --timeout=300 \
    --allow-unauthenticated \
    --vpc-connector=cloud-run-connector \
    --set-secrets="DB_USER=db-user:latest,DB_PASSWORD=db-password:latest" \
    --set-env-vars="DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:legal-forms-db,DB_NAME=legal_forms_db"
cd ../..

PYTHON_URL=$(gcloud run services describe python-pipeline --region=$REGION --format="value(status.url)")

# Phase 5: Node.js Service (10 minutes)
echo "🟢 Phase 5: Deploying Node.js API..."
gcloud run deploy node-server \
    --source . \
    --region=$REGION \
    --memory=512Mi \
    --allow-unauthenticated \
    --vpc-connector=cloud-run-connector \
    --set-env-vars="NODE_ENV=production,PIPELINE_URL=$PYTHON_URL" \
    --set-secrets="ACCESS_TOKEN=access-token:latest,DB_USER=db-user:latest,DB_PASSWORD=db-password:latest" \
    --set-env-vars="DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:legal-forms-db,DB_NAME=legal_forms_db"

NODE_URL=$(gcloud run services describe node-server --region=$REGION --format="value(status.url)")

# Phase 6: Cloud Storage (3 minutes)
echo "☁️  Phase 6: Creating Cloud Storage bucket..."
gsutil mb -l $REGION gs://${PROJECT_ID}-form-submissions
gcloud run services update node-server --region=$REGION \
    --set-env-vars="GCS_BUCKET=${PROJECT_ID}-form-submissions"

# Done!
echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Application URL: $NODE_URL"
echo "📚 API Docs: ${NODE_URL}/api-docs"
echo "🔑 Access Token: $ACCESS_TOKEN"
echo ""
echo "Next steps:"
echo "1. Visit $NODE_URL to access the application"
echo "2. Test with: curl $NODE_URL/health"
echo "3. Configure Dropbox (optional): See docs/deployment/DEPLOYMENT_GUIDE.md"
echo "4. Setup custom domain (optional)"
echo ""
```

Save as `quick-deploy.sh` and run:

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### Manual Deployment

For step-by-step instructions with explanations, see: **[docs/deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)**

---

## Verification

### Test Local Development ✅

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"healthy"}

# Test database
curl http://localhost:3000/api/health/db
# Expected: {"database":"connected"}

# Test form submission
curl -X POST http://localhost:3000/api/form-entries \
    -H "Content-Type: application/json" \
    -d '{
        "caseNumber": "TEST-001",
        "caseTitle": "Test Case",
        "plaintiffName": "Test Plaintiff",
        "streetAddress": "123 Test St"
    }'
# Expected: {"success":true,"dbCaseId":"..."}
```

### Test Production Deployment ✅

```bash
# Replace with your actual URLs
NODE_URL="https://node-server-xxx.run.app"
ACCESS_TOKEN="your-generated-token"

# Health check (public)
curl $NODE_URL/health
# Expected: {"status":"healthy"}

# Test authenticated endpoint
curl -H "Authorization: Bearer $ACCESS_TOKEN" $NODE_URL/api/form-entries
# Expected: [] (empty array initially)

# Test form submission
curl -X POST $NODE_URL/api/form-entries \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "caseNumber": "PROD-TEST-001",
        "caseTitle": "Production Test",
        "plaintiffName": "Production Tester",
        "streetAddress": "789 Cloud St"
    }'
# Expected: {"success":true,"dbCaseId":"PROD-TEST-001"}

# Verify in database
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
SELECT * FROM cases ORDER BY created_at DESC LIMIT 1;
\q
```

---

## Common Issues

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running
ps aux | grep postgres

# If not running, start it
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Verify connection
psql -U your_username -d legal_forms_db -c "SELECT 1;"
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 PID

# Or use different port
PORT=3001 npm start
```

### Issue: "npm install fails"

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: "GCP deployment fails"

**Solution:**
```bash
# Check you're authenticated
gcloud auth list

# Check project is set
gcloud config get-value project

# Check APIs are enabled
gcloud services list --enabled

# View deployment logs
gcloud run services logs read node-server --region=us-central1
```

---

## Next Steps

### For Developers

1. **Explore the API**
   - Visit http://localhost:3000/api-docs
   - Try the interactive Swagger UI
   - Review API examples

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Read Developer Guide**
   - [docs/DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

### For Production

1. **Setup Monitoring**
   - Configure alerts in GCP Console
   - Setup log aggregation
   - Review [docs/operations/OPERATIONS_GUIDE.md](operations/OPERATIONS_GUIDE.md)

2. **Configure Dropbox (Optional)**
   - Create Dropbox app
   - Generate access token
   - See [docs/deployment/DEPLOYMENT_GUIDE.md#phase-7-dropbox-integration](deployment/DEPLOYMENT_GUIDE.md#phase-7-dropbox-integration)

3. **Setup Custom Domain**
   - Register domain
   - Configure Cloud Run domain mapping
   - Setup SSL certificate (automatic)

4. **Security Hardening**
   - Rotate secrets quarterly
   - Setup IP allowlisting
   - Review [docs/operations/OPERATIONS_GUIDE.md#security-operations](operations/OPERATIONS_GUIDE.md#security-operations)

---

## Getting Help

### Documentation

- **[User Guide](USER_GUIDE.md)** - How to use the form
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Development best practices
- **[API Reference](API_REFERENCE.md)** - Complete API documentation
- **[Architecture](ARCHITECTURE.md)** - System design and components
- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[Operations Guide](operations/OPERATIONS_GUIDE.md)** - Day-to-day maintenance

### Support

- **GitHub Issues:** [github.com/your-org/legal-form-app/issues](https://github.com/your-org/legal-form-app/issues)
- **Email:** support@example.com
- **Documentation:** [Full documentation index](README.md)

---

## Summary

**Local Development:**
```bash
git clone [repo] && cd [repo]
npm install
createdb legal_forms_db
psql legal_forms_db < schema.sql
cp .env.example .env
npm start
# Visit http://localhost:3000
```

**Production Deployment:**
```bash
# Run quick-deploy.sh or follow
# docs/deployment/DEPLOYMENT_GUIDE.md
```

**Verification:**
```bash
curl http://localhost:3000/health
# or
curl https://your-app.run.app/health
```

---

**Ready to dive deeper?** See the complete [Documentation Index](README.md) for all available guides.

**Document Version:** 2.0
**Last Updated:** October 23, 2025
