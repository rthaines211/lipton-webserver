# 🌐 GCP CLOUD RUN DEPLOYMENT GUIDE FOR REFACTORING

**Document Version:** 1.0
**Date:** October 23, 2025
**Purpose:** GCP-specific guidance for deploying refactored codebase
**Related Documents:**
- [REFACTORING_PLAN.md](REFACTORING_PLAN.md) - Main refactoring plan
- [REFACTORING_IMPACT_ANALYSIS.md](REFACTORING_IMPACT_ANALYSIS.md) - Business impact analysis

---

## 🎯 EXECUTIVE SUMMARY

This document provides **comprehensive GCP Cloud Run deployment guidance** for the refactored Lipton Webserver application. The refactoring plan in [REFACTORING_PLAN.md](REFACTORING_PLAN.md) outlines code changes, but **every phase must be deployable to your existing GCP infrastructure**.

### Current Production Environment:

| Component | Value |
|-----------|-------|
| **Platform** | Google Cloud Run (Serverless) |
| **Project ID** | docmosis-tornado |
| **Project Number** | 945419684329 |
| **Region** | us-central1 |
| **Service Name** | node-server |
| **Service URL** | https://node-server-zyiwmzwenq-uc.a.run.app |
| **Database** | Cloud SQL PostgreSQL (legal-forms-db) |
| **Connection** | Unix socket via Cloud SQL Proxy |
| **Secrets** | Secret Manager (DB_PASSWORD, ACCESS_TOKEN) |
| **Storage** | Cloud Storage (docmosis-tornado-form-submissions) |

---

## 📋 CRITICAL: REFACTORING MUST NOT BREAK GCP DEPLOYMENT

### Non-Negotiable Requirements:

✅ **Every refactoring phase must deploy successfully to Cloud Run**
✅ **Dockerfile must build with new module structure**
✅ **Environment variables and secrets must work unchanged**
✅ **Cloud SQL connection via Unix socket must work**
✅ **Port 8080 binding must be maintained**
✅ **Deployment script [deploy-to-cloud-run.sh](deploy-to-cloud-run.sh) must work**

---

## 🔧 PHASE-BY-PHASE GCP DEPLOYMENT GUIDE

---

## 📦 PHASE 1: MODULE DECOMPOSITION - GCP DEPLOYMENT

### Current Deployment (Before Refactoring):

**Entry Point:** `CMD ["node", "server.js"]` in [Dockerfile](Dockerfile)
**Result:** Cloud Run runs monolithic [server.js](server.js) (2,576 lines)

### Target Deployment (After Refactoring):

**Entry Point:** `CMD ["node", "server/index.js"]` in [Dockerfile](Dockerfile)
**Result:** Cloud Run runs modular [server/index.js](server/index.js) (~150 lines)

---

### Step 1.1: Update Dockerfile

**File:** [Dockerfile](Dockerfile)

**Current:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]  # ← OLD ENTRY POINT
```

**Updated:**
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
# IMPORTANT: This copies the new server/ directory structure
COPY . .

# Expose Cloud Run standard port
EXPOSE 8080

# NEW: Updated entry point for modular structure
CMD ["node", "server/index.js"]
```

**Verification:**
```bash
# Test Docker build locally
docker build -t node-server-test .

# Test container runs
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=development \
  -e DB_HOST=localhost \
  node-server-test

# Should see: Server listening on port 8080
```

---

### Step 1.2: Ensure Module Structure is Docker-Friendly

**Directory Structure to Copy:**
```
/app/  (Docker WORKDIR)
├── server/
│   ├── index.js             ← Entry point
│   ├── config/
│   │   └── app-config.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── error-handler.js
│   ├── routes/
│   │   ├── form-routes.js
│   │   ├── health-routes.js
│   │   └── static-routes.js
│   ├── services/
│   │   ├── database-service.js
│   │   ├── dropbox-service.js
│   │   ├── transformation-service.js
│   │   ├── validation-service.js
│   │   └── sse-service.js
│   └── utils/
│       ├── key-mapping.json
│       └── logger.js
├── js/                       ← Frontend files
├── monitoring/               ← Monitoring modules
├── node_modules/             ← Dependencies (built in container)
├── package.json
└── ...
```

**Critical:** All modules must use **relative paths** or **absolute paths from /app/**

**Example ([server/index.js](server/index.js)):**
```javascript
// ✅ CORRECT: Relative paths
const authMiddleware = require('./middleware/auth');
const formRoutes = require('./routes/form-routes');
const dbService = require('./services/database-service');

// ✅ CORRECT: Absolute paths from /app
const keyMapping = require('/app/server/utils/key-mapping.json');

// ❌ WRONG: Paths that assume different working directory
const config = require('../../config/app-config');  // May break in Docker
```

---

### Step 1.3: Deploy to Cloud Run Staging

**Create Staging Service:**
```bash
#!/bin/bash
# deploy-to-staging.sh

set -e

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server-staging"

echo "Deploying refactored Phase 1 to staging..."

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=3 \
  --min-instances=0 \
  --port=8080 \
  --set-env-vars="NODE_ENV=staging,GCS_BUCKET_NAME=docmosis-tornado-form-submissions" \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest" \
  --set-cloudsql-instances="docmosis-tornado:us-central1:legal-forms-db" \
  --service-account="945419684329-compute@developer.gserviceaccount.com" \
  --project="${PROJECT_ID}"

# Get staging URL
STAGING_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo "✅ Staging deployed: ${STAGING_URL}"

# Run smoke tests
echo "Running smoke tests..."
curl -s "${STAGING_URL}/health" | jq
curl -s "${STAGING_URL}/api/health/db" | jq

echo "✅ Phase 1 staging deployment complete!"
```

**Run:**
```bash
chmod +x deploy-to-staging.sh
./deploy-to-staging.sh
```

---

### Step 1.4: Validate Staging Deployment

**Automated Validation Script:**
```bash
#!/bin/bash
# validate-staging.sh

STAGING_URL="https://node-server-staging-HASH-uc.a.run.app"  # Replace with actual

echo "Validating staging deployment..."

# Test 1: Health check
echo "1. Testing /health endpoint..."
HEALTH=$(curl -s "${STAGING_URL}/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

# Test 2: Database health
echo "2. Testing /api/health/db endpoint..."
DB_HEALTH=$(curl -s "${STAGING_URL}/api/health/db")
if echo "$DB_HEALTH" | grep -q "connected"; then
  echo "✅ Database health check passed"
else
  echo "❌ Database health check failed"
  exit 1
fi

# Test 3: Static file serving
echo "3. Testing static file serving..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Static file serving works"
else
  echo "❌ Static file serving failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Test 4: API endpoint (requires auth token)
echo "4. Testing API endpoint with authentication..."
ACCESS_TOKEN="a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4"
API_TEST=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "${STAGING_URL}/api/form-entries")
if [ $? -eq 0 ]; then
  echo "✅ API endpoint accessible"
else
  echo "❌ API endpoint failed"
  exit 1
fi

# Test 5: Check logs for errors
echo "5. Checking logs for errors..."
ERROR_COUNT=$(gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --project=docmosis-tornado \
  --limit=50 \
  --format="value(textPayload)" 2>/dev/null | grep -i "error" | wc -l || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ No errors in recent logs"
else
  echo "⚠️  Found $ERROR_COUNT error entries in logs"
fi

echo ""
echo "✅ All validation checks passed!"
echo "Ready to deploy to production."
```

---

### Step 1.5: Deploy to Production (Canary Rollout)

**Canary Deployment Strategy:**
```bash
#!/bin/bash
# deploy-to-production-canary.sh

set -e

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo "====================================="
echo "CANARY DEPLOYMENT TO PRODUCTION"
echo "====================================="
echo ""

# Step 1: Deploy new revision (but don't send traffic yet)
echo "Step 1: Deploying new revision (0% traffic)..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region="${REGION}" \
  --platform=managed \
  --no-traffic \
  --tag=canary \
  --project="${PROJECT_ID}"

NEW_REVISION=$(gcloud run revisions list \
  --service="${SERVICE_NAME}" \
  --region="${REGION}" \
  --format="value(name)" \
  --limit=1)

echo "✅ New revision deployed: ${NEW_REVISION}"
echo ""

# Step 2: Send 10% traffic to canary
echo "Step 2: Routing 10% traffic to canary..."
gcloud run services update-traffic "${SERVICE_NAME}" \
  --to-revisions="${NEW_REVISION}=10" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo "⏳ Monitoring canary for 10 minutes..."
sleep 600

# Check error rate
ERROR_RATE=$(gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND severity>=ERROR" \
  --limit=100 \
  --format="value(severity)" \
  --freshness=10m | wc -l)

if [ "$ERROR_RATE" -gt 5 ]; then
  echo "❌ High error rate detected ($ERROR_RATE errors). Rolling back!"
  gcloud run services update-traffic "${SERVICE_NAME}" \
    --to-revisions="${NEW_REVISION}=0" \
    --region="${REGION}" \
    --project="${PROJECT_ID}"
  exit 1
fi

echo "✅ Canary looks healthy (error rate: $ERROR_RATE)"
echo ""

# Step 3: Send 50% traffic
echo "Step 3: Routing 50% traffic to canary..."
gcloud run services update-traffic "${SERVICE_NAME}" \
  --to-revisions="${NEW_REVISION}=50" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo "⏳ Monitoring for 10 minutes..."
sleep 600

# Step 4: Send 100% traffic
echo "Step 4: Routing 100% traffic to new revision..."
gcloud run services update-traffic "${SERVICE_NAME}" \
  --to-latest \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo ""
echo "====================================="
echo "✅ CANARY DEPLOYMENT COMPLETE"
echo "====================================="
echo ""
echo "New revision serving 100% of traffic: ${NEW_REVISION}"
echo ""
echo "Monitor logs:"
echo "  gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --follow"
```

---

### Step 1.6: Rollback Procedure (If Needed)

**Quick Rollback to Previous Revision:**
```bash
#!/bin/bash
# rollback-production.sh

set -e

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo "ROLLING BACK TO PREVIOUS REVISION..."

# Get previous revision (second in list)
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service="${SERVICE_NAME}" \
  --region="${REGION}" \
  --format="value(name)" \
  --limit=2 | tail -n 1)

echo "Previous revision: ${PREVIOUS_REVISION}"

# Route 100% traffic to previous revision
gcloud run services update-traffic "${SERVICE_NAME}" \
  --to-revisions="${PREVIOUS_REVISION}=100" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo "✅ Rollback complete. Serving previous revision."
```

---

## 📂 PHASE 2: ELIMINATE DUPLICATION - GCP DEPLOYMENT

### GCP Impact: Minimal

**Changes:**
- Delete [form-submission.js](form-submission.js) (root)
- Delete [sse-client.js](sse-client.js) (root)
- Keep [js/form-submission.js](js/form-submission.js) and [js/sse-client.js](js/sse-client.js)

**Dockerfile:** No changes needed

**Deployment:**
```bash
# Quick deployment (files removed don't affect backend)
./deploy-to-cloud-run.sh
```

**Validation:**
```bash
# Verify static files still load
curl -s https://node-server-zyiwmzwenq-uc.a.run.app/js/form-submission.js | head -n 5

# Should return JavaScript code, not 404
```

---

## 🧪 PHASE 3: TESTING - GCP CI/CD INTEGRATION

### Step 3.1: Create Cloud Build Configuration

**File:** [cloudbuild.yaml](cloudbuild.yaml)

```yaml
# Cloud Build configuration for automated testing and deployment
# Triggered on git push to main branch

steps:
  # ===========================================
  # STEP 1: Install Dependencies
  # ===========================================
  - name: 'node:20'
    id: 'install-deps'
    entrypoint: 'npm'
    args: ['ci']

  # ===========================================
  # STEP 2: Run Unit Tests
  # ===========================================
  - name: 'node:20'
    id: 'unit-tests'
    entrypoint: 'npm'
    args: ['run', 'test:unit']
    env:
      - 'NODE_ENV=test'

  # ===========================================
  # STEP 3: Run Integration Tests
  # ===========================================
  - name: 'node:20'
    id: 'integration-tests'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    env:
      - 'NODE_ENV=test'
      - 'DB_HOST=localhost'
      - 'DB_NAME=test_db'
      - 'DB_USER=test_user'
      - 'DB_PASSWORD=test_password'
    waitFor: ['install-deps']

  # ===========================================
  # STEP 4: Build Docker Image
  # ===========================================
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-image'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/node-server:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/node-server:latest'
      - '.'
    waitFor: ['unit-tests', 'integration-tests']

  # ===========================================
  # STEP 5: Push Image to Container Registry
  # ===========================================
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-image'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/node-server:$COMMIT_SHA'
    waitFor: ['build-image']

  # ===========================================
  # STEP 6: Deploy to Cloud Run (Staging)
  # ===========================================
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-staging'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'node-server-staging'
      - '--image=gcr.io/$PROJECT_ID/node-server:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--memory=1Gi'
      - '--cpu=1'
      - '--timeout=300'
      - '--max-instances=3'
      - '--port=8080'
      - '--set-env-vars=NODE_ENV=staging,GCS_BUCKET_NAME=docmosis-tornado-form-submissions'
      - '--set-secrets=DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest'
      - '--set-cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db'
      - '--service-account=945419684329-compute@developer.gserviceaccount.com'
    waitFor: ['push-image']

  # ===========================================
  # STEP 7: Run E2E Tests Against Staging
  # ===========================================
  - name: 'mcr.microsoft.com/playwright:v1.40.0-jammy'
    id: 'e2e-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install
        export BASE_URL=$(gcloud run services describe node-server-staging --region=us-central1 --format='value(status.url)')
        npm run test:e2e
    env:
      - 'CI=true'
    waitFor: ['deploy-staging']

  # ===========================================
  # STEP 8: Deploy to Production (Manual Approval)
  # ===========================================
  # NOTE: This step requires manual approval in Cloud Build UI
  # Uncomment when ready for automated production deployments

  # - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  #   id: 'deploy-production'
  #   entrypoint: 'gcloud'
  #   args:
  #     - 'run'
  #     - 'deploy'
  #     - 'node-server'
  #     - '--image=gcr.io/$PROJECT_ID/node-server:$COMMIT_SHA'
  #     - '--region=us-central1'
  #     - '--platform=managed'
  #   waitFor: ['e2e-tests']

# Images to push to Container Registry
images:
  - 'gcr.io/$PROJECT_ID/node-server:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/node-server:latest'

# Build timeout (20 minutes)
timeout: '1200s'

# Options
options:
  machineType: 'E2_HIGHCPU_8'  # Faster builds
  logging: CLOUD_LOGGING_ONLY
```

---

### Step 3.2: Create Cloud Build Trigger

**Via gcloud CLI:**
```bash
gcloud builds triggers create github \
  --name="node-server-ci-cd" \
  --repo-name="lipton-webserver" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region="us-central1" \
  --project="docmosis-tornado"
```

**Via Console:**
1. Go to https://console.cloud.google.com/cloud-build/triggers
2. Click "CREATE TRIGGER"
3. Connect your GitHub repository
4. Set:
   - **Name**: node-server-ci-cd
   - **Event**: Push to branch
   - **Branch**: ^main$
   - **Configuration**: Cloud Build configuration file
   - **Location**: /cloudbuild.yaml

---

### Step 3.3: Update package.json Scripts

**File:** [package.json](package.json)

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",

    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",

    "build": "node build.js",
    "lint": "eslint server/ js/",
    "format": "prettier --write \"server/**/*.js\" \"js/**/*.js\"",

    "gcp:deploy:staging": "./deploy-to-staging.sh",
    "gcp:deploy:production": "./deploy-to-cloud-run.sh",
    "gcp:validate:staging": "./validate-staging.sh",
    "gcp:rollback": "./rollback-production.sh"
  }
}
```

---

## ⚙️ PHASE 4: CONFIGURATION - GCP SECRET MANAGER INTEGRATION

### Step 4.1: Install Google Cloud Secret Manager SDK

**Add to package.json:**
```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^5.0.0"
  }
}
```

**Install:**
```bash
npm install @google-cloud/secret-manager
```

---

### Step 4.2: Update Configuration Loader for Secret Manager

**File:** [server/config/app-config.js](server/config/app-config.js)

```javascript
/**
 * Centralized Configuration Loader with GCP Secret Manager Support
 *
 * Configuration Priority (highest to lowest):
 * 1. GCP Secret Manager (production only)
 * 2. Environment Variables (.env file)
 * 3. Config files (config/production.json, config/default.json)
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

class AppConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.gcpProject = process.env.GCP_PROJECT || 'docmosis-tornado';
    this.secretClient = null;

    // Initialize Secret Manager client in production
    if (this.env === 'production' && process.env.K_SERVICE) {
      // K_SERVICE env var is set by Cloud Run
      this.secretClient = new SecretManagerServiceClient();
    }

    this.config = null;
  }

  /**
   * Load a secret from GCP Secret Manager
   */
  async loadSecret(secretName) {
    if (!this.secretClient) {
      return null;  // Not in GCP environment
    }

    try {
      const [version] = await this.secretClient.accessSecretVersion({
        name: `projects/${this.gcpProject}/secrets/${secretName}/versions/latest`
      });

      return version.payload.data.toString('utf8');
    } catch (error) {
      console.error(`Failed to load secret ${secretName}:`, error.message);
      return null;
    }
  }

  /**
   * Load configuration from all sources
   */
  async load() {
    if (this.config) {
      return this.config;  // Already loaded
    }

    // Load default config file
    const defaultConfig = this.loadConfigFile('default.json');

    // Load environment-specific config file
    const envConfig = this.loadConfigFile(`${this.env}.json`);

    // Load from environment variables
    const envVarConfig = this.loadFromEnvVars();

    // Load secrets from Secret Manager (production only)
    let secretsConfig = {};
    if (this.secretClient) {
      secretsConfig = await this.loadFromSecretManager();
    }

    // Merge configs (later sources override earlier)
    this.config = this.deepMerge(
      defaultConfig,
      envConfig,
      envVarConfig,
      secretsConfig
    );

    // Validate configuration
    this.validate();

    return this.config;
  }

  /**
   * Load secrets from GCP Secret Manager
   */
  async loadFromSecretManager() {
    console.log('Loading secrets from GCP Secret Manager...');

    const dbPassword = await this.loadSecret('DB_PASSWORD');
    const accessToken = await this.loadSecret('ACCESS_TOKEN');
    const dropboxToken = await this.loadSecret('DROPBOX_ACCESS_TOKEN');

    return {
      database: {
        password: dbPassword || process.env.DB_PASSWORD
      },
      server: {
        accessToken: accessToken || process.env.ACCESS_TOKEN
      },
      dropbox: {
        accessToken: dropboxToken || process.env.DROPBOX_ACCESS_TOKEN
      }
    };
  }

  /**
   * Load config from JSON file
   */
  loadConfigFile(filename) {
    const filePath = path.join(__dirname, '../../config', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
  }

  /**
   * Load config from environment variables
   */
  loadFromEnvVars() {
    return {
      server: {
        port: parseInt(process.env.PORT) || undefined,
        environment: process.env.NODE_ENV,
        accessToken: process.env.ACCESS_TOKEN
      },
      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || undefined,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      },
      features: {
        dropboxEnabled: process.env.DROPBOX_ENABLED === 'true',
        pipelineEnabled: process.env.PIPELINE_API_ENABLED === 'true'
      },
      dropbox: {
        accessToken: process.env.DROPBOX_ACCESS_TOKEN,
        basePath: process.env.DROPBOX_BASE_PATH
      },
      pipeline: {
        apiUrl: process.env.PIPELINE_API_URL,
        timeout: parseInt(process.env.PIPELINE_API_TIMEOUT) || undefined
      },
      gcp: {
        projectId: process.env.GCP_PROJECT,
        bucketName: process.env.GCS_BUCKET_NAME,
        cloudSqlConnection: process.env.CLOUD_SQL_CONNECTION_NAME
      }
    };
  }

  /**
   * Validate configuration against schema
   */
  validate() {
    const schemaPath = path.join(__dirname, '../../config/schema.json');
    if (!fs.existsSync(schemaPath)) {
      console.warn('Config schema not found, skipping validation');
      return;
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    if (!validate(this.config)) {
      const errors = validate.errors
        .map(e => `${e.instancePath} ${e.message}`)
        .join('\n');
      throw new Error(`Configuration validation failed:\n${errors}`);
    }

    console.log('✅ Configuration validated successfully');
  }

  /**
   * Deep merge objects
   */
  deepMerge(...objects) {
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = merge(target[key] || {}, source[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
      return target;
    };

    return objects.reduce((acc, obj) => merge(acc, obj), {});
  }

  /**
   * Get config value by dot-notation path
   */
  get(path) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }
}

// Singleton instance
let configInstance = null;

/**
 * Get or create config instance
 * Async function since Secret Manager calls are async
 */
async function getConfig() {
  if (!configInstance) {
    configInstance = new AppConfig();
    await configInstance.load();
  }
  return configInstance;
}

module.exports = { getConfig };
```

---

### Step 4.3: Update Server Entry Point

**File:** [server/index.js](server/index.js)

```javascript
/**
 * Main Server Entry Point
 * Now with async configuration loading
 */

const express = require('express');
const { getConfig } = require('./config/app-config');

async function startServer() {
  // Load configuration (includes Secret Manager in production)
  const config = await getConfig();

  const app = express();

  // ... middleware, routes, etc.

  const port = config.get('server.port') || 8080;
  app.listen(port, () => {
    console.log(`✅ Server listening on port ${port}`);
    console.log(`   Environment: ${config.get('server.environment')}`);
    console.log(`   Database: ${config.get('database.host')}/${config.get('database.name')}`);
  });
}

// Start server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

---

### Step 4.4: Deploy with Secret Manager Integration

**Deployment Command (unchanged):**
```bash
gcloud run deploy node-server \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --set-secrets="DB_PASSWORD=DB_PASSWORD:latest,ACCESS_TOKEN=ACCESS_TOKEN:latest" \
  --project=docmosis-tornado
```

**Cloud Run automatically:**
- ✅ Mounts secrets as environment variables
- ✅ Grants service account access to secrets
- ✅ Refreshes secrets when new versions are added

**Verify Secret Access:**
```bash
# Test that service account can access secrets
gcloud secrets versions access latest \
  --secret=DB_PASSWORD \
  --project=docmosis-tornado \
  --impersonate-service-account="945419684329-compute@developer.gserviceaccount.com"
```

---

## 🚀 PHASE 5: OPTIMIZATION - GCP PERFORMANCE TUNING

### Step 5.1: Cloud SQL Connection Pool Optimization

**File:** [server/services/database-service.js](server/services/database-service.js)

```javascript
/**
 * Database Service with Cloud Run Optimizations
 */

const { Pool } = require('pg');
const { getConfig } = require('../config/app-config');

let pool = null;

async function getPool() {
  if (pool) {
    return pool;
  }

  const config = await getConfig();
  const isCloudRun = process.env.K_SERVICE !== undefined;

  pool = new Pool({
    // Cloud Run uses Unix socket for Cloud SQL
    ...(isCloudRun ? {
      host: `/cloudsql/${config.get('gcp.cloudSqlConnection')}`,
    } : {
      host: config.get('database.host'),
      port: config.get('database.port'),
    }),

    database: config.get('database.name'),
    user: config.get('database.user'),
    password: config.get('database.password'),

    // Cloud Run specific optimizations
    max: isCloudRun ? 5 : 10,  // Lower pool size for serverless
    min: 1,  // Keep 1 connection warm
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 10000,  // Fail fast

    // Enable statement timeout (prevent long-running queries)
    statement_timeout: 30000,  // 30 seconds

    // Enable query timeout
    query_timeout: 30000,
  });

  // Log pool events (for monitoring)
  pool.on('connect', () => {
    console.log('Database connection established');
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  return pool;
}

module.exports = { getPool };
```

**Why these settings?**
- **Lower max connections (5)**: Cloud Run instances scale horizontally, so each instance only needs a few connections
- **Keep 1 warm**: Prevents cold start latency on first query
- **Short timeouts**: Fail fast instead of hanging (important for serverless)

---

### Step 5.2: Enable HTTP/2 and Compression

**Cloud Run automatically provides:**
- ✅ HTTP/2 support
- ✅ TLS/SSL termination
- ✅ Brotli compression

**In your Express app:**
```javascript
const compression = require('compression');

// Enable gzip compression for responses
app.use(compression());
```

---

### Step 5.3: Serve Static Files from Cloud Storage CDN

**Current:** Static files served by Node.js Express
**Optimized:** Static files served by Cloud Storage + Cloud CDN

**Upload static files to Cloud Storage:**
```bash
#!/bin/bash
# upload-static-assets.sh

BUCKET="gs://docmosis-tornado-static-assets"
LOCAL_DIR="./js"

# Create bucket (if not exists)
gsutil mb -p docmosis-tornado -c STANDARD -l us-central1 "$BUCKET" 2>/dev/null || true

# Upload with caching headers
gsutil -m rsync -r \
  -x ".*\.map$" \
  "$LOCAL_DIR" \
  "$BUCKET/js/"

# Set cache headers (1 year for immutable assets)
gsutil -m setmeta \
  -h "Cache-Control:public, max-age=31536000, immutable" \
  "$BUCKET/js/**"

# Make publicly accessible
gsutil iam ch allUsers:objectViewer "$BUCKET"

echo "✅ Static assets uploaded to: https://storage.googleapis.com/docmosis-tornado-static-assets/js/"
```

**Update HTML to reference CDN:**
```html
<!-- Before -->
<script src="/js/form-submission.js"></script>

<!-- After -->
<script src="https://storage.googleapis.com/docmosis-tornado-static-assets/js/form-submission.js"></script>
```

---

## 📊 MONITORING & OBSERVABILITY

### Cloud Run Built-in Metrics

**Access via Cloud Console:**
- https://console.cloud.google.com/run/detail/us-central1/node-server/metrics

**Key Metrics:**
- **Request Count** - Total requests per minute
- **Request Latency** - p50, p95, p99 response times
- **Error Rate** - 4xx and 5xx errors
- **Container Instance Count** - Active instances
- **CPU Utilization** - CPU usage per instance
- **Memory Utilization** - Memory usage per instance

**Set up Alerts:**
```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Cloud Run High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
```

---

## 🔒 SECURITY CHECKLIST

### Cloud Run Security Best Practices

✅ **Use least-privilege service account**
```bash
# Create dedicated service account
gcloud iam service-accounts create node-server-sa \
  --display-name="Node Server Service Account"

# Grant only required permissions
gcloud projects add-iam-policy-binding docmosis-tornado \
  --member="serviceAccount:node-server-sa@docmosis-tornado.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding docmosis-tornado \
  --member="serviceAccount:node-server-sa@docmosis-tornado.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with custom service account
gcloud run deploy node-server \
  --service-account="node-server-sa@docmosis-tornado.iam.gserviceaccount.com"
```

✅ **Store secrets in Secret Manager** (not environment variables)

✅ **Enable Cloud Armor** (DDoS protection)

✅ **Use VPC Connector** for private resources

✅ **Enable Binary Authorization** (signed container images only)

---

## 📋 FINAL DEPLOYMENT CHECKLIST

Before deploying each refactoring phase to production:

### Pre-Deployment
- [ ] All tests passing in CI/CD
- [ ] Dockerfile builds successfully
- [ ] Deployed to staging and validated
- [ ] Load tested (if performance-critical changes)
- [ ] Rollback script tested
- [ ] Team notified of deployment window

### During Deployment
- [ ] Deploy with `--no-traffic` first (canary)
- [ ] Route 10% traffic and monitor for 10 minutes
- [ ] Check error rates and latency
- [ ] Route 50% traffic and monitor for 10 minutes
- [ ] Route 100% traffic

### Post-Deployment
- [ ] Monitor logs for 30 minutes
- [ ] Verify health checks passing
- [ ] Test critical user journeys
- [ ] Check database connections stable
- [ ] Verify Secret Manager access working
- [ ] Keep previous revision live for 24 hours before deleting

---

## 🆘 TROUBLESHOOTING

### Common GCP Deployment Issues

#### Issue 1: "Secret not found" Error
**Symptom:** Service fails to start, logs show "Secret DB_PASSWORD not found"

**Solution:**
```bash
# Verify secret exists
gcloud secrets list --project=docmosis-tornado

# Grant service account access
gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Issue 2: Cloud SQL Connection Timeout
**Symptom:** "Connection timeout" errors in logs

**Solution:**
```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe legal-forms-db --project=docmosis-tornado

# Check connection string is correct
gcloud run services describe node-server \
  --region=us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"

# Should show: --set-cloudsql-instances=docmosis-tornado:us-central1:legal-forms-db
```

#### Issue 3: Module Not Found
**Symptom:** "Cannot find module './server/index.js'" error

**Solution:**
```bash
# Verify Dockerfile CMD points to correct entry point
cat Dockerfile | grep CMD

# Should be: CMD ["node", "server/index.js"]

# Check file exists in built image
docker build -t test .
docker run test ls -la /app/server/
```

#### Issue 4: Port Binding Error
**Symptom:** "Error: listen EADDRINUSE"

**Solution:**
```javascript
// Ensure server listens on PORT env var (Cloud Run injects this)
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
```

---

## 📞 SUPPORT CONTACTS

**GCP Support:**
- Console: https://console.cloud.google.com/support
- Documentation: https://cloud.google.com/run/docs

**Project Specific:**
- Project ID: docmosis-tornado
- Project Number: 945419684329
- Region: us-central1

---

## ✅ CONCLUSION

This guide ensures that **every phase of the refactoring plan** can be successfully deployed to your existing GCP Cloud Run infrastructure. Key takeaways:

1. ✅ **Phase 1 requires Dockerfile update** - Entry point changes from `server.js` → `server/index.js`
2. ✅ **Phase 3 requires cloudbuild.yaml** - Automated CI/CD with Cloud Build
3. ✅ **Phase 4 requires Secret Manager SDK** - Centralized config with secrets
4. ✅ **Always deploy to staging first** - Validate before production
5. ✅ **Use canary deployments** - Gradual traffic migration reduces risk
6. ✅ **Keep rollback scripts ready** - Quick recovery if issues arise

**Next Steps:**
1. Review [REFACTORING_PLAN.md](REFACTORING_PLAN.md) for code changes
2. Follow this guide for GCP deployment at each phase
3. Use [deploy-to-cloud-run.sh](deploy-to-cloud-run.sh) for production deploys

---

**Document Maintained By:** DevOps Team
**Last Updated:** 2025-10-23
**Version:** 1.0
