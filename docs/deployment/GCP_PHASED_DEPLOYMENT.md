# GCP Phased Deployment Plan - Lipton Legal Form Application

## ✅ **DEPLOYMENT COMPLETE - ALL SYSTEMS OPERATIONAL**

**Status:** ✅ Production Ready  
**Last Update:** October 23, 2025  
**Services:** node-server (00011-7ql) + python-pipeline (00007-m7t)  
**Dropbox:** ✅ Active and uploading documents automatically  

See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for current operational details.

---

## Overview

This document provides a production-ready, phased deployment approach with validation checkpoints and rollback procedures. Each phase includes specific validation steps that **MUST PASS** before proceeding to the next phase.

### Deployment Principles

- **Validate Early, Validate Often**: Each phase has explicit go/no-go checkpoints
- **Fail Fast**: Stop immediately if validation fails and execute rollback
- **Incremental Progress**: Each phase builds on validated previous work
- **Rollback Ready**: Every phase has a documented rollback procedure

---

## Pre-Deployment Checklist

**Before starting Phase 1, verify:**

- [x] GCP Project created and billing enabled
- [x] `gcloud` CLI installed and authenticated (`gcloud auth login`)
- [x] Project ID set: `gcloud config set project docmosis-tornado`
- [x] Required APIs enabled:
  ```bash
  gcloud services enable \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    compute.googleapis.com \
    vpcaccess.googleapis.com \
    secretmanager.googleapis.com \
    cloudresourcemanager.googleapis.com
  ```
- [x] Docmosis VM confirmed accessible at `10.128.0.3`
- [x] Local database backup created:
  ```bash
  pg_dump -U ryanhaines -h localhost legal_forms_db > backup_$(date +%Y%m%d).sql
  ```

**Estimated Total Time**: 3-4 hours

---

## Phase 1: Security Foundation (Secrets Manager) - COMPLETED

**Duration**: 15-20 minutes
**Why First**: Secrets must exist before any service deployment

### 1.1 Create Secrets 

```bash
# Database credentials
echo -n "app-user" | gcloud secrets create db-user --data-file=-
echo -n "GENERATE_SECURE_PASSWORD_HERE" | gcloud secrets create db-password --data-file=-

# Application secrets
echo -n "a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4" | \
  gcloud secrets create access-token --data-file=-

# Docmosis credentials
echo -n "YjcyM2Q0MzYtOTJiZi00NGI1LTlhMzQtYWIwZjFhNGYxNGE1OjMxMTY3MjM1Ng" | \
  gcloud secrets create docmosis-key --data-file=-

# Dropbox (if enabled)
echo -n "YOUR_DROPBOX_TOKEN" | gcloud secrets create dropbox-token --data-file=-
```

### 1.2 Validation Checkpoint ✓

**Commands to verify:**

```bash
# List all secrets
gcloud secrets list

# Verify each secret exists and has a version
gcloud secrets versions access latest --secret=db-user
gcloud secrets versions access latest --secret=db-password
gcloud secrets versions access latest --secret=access-token
gcloud secrets versions access latest --secret=docmosis-key
```

**Expected Output:**
- All secrets listed (db-user, db-password, access-token, docmosis-key)
- Each `versions access` command returns the stored value
- No errors about missing secrets

**Success Criteria:**
- ✅ All 4-5 secrets created successfully
- ✅ Values match expected format
- ✅ Secrets are in the correct GCP project

**Go/No-Go Decision:**
- **GO**: All secrets exist and accessible → Proceed to Phase 2
- **NO-GO**: Any secret missing or inaccessible → Fix before proceeding

### 1.3 Rollback Procedure

```bash
# Delete all secrets if needed to start over
gcloud secrets delete db-user --quiet
gcloud secrets delete db-password --quiet
gcloud secrets delete access-token --quiet
gcloud secrets delete docmosis-key --quiet
gcloud secrets delete dropbox-token --quiet
```

---

## Phase 2: Database Setup (Cloud SQL) - COMPLETED

**Duration**: 20-30 minutes
**Dependencies**: Phase 1 (secrets)

### 2.1 Create Cloud SQL Instance

```bash
gcloud sql instances create legal-forms-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=$(gcloud secrets versions access latest --secret=db-password) \
  --storage-size=10GB \
  --storage-type=SSD \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04 \
  --availability-type=ZONAL
```

**Note**: Instance creation takes 5-10 minutes

### 2.2 Create Database and User

```bash
# Create database
gcloud sql databases create legal_forms_db \
  --instance=legal-forms-db

# Create application user
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

### 2.3 Import Schema

```bash
# Upload local schema to Cloud Storage bucket (create bucket first)
export docmosis-tornado=$(gcloud config get-value project)
gsutil mb -l us-central1 gs://${docmosis-tornado}-db-migration

# Export schema from local database
pg_dump -U ryanhaines -h localhost legal_forms_db --schema-only > schema.sql

# Upload to bucket
gsutil cp schema.sql gs://${docmosis-tornado}-db-migration/

# Import to Cloud SQL
gcloud sql import sql legal-forms-db \
  gs://${docmosis-tornado}-db-migration/schema.sql \
  --database=legal_forms_db \
  --user=postgres
```

### 2.4 Validation Checkpoint ✓

**Commands to verify:**

```bash
# 1. Check instance is running
gcloud sql instances describe legal-forms-db --format="value(state)"

# 2. List databases
gcloud sql databases list --instance=legal-forms-db

# 3. List users
gcloud sql users list --instance=legal-forms-db

# 4. Connect and verify schema
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

**In psql session:**
```sql
-- Verify tables exist
\dt

-- Expected tables: cases, parties, party_issue_selections
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check table structure
\d cases
\d parties
\d party_issue_selections

-- Verify user permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee = 'app-user';

-- Exit
\q
```

**Expected Output:**
- Instance state: `RUNNABLE`
- Database `legal_forms_db` exists
- User `app-user` exists
- Tables: `cases`, `parties`, `party_issue_selections` present
- `app-user` has SELECT, INSERT, UPDATE, DELETE privileges

**Success Criteria:**
- ✅ Cloud SQL instance running
- ✅ Database created successfully
- ✅ All tables imported with correct schema
- ✅ User `app-user` has proper permissions
- ✅ Can connect via `gcloud sql connect`

**Go/No-Go Decision:**
- **GO**: All tables exist, user can connect → Proceed to Phase 3
- **NO-GO**: Schema import failed or permissions issues → Fix before proceeding

### 2.5 Rollback Procedure

```bash
# Delete Cloud SQL instance
gcloud sql instances delete legal-forms-db --quiet

# Delete Cloud Storage bucket
gsutil rm -r gs://${docmosis-tornado}-db-migration

# Data is safe in local PostgreSQL backup
```

---

## Phase 3: Network Infrastructure - COMPLETED

**Duration**: 15-20 minutes
**Dependencies**: None (can run parallel to Phase 2 if needed)

### 3.1 Create VPC Connector

```bash
gcloud compute networks vpc-access connectors create legal-forms-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3
```

**Note**: Connector creation takes 3-5 minutes

### 3.2 Configure Firewall Rules

```bash
# Allow Cloud Run (via VPC Connector) to access Docmosis VM
gcloud compute firewall-rules create allow-cloudrun-to-docmosis \
  --network=default \
  --allow=tcp:8080 \
  --source-ranges=10.8.0.0/28 \
  --target-tags=http-server \
  --description="Allow Cloud Run to access Docmosis VM on port 8080"

# Verify Docmosis VM has http-server tag
gcloud compute instances describe docmosis-tornado-vm \
  --zone=us-central1-c \
  --format="value(tags.items)"
```

**If Docmosis VM missing tag:**
```bash
gcloud compute instances add-tags docmosis-tornado-vm \
  --zone=us-central1-c \
  --tags=http-server
```

### 3.3 Validation Checkpoint ✓

**Commands to verify:**

```bash
# 1. Check VPC Connector status
gcloud compute networks vpc-access connectors describe legal-forms-connector \
  --region=us-central1 \
  --format="value(state)"

# 2. List connector details
gcloud compute networks vpc-access connectors describe legal-forms-connector \
  --region=us-central1

# 3. Verify firewall rule
gcloud compute firewall-rules describe allow-cloudrun-to-docmosis

# 4. Test Docmosis VM reachability (from a VM in same VPC)
# Create temporary test VM
gcloud compute instances create test-vm \
  --zone=us-central1-c \
  --machine-type=e2-micro \
  --subnet=default \
  --scopes=cloud-platform

# SSH and test connectivity
gcloud compute ssh test-vm --zone=us-central1-c --command=\
  "curl -s -o /dev/null -w '%{http_code}' http://10.128.0.3:8080/api/render"

# Delete test VM
gcloud compute instances delete test-vm --zone=us-central1-c --quiet
```

**Expected Output:**
- VPC Connector state: `READY`
- Connector IP range: `10.8.0.0/28`
- Firewall rule exists with correct source ranges
- Docmosis VM responds (HTTP 200 or 400, not connection refused)

**Success Criteria:**
- ✅ VPC Connector in READY state
- ✅ Firewall rule created successfully
- ✅ Docmosis VM accessible from VPC (10.128.0.3:8080)
- ✅ Network latency reasonable (<10ms within region)

**Go/No-Go Decision:**
- **GO**: VPC Connector ready and Docmosis reachable → Proceed to Phase 4
- **NO-GO**: Cannot reach Docmosis or connector failed → Fix networking

### 3.4 Rollback Procedure

```bash
# Delete VPC Connector
gcloud compute networks vpc-access connectors delete legal-forms-connector \
  --region=us-central1 --quiet

# Delete firewall rule
gcloud compute firewall-rules delete allow-cloudrun-to-docmosis --quiet
```

---

## Phase 4: Deploy Python FastAPI Service (Internal) - COMPLETED

**Duration**: 20-25 minutes
**Dependencies**: Phase 1 (secrets), Phase 3 (VPC connector)

### 4.1 Prepare Python Service

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver/normalization work"

# Verify Dockerfile exists or create it
cat > Dockerfile <<'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8080

# Run FastAPI
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
EOF
```

### 4.2 Grant Secret Access

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $docmosis-tornado --format="value(projectNumber)")

# Grant Python service access to Docmosis secret
gcloud secrets add-iam-policy-binding docmosis-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4.3 Deploy to Cloud Run

```bash
gcloud run deploy python-pipeline \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --ingress=internal \
  --vpc-connector=legal-forms-connector \
  --set-env-vars="HOST=0.0.0.0" \
  --set-env-vars="API_PORT=8080" \
  --set-env-vars="DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render" \
  --set-env-vars="USE_INTERNAL_API=true" \
  --set-env-vars="ENABLE_WEBHOOKS=false" \
  --set-secrets="DOCMOSIS_ACCESS_KEY=docmosis-key:latest" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0
```

### 4.4 Validation Checkpoint ✓

**Commands to verify:**

```bash
# 1. Check service status
gcloud run services describe python-pipeline --region=us-central1 \
  --format="value(status.conditions[0].status)"

# 2. Get service URL
PYTHON_URL=$(gcloud run services describe python-pipeline \
  --region=us-central1 --format="value(status.url)")
echo "Python Service URL: $PYTHON_URL"

# 3. Test health endpoint (should fail without auth - expected)
curl -i $PYTHON_URL/health

# 4. Test with ID token authentication
gcloud auth print-identity-token > /tmp/token.txt
curl -i -H "Authorization: Bearer $(cat /tmp/token.txt)" $PYTHON_URL/health

# 5. Check logs for startup errors
gcloud run services logs read python-pipeline \
  --region=us-central1 \
  --limit=50

# 6. Verify VPC connector attached
gcloud run services describe python-pipeline --region=us-central1 \
  --format="value(spec.template.spec.containers[0].resources)"
```

**Expected Output:**
- Service status: `True` (ready)
- URL format: `https://python-pipeline-HASH-uc.a.run.app`
- Health check without auth: `403 Forbidden` (correct - internal only)
- Health check with token: `200 OK` or valid response
- Logs show successful startup, no errors
- VPC connector: `legal-forms-connector` attached

**Success Criteria:**
- ✅ Service deployed and running
- ✅ Internal-only access enforced (403 without auth)
- ✅ Authentication working with ID token
- ✅ VPC connector properly attached
- ✅ No errors in startup logs
- ✅ Service can reach Docmosis VM (check logs for test calls)

**Smoke Test - Test Docmosis Connectivity:**

```bash
# Create test payload
cat > /tmp/test_payload.json <<EOF
{
  "test": "connectivity"
}
EOF

# Call Python service with test payload
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d @/tmp/test_payload.json \
  $PYTHON_URL/process
```

**Expected**: Response (even if error about invalid data) - proves connectivity works

**Go/No-Go Decision:**
- **GO**: Service running, authenticated, VPC connectivity works → Proceed to Phase 5
- **NO-GO**: Service won't start or can't reach Docmosis → Debug and fix

### 4.5 Rollback Procedure

```bash
# Delete Cloud Run service
gcloud run services delete python-pipeline --region=us-central1 --quiet

# Revoke secret access
gcloud secrets remove-iam-policy-binding docmosis-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Phase 5: Deploy Node.js Express Service (Public)

**Duration**: 25-30 minutes
**Dependencies**: Phase 1 (secrets), Phase 2 (database), Phase 4 (Python service)

### 5.1 Prepare Node.js Service

```bash
cd "/Users/ryanhaines/Desktop/Lipton Webserver"

# Create Dockerfile if not exists
cat > Dockerfile <<'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
EOF

# Create .dockerignore
cat > .dockerignore <<'EOF'
node_modules
npm-debug.log
.env
.git
.DS_Store
*.md
Dockerfile
.dockerignore
EOF
```

### 5.2 Grant Secret and Service Access

```bash
# Grant access to all required secrets
for SECRET in db-user db-password access-token dropbox-token; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Allow Node.js to invoke Python service
gcloud run services add-iam-policy-binding python-pipeline \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 5.3 Deploy to Cloud Run

```bash
# Get Python service URL
PYTHON_URL=$(gcloud run services describe python-pipeline \
  --region=us-central1 --format="value(status.url)")

# Deploy Node.js service
gcloud run deploy node-server \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="PORT=8080" \
  --set-env-vars="DB_HOST=/cloudsql/${docmosis-tornado}:us-central1:legal-forms-db" \
  --set-env-vars="DB_NAME=legal_forms_db" \
  --set-env-vars="DB_PORT=5432" \
  --set-env-vars="PIPELINE_API_URL=${PYTHON_URL}" \
  --set-env-vars="PIPELINE_API_ENABLED=true" \
  --set-env-vars="PIPELINE_API_TIMEOUT=300000" \
  --set-env-vars="DROPBOX_ENABLED=true" \
  --set-secrets="DB_USER=db-user:latest" \
  --set-secrets="DB_PASSWORD=db-password:latest" \
  --set-secrets="ACCESS_TOKEN=access-token:latest" \
  --set-secrets="DROPBOX_ACCESS_TOKEN=dropbox-token:latest" \
  --add-cloudsql-instances=${docmosis-tornado}:us-central1:legal-forms-db \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0
```

### 5.4 Validation Checkpoint ✓

**Commands to verify:**

```bash
# 1. Check service status
gcloud run services describe node-server --region=us-central1 \
  --format="value(status.conditions[0].status)"

# 2. Get public URL
NODE_URL=$(gcloud run services describe node-server \
  --region=us-central1 --format="value(status.url)")
echo "Node.js Service URL: $NODE_URL"

# 3. Test public access (expects 401 - auth is required)
curl -i $NODE_URL

# 4. Test health endpoint (should work without auth)
curl -i $NODE_URL/health

# 5. Verify Cloud SQL connection configured
gcloud run services describe node-server --region=us-central1 \
  --format="value(spec.template.metadata.annotations)" | grep cloudsql

# 6. Check service configuration summary
gcloud run services describe node-server --region=us-central1 \
  --format="table(status.conditions[0].status,spec.template.spec.containers[0].resources.limits.memory,spec.template.spec.containers[0].resources.limits.cpu)"

# 7. View recent logs (workaround for gcloud CLI bug)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=node-server" \
  --limit=20 --format="table(timestamp,textPayload)" --project=docmosis-tornado
```

**Expected Output:**
- Service status: `True` (ready)
- Root endpoint (`/`): `401 Unauthorized` (correct - auth required)
- Health endpoint (`/health`): `200 OK` with healthy status JSON
- Cloud SQL annotation: `run.googleapis.com/cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db`
- Memory: `1Gi`, CPU: `1`
- Logs showing application startup (no critical errors)

**Database Connection Test:**

```bash
# Set access token
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"

# Test database query via API (using correct endpoint)
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Success: {data['success']}, Records: {data['count']}\")"
```

**Expected**: `Success: True, Records: <number>` (proves database connectivity working)

**Database Write Test (Form Submission):**

```bash
# Test database write capability
echo "Testing form submission..."
curl -s -X POST "$NODE_URL/api/form-entries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "caseNumber": "PHASE5-VALIDATION",
    "caseTitle": "Phase 5 Deployment Test",
    "plaintiffName": "Test User",
    "streetAddress": "123 Cloud Run Street"
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Form Submission: {data.get('success', data)}\")"
```

**Expected**: `Form Submission: True` (proves database write working)

**Success Criteria:**
- ✅ Service publicly accessible
- ✅ Database connection working
- ✅ All secrets loaded correctly
- ✅ Health checks passing
- ✅ Can query database via API
- ✅ No startup errors in logs

**Go/No-Go Decision:**
- **GO**: Service running, DB connected, API responding → Proceed to Phase 6
- **NO-GO**: Cannot connect to database or service errors → Debug and fix

### 5.5 Rollback Procedure

```bash
# Delete Cloud Run service
gcloud run services delete node-server --region=us-central1 --quiet

# Revoke secret access (optional - keep for retry)
for SECRET in db-user db-password access-token dropbox-token; do
  gcloud secrets remove-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" || true
done
```

---

## Phase 6: End-to-End Integration Testing

**Duration**: 30-45 minutes
**Dependencies**: All previous phases (1-5)

### 6.1 Functional Tests

**Test 1: Form Submission (Read-Only - No Document Generation)**

```bash
# Get Node.js URL
NODE_URL=$(gcloud run services describe node-server \
  --region=us-central1 --format="value(status.url)")

# Submit test form data
cat > /tmp/test_form.json <<'EOF'
{
  "caseNumber": "TEST-001",
  "caseTitle": "Test Case",
  "parties": [
    {
      "name": "John Doe",
      "type": "plaintiff"
    }
  ]
}
EOF

# Submit without pipeline (database only)
curl -X POST "$NODE_URL/api/form-entries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4" \
  -d @/tmp/test_form.json
```

**Expected**: `200 OK` with case ID returned

**Test 2: Verify Database Insert**

```bash
# Query the case we just created
curl -X GET "$NODE_URL/api/cases?case_number=TEST-001" \
  -H "Authorization: Bearer a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"
```

**Expected**: Returns case with matching case_number

**Test 3: Python Pipeline Connectivity**

```bash
# Test if Node can call Python service
curl -X POST "$NODE_URL/api/test/pipeline" \
  -H "Authorization: Bearer a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"
```

**Expected**: 200 OK or successful pipeline response

**Test 4: Full End-to-End (WITH Document Generation)**

⚠️ **WARNING**: This will generate actual documents via Docmosis

```bash
# Submit form with pipeline enabled
curl -X POST "$NODE_URL/api/form-entries?enable_pipeline=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4" \
  -d @/tmp/test_form.json \
  -v
```

**Expected**:
- Request completes within 60 seconds
- Response: 200 OK with document generation summary
- Docmosis generates document successfully

**Monitor logs during test:**

```bash
# Terminal 1: Node.js logs
gcloud run services logs tail node-server --region=us-central1

# Terminal 2: Python logs
gcloud run services logs tail python-pipeline --region=us-central1
```

### 6.2 Performance Tests

```bash
# Test response time
time curl -s -o /dev/null -w "Response time: %{time_total}s\n" \
  "$NODE_URL/health"

# Test concurrent requests (requires Apache Bench)
ab -n 100 -c 10 "$NODE_URL/health"
```

**Expected**:
- Health check: <200ms
- Concurrent requests: No errors, all 200 OK

### 6.3 Validation Checkpoint ✓

**Checklist:**

- [ ] Form submission saves to database
- [ ] Database queries return correct data
- [ ] Node.js can authenticate to Python service
- [ ] Python service can reach Docmosis VM
- [ ] Full pipeline executes without errors
- [ ] Documents generated successfully
- [ ] Response times acceptable (<5s for simple forms)
- [ ] No errors in logs during test
- [ ] Secrets loaded correctly (no plaintext in logs)
- [ ] Service-to-service auth working

**Success Criteria:**
- ✅ All 10 checks above passing
- ✅ End-to-end form submission works
- ✅ Documents generate via Docmosis
- ✅ Performance acceptable

**Go/No-Go Decision:**
- **GO**: All tests passing → Ready for production traffic
- **NO-GO**: Any test failing → Debug before going live

### 6.4 Troubleshooting Common Issues

**Issue: Node.js can't connect to database**

```bash
# Check Cloud SQL proxy connection
gcloud run services describe node-server --region=us-central1 \
  --format="value(spec.template.metadata.annotations)"

# Verify socket path
gcloud sql instances describe legal-forms-db \
  --format="value(connectionName)"

# Should match: DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db
```

**Issue: Node.js can't call Python service (403 Forbidden)**

```bash
# Verify IAM binding
gcloud run services get-iam-policy python-pipeline --region=us-central1

# Re-add invoker permission
gcloud run services add-iam-policy-binding python-pipeline \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**Issue: Python can't reach Docmosis**

```bash
# Check VPC connector
gcloud run services describe python-pipeline --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)" | grep VPC

# Test from Cloud Shell (create test VM in same VPC)
gcloud compute ssh test-vm --zone=us-central1-c \
  --command="curl -v http://10.128.0.3:8080"
```

---

## Phase 7: Production Hardening (Optional but Recommended)

**Duration**: 30-45 minutes

### 7.1 Configure Custom Domain (Optional)
## Currently docs.liptonlegal.com is working as the domain as the front end for the docmosis tornado vm, using NGINX on the machine. I'd like to have docs.liptonlegal.com changed to be for the Form UI instead, and have a hidden /for looking at tornado and behind the currtain a littl e bit


```bash
# Map custom domain to Node.js service
gcloud run domain-mappings create \
  --service=node-server \
  --domain=forms.liptonlegal.com \
  --region=us-central1

# Follow instructions to add DNS records
```

### 7.2 Enable Cloud Armor (DDoS Protection)

```bash
# Create security policy
gcloud compute security-policies create legal-forms-policy \
  --description="Security policy for legal forms application"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=legal-forms-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600
```

### 7.3 Configure Monitoring & Alerts

```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="DevOps Team" \
  --type=email \
  --channel-labels=email_address=devops@liptonlegal.com

# Get channel ID
CHANNEL_ID=$(gcloud alpha monitoring channels list \
  --filter="displayName='DevOps Team'" \
  --format="value(name)")

# Alert on high error rate
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'

# Alert on high latency
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="High Latency" \
  --condition-threshold-value=5000 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"'
```

### 7.4 Validation Checkpoint ✓

**Verify:**

```bash
# Check domain mapping status
gcloud run domain-mappings describe --domain=forms.liptonlegal.com \
  --region=us-central1

# List monitoring policies
gcloud alpha monitoring policies list

# Test alert (trigger high latency)
# Monitor notifications
```

**Success Criteria:**
- ✅ Custom domain mapped (if configured)
- ✅ Security policies active
- ✅ Monitoring alerts configured
- ✅ Notification channels working

---

## Post-Deployment Checklist

**After all phases complete:**

- [ ] Document all service URLs
- [ ] Update DNS records (if using custom domain)
- [ ] Configure monitoring dashboards
- [ ] Set up log retention policies
- [ ] Schedule backup verification
- [ ] Create runbook for common operations
- [ ] Train team on GCP Console access
- [ ] Set up billing alerts
- [ ] Configure access controls (IAM)
- [ ] Create disaster recovery plan

---

## Quick Reference

### Service URLs

```bash
# Get all service URLs
echo "Node.js (Public): $(gcloud run services describe node-server --region=us-central1 --format='value(status.url)')"
echo "Python (Internal): $(gcloud run services describe python-pipeline --region=us-central1 --format='value(status.url)')"
echo "Database: ${docmosis-tornado}:us-central1:legal-forms-db"
```

### Common Commands

```bash
# View logs
gcloud run services logs tail node-server --region=us-central1
gcloud run services logs tail python-pipeline --region=us-central1

# Update service
gcloud run services update node-server --region=us-central1 --set-env-vars="KEY=VALUE"

# Scale service
gcloud run services update node-server --region=us-central1 --max-instances=20

# Connect to database
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

### Rollback Everything

```bash
# WARNING: This deletes ALL deployed resources

# Delete Cloud Run services
gcloud run services delete node-server --region=us-central1 --quiet
gcloud run services delete python-pipeline --region=us-central1 --quiet

# Delete VPC Connector
gcloud compute networks vpc-access connectors delete legal-forms-connector \
  --region=us-central1 --quiet

# Delete Cloud SQL
gcloud sql instances delete legal-forms-db --quiet

# Delete secrets
gcloud secrets delete db-user --quiet
gcloud secrets delete db-password --quiet
gcloud secrets delete access-token --quiet
gcloud secrets delete docmosis-key --quiet
gcloud secrets delete dropbox-token --quiet

# Delete firewall rule
gcloud compute firewall-rules delete allow-cloudrun-to-docmosis --quiet
```

---

## Summary

This phased deployment plan ensures:

1. **Security First**: Secrets created before any services
2. **Incremental Validation**: Each phase validated before proceeding
3. **Clear Checkpoints**: Explicit go/no-go decisions
4. **Rollback Ready**: Every phase has documented rollback
5. **Production Quality**: Comprehensive testing before live traffic

**Total Estimated Time**: 3-4 hours with validation

**Next Steps After Deployment**:
- Monitor logs for first 24 hours
- Verify automated backups running
- Test disaster recovery procedures
- Optimize resource allocation based on traffic
- Implement async processing with Pub/Sub (optional)

---

## Appendix: Validation Script

Create automated validation script:

```bash
#!/bin/bash
# validation.sh - Automated deployment validation

set -e

docmosis-tornado=$(gcloud config get-value project)
REGION="us-central1"

echo "=== Phase 1: Secrets Validation ==="
for SECRET in db-user db-password access-token docmosis-key; do
  gcloud secrets versions access latest --secret=$SECRET > /dev/null && \
    echo "✅ Secret $SECRET exists" || \
    echo "❌ Secret $SECRET missing"
done

echo ""
echo "=== Phase 2: Database Validation ==="
STATE=$(gcloud sql instances describe legal-forms-db --format="value(state)")
if [ "$STATE" == "RUNNABLE" ]; then
  echo "✅ Database running"
else
  echo "❌ Database not ready: $STATE"
fi

echo ""
echo "=== Phase 3: Network Validation ==="
CONNECTOR_STATE=$(gcloud compute networks vpc-access connectors describe legal-forms-connector \
  --region=$REGION --format="value(state)")
if [ "$CONNECTOR_STATE" == "READY" ]; then
  echo "✅ VPC Connector ready"
else
  echo "❌ VPC Connector not ready: $CONNECTOR_STATE"
fi

echo ""
echo "=== Phase 4: Python Service Validation ==="
PYTHON_STATUS=$(gcloud run services describe python-pipeline --region=$REGION \
  --format="value(status.conditions[0].status)")
if [ "$PYTHON_STATUS" == "True" ]; then
  echo "✅ Python service running"
else
  echo "❌ Python service not ready"
fi

echo ""
echo "=== Phase 5: Node Service Validation ==="
NODE_STATUS=$(gcloud run services describe node-server --region=$REGION \
  --format="value(status.conditions[0].status)")
if [ "$NODE_STATUS" == "True" ]; then
  echo "✅ Node.js service running"
  NODE_URL=$(gcloud run services describe node-server --region=$REGION --format="value(status.url)")
  echo "   URL: $NODE_URL"
else
  echo "❌ Node.js service not ready"
fi

echo ""
echo "=== Phase 6: End-to-End Test ==="
if [ ! -z "$NODE_URL" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$NODE_URL/health")
  if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Health check passed"
  else
    echo "❌ Health check failed: HTTP $HTTP_CODE"
  fi
fi

echo ""
echo "=== Validation Complete ==="
```

Save and run:

```bash
chmod +x validation.sh
./validation.sh
```
