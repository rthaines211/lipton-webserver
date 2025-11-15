# Cloud Run Deployment - Critical Fixes & Addendum

**Purpose:** Addresses production deployment issues identified in the revised implementation plan.

**Status:** 🔴 CRITICAL - Must implement before Week 1

---

## 🚨 CRITICAL ISSUE #1: Connection Pool Overflow

### Problem Identified:
```javascript
// REVISED PLAN (WRONG):
const pool = new Pool({
    max: 50  // ❌ WILL FAIL IN PRODUCTION
});

// Math:
// 50 connections × 10 Cloud Run instances = 500 total connections
// Cloud SQL default max_connections = 100
// Result: "FATAL: too many clients" errors immediately
```

### Root Cause:
- Cloud Run auto-scales to N instances under load
- Each instance creates its own connection pool
- Total connections = `max × instance_count`
- Exceeds Cloud SQL capacity → crashes

---

### ✅ SOLUTION: Dynamic Pool Sizing + Cloud SQL Upgrade

#### Fix #1: Reduce Pool Size Per Instance

**File: `/db/connection.js`** (CORRECTED)

```javascript
const { Pool } = require('pg');

// Calculate safe pool size based on Cloud Run environment
const getPoolSize = () => {
    // Production: Conservative pool size per instance
    // 5 connections × 20 instances (max autoscale) = 100 connections
    // Leaves 100 connections for staging, pgAdmin, etc.
    if (process.env.NODE_ENV === 'production') {
        return 5;
    }

    // Staging: Medium pool
    if (process.env.NODE_ENV === 'staging') {
        return 10;
    }

    // Development: Larger pool (single instance)
    return 20;
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,

    // ✅ CORRECTED: Dynamic pool sizing
    max: getPoolSize(),

    // Aggressive connection reaping to prevent leaks
    idleTimeoutMillis: 10000,  // 10 seconds (was 30s)
    connectionTimeoutMillis: 5000,  // 5 seconds (was 2s)

    // Add statement timeout
    statement_timeout: 30000,  // 30 seconds max per query

    // Enable keep-alive to prevent connection drops
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Pool error handling
pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client:', err);
    // Don't exit - let Cloud Run restart the instance
});

// Monitor pool health
pool.on('connect', (client) => {
    console.log('✅ New database connection established');
});

pool.on('acquire', (client) => {
    // Track active connections
    const activeCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;

    if (waitingCount > 0) {
        console.warn(`⚠️  Pool pressure: ${waitingCount} clients waiting for connection`);
    }
});

// Export pool stats for monitoring
function getPoolStats() {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        maxSize: pool.options.max
    };
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
    getPoolStats,  // For health checks
    checkHealth: async () => {
        try {
            const result = await pool.query('SELECT NOW(), current_database(), current_user');
            return {
                healthy: true,
                timestamp: result.rows[0].now,
                database: result.rows[0].current_database,
                user: result.rows[0].current_user,
                poolStats: getPoolStats()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                poolStats: getPoolStats()
            };
        }
    }
};
```

---

#### Fix #2: Upgrade Cloud SQL Instance

**Current Tier (Assumed):** `db-g1-small`
- Max connections: 100
- Memory: 1.7 GB
- Cost: ~$35/month

**Required Tier:** `db-custom-2-7680` (2 vCPU, 7.5 GB RAM)
- Max connections: 200 (configured)
- Memory: 7.5 GB
- Cost: ~$120/month

**Migration Command:**

```bash
# Week 0, Day 5: Upgrade Cloud SQL instance

# 1. Check current configuration
gcloud sql instances describe legal-forms-db \
    --format="value(settings.tier, settings.databaseFlags)"

# 2. Upgrade tier (includes automatic restart - schedule during low traffic)
gcloud sql instances patch legal-forms-db \
    --tier=db-custom-2-7680 \
    --database-flags=max_connections=200

# 3. Wait for operation to complete (~5 minutes)
gcloud sql operations wait \
    $(gcloud sql operations list --instance=legal-forms-db --limit=1 --format="value(name)") \
    --project=docmosis-tornado

# 4. Verify upgrade
gcloud sql instances describe legal-forms-db \
    --format="value(settings.tier)"
# Expected: db-custom-2-7680

# 5. Verify max_connections
gcloud sql instances describe legal-forms-db \
    --format="value(settings.databaseFlags)"
# Expected: max_connections=200

# 6. Test connection from Cloud Run staging
gcloud run services update node-server-staging \
    --region=us-central1 \
    --set-env-vars="DATABASE_URL=postgresql://..."

# 7. Monitor connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Should show < 200 even under load
```

**Cost Analysis:**

| Tier | vCPU | RAM | Max Conn | Cost/Month | Use Case |
|------|------|-----|----------|------------|----------|
| db-g1-small | shared | 1.7 GB | 100 | $35 | ❌ Too small |
| db-custom-1-3840 | 1 | 3.75 GB | 150 | $80 | ⚠️  Marginal |
| **db-custom-2-7680** | **2** | **7.5 GB** | **200** | **$120** | **✅ Recommended** |
| db-custom-4-15360 | 4 | 15 GB | 400 | $240 | Overkill |

**Budget Impact:** +$85/month ($120 - $35)

---

#### Fix #3: Add Connection Pool Monitoring

**File: `/monitoring/health-checks.js`** (UPDATED)

```javascript
const db = require('../db/connection');

async function checkDetailed() {
    const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {}
    };

    // Database check
    const dbHealth = await db.checkHealth();
    health.checks.database = {
        healthy: dbHealth.healthy,
        details: dbHealth.healthy ? {
            database: dbHealth.database,
            user: dbHealth.user,
            poolStats: dbHealth.poolStats  // ← NEW: Monitor pool
        } : {
            error: dbHealth.error,
            poolStats: dbHealth.poolStats
        }
    };

    // ✅ NEW: Alert if pool is under pressure
    const poolStats = dbHealth.poolStats;
    if (poolStats.waitingCount > 2) {
        health.checks.database.warning = `${poolStats.waitingCount} clients waiting for connections`;
    }

    if (poolStats.totalCount >= poolStats.maxSize) {
        health.checks.database.warning = `Connection pool at maximum capacity (${poolStats.totalCount}/${poolStats.maxSize})`;
    }

    // ... rest of health checks

    return health;
}
```

---

## 🚨 CRITICAL ISSUE #2: No Deployment Mechanics

### Problem Identified:
```yaml
# REVISED PLAN (VAGUE):
"Deploy to Cloud Run" ❌
"Zero downtime" ❌
"Rollback plan" ❌

# Missing:
- How to do gradual traffic splitting
- Health check configuration
- Automatic rollback on failure
- Instance scaling limits
```

---

### ✅ SOLUTION: Detailed Deployment Playbook

#### Deployment Strategy: Blue/Green with Traffic Splitting

**File: `/scripts/deploy-production.sh`** (NEW)

```bash
#!/bin/bash
set -e  # Exit on error

# ============================================
# PRODUCTION DEPLOYMENT SCRIPT
# ============================================
# Usage: ./scripts/deploy-production.sh [revision]
# Example: ./scripts/deploy-production.sh node-server-00042-abc

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
SERVICE_NAME="node-server"

echo "🚀 Starting production deployment..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# ============================================
# STEP 1: Pre-Deployment Checks
# ============================================
echo "📋 Running pre-deployment checks..."

# Check current health
CURRENT_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.url)")

HEALTH_CHECK=$(curl -s "$CURRENT_URL/health/detailed")
if [[ ! $HEALTH_CHECK == *"healthy":true* ]]; then
    echo "❌ Current service is unhealthy. Aborting deployment."
    exit 1
fi
echo "✅ Current service healthy"

# Check database connectivity
DB_STATUS=$(echo $HEALTH_CHECK | jq -r '.checks.database.healthy')
if [[ $DB_STATUS != "true" ]]; then
    echo "❌ Database unhealthy. Aborting deployment."
    exit 1
fi
echo "✅ Database connectivity verified"

# Check for pending migrations
MIGRATIONS_NEEDED=$(node db/migrations/check-pending.js)
if [[ $MIGRATIONS_NEEDED == "true" ]]; then
    echo "⚠️  Pending database migrations detected."
    read -p "Run migrations now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node db/migrations/run-migrations.js
    else
        echo "❌ Cannot deploy with pending migrations. Exiting."
        exit 1
    fi
fi
echo "✅ Database migrations up to date"

# ============================================
# STEP 2: Deploy New Revision (No Traffic)
# ============================================
echo ""
echo "🔨 Building and deploying new revision..."

# Deploy with --no-traffic flag (creates new revision without routing traffic)
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --no-traffic \
    --min-instances=1 \
    --max-instances=20 \
    --cpu=2 \
    --memory=2Gi \
    --timeout=300s \
    --concurrency=80 \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="DATABASE_URL=$DATABASE_URL" \
    --set-env-vars="ACCESS_TOKEN=$ACCESS_TOKEN" \
    --quiet

# Get new revision name
NEW_REVISION=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.latestCreatedRevisionName)")

echo "✅ New revision deployed: $NEW_REVISION"

# ============================================
# STEP 3: Smoke Test New Revision
# ============================================
echo ""
echo "🧪 Running smoke tests on new revision..."

# Get direct URL to new revision (bypasses traffic routing)
REVISION_URL=$(gcloud run revisions describe $NEW_REVISION \
    --region=$REGION \
    --format="value(status.url)")

# Test health endpoint
if ! curl -s -f "$REVISION_URL/health" > /dev/null; then
    echo "❌ Health check failed on new revision. Rolling back."
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions=$OLD_REVISION=100
    exit 1
fi
echo "✅ Health check passed"

# Test database connectivity
DB_TEST=$(curl -s "$REVISION_URL/health/detailed" | jq -r '.checks.database.healthy')
if [[ $DB_TEST != "true" ]]; then
    echo "❌ Database check failed on new revision. Rolling back."
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions=$OLD_REVISION=100
    exit 1
fi
echo "✅ Database connectivity verified"

# Test critical endpoint (intake submission)
TEST_PAYLOAD='{"firstName":"Deploy","lastName":"Test","email":"test@deploy.com","phone":"555-1234","currentAddress":{"street":"123 Test St","city":"LA","state":"CA","zip":"90001"}}'
SUBMIT_TEST=$(curl -s -X POST "$REVISION_URL/api/intakes/submit" \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD")

if [[ ! $SUBMIT_TEST == *"success":true* ]]; then
    echo "❌ Intake submission test failed. Rolling back."
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions=$OLD_REVISION=100
    exit 1
fi
echo "✅ Intake submission test passed"

# ============================================
# STEP 4: Gradual Traffic Migration
# ============================================
echo ""
echo "🚦 Starting gradual traffic migration..."

# Get current (old) revision
OLD_REVISION=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.traffic[0].revisionName)")

echo "Old revision: $OLD_REVISION"
echo "New revision: $NEW_REVISION"

# Phase 1: 10% traffic to new revision
echo ""
echo "Phase 1: Routing 10% traffic to new revision..."
gcloud run services update-traffic $SERVICE_NAME \
    --region=$REGION \
    --to-revisions="$NEW_REVISION=10,$OLD_REVISION=90"

echo "⏳ Monitoring for 2 minutes..."
sleep 120

# Check error rate
ERROR_RATE=$(gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.revision_name=$NEW_REVISION AND severity>=ERROR" \
    --limit=100 \
    --format="value(timestamp)" \
    --freshness=5m | wc -l)

if [[ $ERROR_RATE -gt 10 ]]; then
    echo "❌ High error rate detected ($ERROR_RATE errors). Rolling back."
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions=$OLD_REVISION=100
    exit 1
fi
echo "✅ Phase 1 stable (error rate: $ERROR_RATE)"

# Phase 2: 50% traffic
echo ""
echo "Phase 2: Routing 50% traffic to new revision..."
gcloud run services update-traffic $SERVICE_NAME \
    --region=$REGION \
    --to-revisions="$NEW_REVISION=50,$OLD_REVISION=50"

echo "⏳ Monitoring for 5 minutes..."
sleep 300

ERROR_RATE=$(gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.revision_name=$NEW_REVISION AND severity>=ERROR" \
    --limit=100 \
    --format="value(timestamp)" \
    --freshness=5m | wc -l)

if [[ $ERROR_RATE -gt 20 ]]; then
    echo "❌ High error rate detected ($ERROR_RATE errors). Rolling back."
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions=$OLD_REVISION=100
    exit 1
fi
echo "✅ Phase 2 stable (error rate: $ERROR_RATE)"

# Phase 3: 100% traffic (full cutover)
echo ""
echo "Phase 3: Routing 100% traffic to new revision..."
gcloud run services update-traffic $SERVICE_NAME \
    --region=$REGION \
    --to-revisions=$NEW_REVISION=100

echo "⏳ Monitoring for 10 minutes..."
sleep 600

ERROR_RATE=$(gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.revision_name=$NEW_REVISION AND severity>=ERROR" \
    --limit=100 \
    --format="value(timestamp)" \
    --freshness=10m | wc -l)

if [[ $ERROR_RATE -gt 30 ]]; then
    echo "⚠️  Elevated error rate detected ($ERROR_RATE errors)."
    read -p "Rollback to old revision? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud run services update-traffic $SERVICE_NAME \
            --region=$REGION \
            --to-revisions=$OLD_REVISION=100
        exit 1
    fi
fi

echo ""
echo "✅ Deployment successful!"
echo "New revision: $NEW_REVISION"
echo "Service URL: $CURRENT_URL"
echo ""

# ============================================
# STEP 5: Clean Up Old Revisions
# ============================================
echo "🧹 Cleaning up old revisions (keeping last 5)..."

# List all revisions except the 5 most recent
OLD_REVISIONS=$(gcloud run revisions list \
    --service=$SERVICE_NAME \
    --region=$REGION \
    --format="value(metadata.name)" \
    --sort-by="~metadata.creationTimestamp" \
    | tail -n +6)

for revision in $OLD_REVISIONS; do
    echo "Deleting old revision: $revision"
    gcloud run revisions delete $revision \
        --region=$REGION \
        --quiet
done

echo ""
echo "🎉 Deployment complete!"
```

**Make executable:**
```bash
chmod +x scripts/deploy-production.sh
```

---

#### Update Revised Plan: Week 9, Day 5

**REPLACE:**
```bash
# Or manual deployment
gcloud run deploy lipton-legal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

**WITH:**
```bash
# Production deployment with gradual traffic migration
./scripts/deploy-production.sh

# Script performs:
# 1. Pre-deployment health checks
# 2. Deploy new revision (no traffic)
# 3. Smoke test new revision
# 4. Gradual traffic migration (10% → 50% → 100%)
# 5. Monitor error rates at each phase
# 6. Automatic rollback on failure
# 7. Clean up old revisions

# Manual rollback (if needed after deployment):
gcloud run services update-traffic node-server \
    --region=us-central1 \
    --to-revisions=node-server-00041-xyz=100
```

---

## 🚨 CRITICAL ISSUE #3: No Monitoring Setup

### Problem Identified:
```
# REVISED PLAN (VAGUE):
"Configure monitoring" ❌
"Set up alerting via Cloud Monitoring" ❌

# Missing:
- Log-based metrics
- Alert policies
- Uptime checks
- Dashboards
```

---

### ✅ SOLUTION: Comprehensive Monitoring Setup

#### Week 0, Day 5: Add Monitoring Configuration

**File: `/scripts/setup-monitoring.sh`** (NEW)

```bash
#!/bin/bash
set -e

PROJECT_ID="docmosis-tornado"
SERVICE_NAME="node-server"
REGION="us-central1"
ALERT_EMAIL="alerts@liptonlegal.com"  # Change to your email

echo "📊 Setting up Cloud Monitoring for $SERVICE_NAME..."

# ============================================
# 1. Create Log-Based Metrics
# ============================================
echo ""
echo "Creating log-based metrics..."

# Metric: Error rate
gcloud logging metrics create intake_errors \
    --description="Count of intake submission errors" \
    --log-filter='resource.type="cloud_run_revision"
        resource.labels.service_name="'$SERVICE_NAME'"
        severity>=ERROR
        jsonPayload.endpoint="/api/intakes/submit"' \
    --value-extractor="" \
    --metric-kind=DELTA \
    --value-type=INT64 \
    || echo "Metric intake_errors already exists"

# Metric: Connection pool exhaustion
gcloud logging metrics create db_pool_exhaustion \
    --description="Database connection pool at capacity" \
    --log-filter='resource.type="cloud_run_revision"
        resource.labels.service_name="'$SERVICE_NAME'"
        jsonPayload.message:"Pool pressure"' \
    --value-extractor="" \
    --metric-kind=DELTA \
    --value-type=INT64 \
    || echo "Metric db_pool_exhaustion already exists"

# Metric: Intake submission success
gcloud logging metrics create intake_submissions \
    --description="Successful intake submissions" \
    --log-filter='resource.type="cloud_run_revision"
        resource.labels.service_name="'$SERVICE_NAME'"
        jsonPayload.message:"Intake created successfully"' \
    --value-extractor="" \
    --metric-kind=DELTA \
    --value-type=INT64 \
    || echo "Metric intake_submissions already exists"

# Metric: Slow queries (> 5 seconds)
gcloud logging metrics create slow_database_queries \
    --description="Database queries taking over 5 seconds" \
    --log-filter='resource.type="cloud_run_revision"
        resource.labels.service_name="'$SERVICE_NAME'"
        jsonPayload.queryDuration>5000' \
    --value-extractor="" \
    --metric-kind=DELTA \
    --value-type=INT64 \
    || echo "Metric slow_database_queries already exists"

echo "✅ Log-based metrics created"

# ============================================
# 2. Create Uptime Checks
# ============================================
echo ""
echo "Creating uptime checks..."

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --format="value(status.url)")

# Parse hostname from URL
HOSTNAME=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|/.*||')

# Uptime check: Health endpoint
gcloud monitoring uptime create lipton-legal-health \
    --display-name="Lipton Legal - Health Check" \
    --resource-type=uptime-url \
    --period=60 \
    --timeout=10s \
    --http-check-path="/health" \
    --http-check-hostname="$HOSTNAME" \
    --http-check-use-ssl \
    --check-interval=60s \
    || echo "Uptime check already exists"

# Uptime check: Detailed health endpoint (requires auth)
# Note: This requires setting up authentication in the uptime check

echo "✅ Uptime checks created"

# ============================================
# 3. Create Alert Policies
# ============================================
echo ""
echo "Creating alert policies..."

# Alert: High error rate
cat > /tmp/alert-high-error-rate.yaml << 'EOF'
displayName: "High Error Rate - Intake Submissions"
conditions:
  - displayName: "Error rate > 5 per minute"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/intake_errors"'
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 60s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
notificationChannels: []
alertStrategy:
  autoClose: 1800s
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-high-error-rate.yaml \
    || echo "Alert policy already exists"

# Alert: Database connection pool exhaustion
cat > /tmp/alert-pool-exhaustion.yaml << 'EOF'
displayName: "Database Connection Pool Exhaustion"
conditions:
  - displayName: "Pool exhaustion events > 10 per 5 minutes"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/db_pool_exhaustion"'
      comparison: COMPARISON_GT
      thresholdValue: 10
      duration: 300s
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_SUM
notificationChannels: []
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-pool-exhaustion.yaml \
    || echo "Alert policy already exists"

# Alert: Service down
cat > /tmp/alert-service-down.yaml << 'EOF'
displayName: "Service Down - Uptime Check Failed"
conditions:
  - displayName: "Health check failing"
    conditionThreshold:
      filter: 'metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.label.check_id="lipton-legal-health"'
      comparison: COMPARISON_LT
      thresholdValue: 1
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_FRACTION_TRUE
notificationChannels: []
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-service-down.yaml \
    || echo "Alert policy already exists"

# Alert: Slow database queries
cat > /tmp/alert-slow-queries.yaml << 'EOF'
displayName: "Slow Database Queries"
conditions:
  - displayName: "More than 20 slow queries per hour"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/slow_database_queries"'
      comparison: COMPARISON_GT
      thresholdValue: 20
      duration: 3600s
      aggregations:
        - alignmentPeriod: 3600s
          perSeriesAligner: ALIGN_SUM
notificationChannels: []
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-slow-queries.yaml \
    || echo "Alert policy already exists"

echo "✅ Alert policies created"

# Clean up temp files
rm -f /tmp/alert-*.yaml

# ============================================
# 4. Create Dashboard
# ============================================
echo ""
echo "Creating monitoring dashboard..."

cat > /tmp/dashboard.json << 'EOF'
{
  "displayName": "Lipton Legal - Client Intake System",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Intake Submissions (per minute)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/intake_submissions\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }],
            "yAxis": {
              "label": "Submissions/min"
            }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Rate (per minute)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/intake_errors\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }],
            "yAxis": {
              "label": "Errors/min"
            }
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Connection Pool",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/db_pool_exhaustion\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }],
            "yAxis": {
              "label": "Pool pressure events"
            }
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Response Latency (p95)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" AND resource.label.service_name=\"node-server\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_DELTA",
                    "crossSeriesReducer": "REDUCE_PERCENTILE_95"
                  }
                }
              }
            }],
            "yAxis": {
              "label": "Latency (ms)"
            }
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=/tmp/dashboard.json \
    || echo "Dashboard already exists"

rm -f /tmp/dashboard.json

echo "✅ Dashboard created"

# ============================================
# 5. Print Summary
# ============================================
echo ""
echo "=========================================="
echo "✅ MONITORING SETUP COMPLETE"
echo "=========================================="
echo ""
echo "📊 Dashboard:"
echo "https://console.cloud.google.com/monitoring/dashboards"
echo ""
echo "🔔 Alert Policies:"
echo "https://console.cloud.google.com/monitoring/alerting/policies"
echo ""
echo "📈 Metrics Explorer:"
echo "https://console.cloud.google.com/monitoring/metrics-explorer"
echo ""
echo "⏰ Uptime Checks:"
echo "https://console.cloud.google.com/monitoring/uptime"
echo ""
echo "📧 Next Steps:"
echo "1. Add email notification channel in Cloud Console"
echo "2. Link alert policies to notification channel"
echo "3. Test alerts by triggering errors"
echo ""
```

**Make executable:**
```bash
chmod +x scripts/setup-monitoring.sh
```

**Run during Week 0, Day 5:**
```bash
./scripts/setup-monitoring.sh
```

---

## 🚨 CRITICAL ISSUE #4: No Graceful Shutdown

### Problem Identified:
```
# SCENARIO:
1. Attorney clicks "Generate Documents"
2. Python pipeline starts (takes 30 seconds)
3. Cloud Run deployment starts
4. Cloud Run sends SIGTERM to old instance
5. Process exits immediately ❌
6. Document generation fails
7. Attorney gets 500 error
```

---

### ✅ SOLUTION: Implement Graceful Shutdown

**File: `/server.js`** (ADD AT BOTTOM)

```javascript
// ... existing server.js code ...

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// START SERVER
// ============================================
const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================
// GRACEFUL SHUTDOWN HANDLER
// ============================================
let isShuttingDown = false;
const activeRequests = new Set();

// Track active requests
app.use((req, res, next) => {
    if (isShuttingDown) {
        // Reject new requests during shutdown
        res.set('Connection', 'close');
        return res.status(503).json({
            error: 'Server is shutting down',
            retry: true
        });
    }

    // Track this request
    activeRequests.add(req);

    // Remove when request completes
    res.on('finish', () => {
        activeRequests.delete(req);
    });

    next();
});

// Handle SIGTERM (Cloud Run sends this on deployment)
process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received, starting graceful shutdown...');
    isShuttingDown = true;

    // Stop accepting new connections
    server.close(() => {
        logger.info('✅ HTTP server closed');
    });

    // Wait for active requests to complete (max 30 seconds)
    const shutdownTimeout = setTimeout(() => {
        logger.warn('⚠️  Forceful shutdown after 30s timeout');
        logger.warn(`❌ ${activeRequests.size} requests were terminated`);
        process.exit(1);
    }, 30000);  // 30 second grace period

    // Check every second if all requests are complete
    const checkInterval = setInterval(() => {
        logger.info(`⏳ Waiting for ${activeRequests.size} active requests to complete...`);

        if (activeRequests.size === 0) {
            clearInterval(checkInterval);
            clearTimeout(shutdownTimeout);

            // Close database connections
            db.pool.end(() => {
                logger.info('✅ Database pool closed');
                logger.info('✅ Graceful shutdown complete');
                process.exit(0);
            });
        }
    }, 1000);
});

// Handle SIGINT (Ctrl+C in development)
process.on('SIGINT', () => {
    logger.info('🛑 SIGINT received, shutting down immediately...');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Promise Rejection:', reason);
    // Don't exit - log and continue
});

module.exports = { app, server };
```

---

#### Alternative: Use pg-boss for Long-Running Jobs

**For document generation that takes > 30 seconds:**

**File: `/services/document-queue.js`** (NEW)

```javascript
const PgBoss = require('pg-boss');
const DocumentService = require('./document-service');

const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    max: 5  // Separate pool for queue
});

// Start queue worker
async function startWorker() {
    await boss.start();
    console.log('✅ Document generation queue worker started');

    // Process document generation jobs
    await boss.work('generate-documents', {
        teamSize: 3,        // Process 3 jobs concurrently
        teamConcurrency: 1  // Each worker handles 1 job at a time
    }, async (job) => {
        const { caseData, userId } = job.data;

        try {
            console.log(`🔨 Processing document generation job ${job.id}...`);

            // Generate documents (can take 30+ seconds)
            const result = await DocumentService.generateDocuments(caseData);

            // Send email notification
            await emailService.send({
                to: userId,
                subject: 'Your documents are ready',
                template: 'document-completion',
                data: { result }
            });

            console.log(`✅ Document generation job ${job.id} complete`);
            return result;

        } catch (error) {
            console.error(`❌ Document generation job ${job.id} failed:`, error);
            throw error;  // pg-boss will retry
        }
    });
}

// Enqueue document generation job
async function enqueueDocumentGeneration(caseData, userId) {
    const jobId = await boss.send('generate-documents', {
        caseData,
        userId
    }, {
        retryLimit: 3,
        retryDelay: 60,      // Retry after 60 seconds
        retryBackoff: true,  // Exponential backoff
        expireInHours: 24    // Job expires after 24 hours
    });

    console.log(`📋 Document generation job ${jobId} enqueued`);
    return jobId;
}

module.exports = {
    startWorker,
    enqueueDocumentGeneration,
    boss
};
```

**File: `/routes/documents.js`** (UPDATED)

```javascript
const express = require('express');
const router = express.Router();
const { enqueueDocumentGeneration } = require('../services/document-queue');
const { requireAuth } = require('../middleware/auth');

/**
 * Generate documents (async via queue)
 * POST /api/documents/generate
 */
router.post('/generate', requireAuth, async (req, res) => {
    try {
        // Enqueue job instead of processing immediately
        const jobId = await enqueueDocumentGeneration(
            req.body,
            req.user.email
        );

        // Return immediately
        res.json({
            success: true,
            message: 'Document generation started',
            jobId,
            status: 'processing',
            estimatedTime: '2-3 minutes'
        });

    } catch (error) {
        console.error('Enqueue error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check document generation status
 * GET /api/documents/status/:jobId
 */
router.get('/status/:jobId', requireAuth, async (req, res) => {
    const job = await boss.getJobById(req.params.jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
        jobId: job.id,
        state: job.state,  // created, active, completed, failed
        progress: job.progress,
        result: job.output,
        error: job.error
    });
});

module.exports = router;
```

**Start queue worker in server.js:**

```javascript
// server.js
const { startWorker } = require('./services/document-queue');

// Start queue worker on startup
startWorker().catch(err => {
    logger.error('Failed to start queue worker:', err);
    process.exit(1);
});
```

---

## 📋 UPDATED IMPLEMENTATION PLAN

### Week 0, Day 5: Add Cloud Infrastructure Tasks

**APPEND TO EXISTING TASKS:**

```markdown
### Day 5: Environment Setup (UPDATED)

**Tasks:**
1. ... existing tasks ...

2. **Cloud SQL Upgrade:**
   ```bash
   # Upgrade from db-g1-small to db-custom-2-7680
   gcloud sql instances patch legal-forms-db \
       --tier=db-custom-2-7680 \
       --database-flags=max_connections=200
   ```

3. **Set up Monitoring:**
   ```bash
   # Run monitoring setup script
   ./scripts/setup-monitoring.sh

   # Verify in Cloud Console:
   # - Log-based metrics created
   # - Alert policies created
   # - Uptime checks configured
   # - Dashboard available
   ```

4. **Configure Deployment Scripts:**
   ```bash
   # Create deployment script
   chmod +x scripts/deploy-production.sh

   # Test on staging
   ./scripts/deploy-staging.sh
   ```

5. **Update Database Connection:**
   ```javascript
   // Set pool size based on environment
   max: getPoolSize()  // 5 in production, 20 in dev
   ```

**Deliverables:**
- ✅ Cloud SQL upgraded to db-custom-2-7680 ($120/mo)
- ✅ Connection pool sized correctly (5 per instance)
- ✅ Monitoring dashboard live
- ✅ Alert policies configured
- ✅ Deployment script tested on staging
- ✅ Graceful shutdown implemented
```

---

### Week 9, Day 5: Updated Production Deployment

**REPLACE ENTIRE SECTION WITH:**

```markdown
### Day 5: Production Deployment (UPDATED)

**Pre-Deployment Checklist:**
- [ ] All staging tests passed
- [ ] Security audit complete
- [ ] Load testing passed (10 req/s sustained)
- [ ] Accessibility verified (WCAG 2.1 AA)
- [ ] Stakeholder sign-off received
- [ ] Cloud SQL upgraded (200 max connections)
- [ ] Monitoring dashboard configured
- [ ] Alert policies active
- [ ] Graceful shutdown tested

**Production Deployment:**

```bash
# 1. Create database backup
pg_dump $PRODUCTION_DATABASE_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql
gzip prod_backup_*.sql.gz
gsutil cp prod_backup_*.sql.gz gs://lipton-legal-backups/

# 2. Run database migration (if needed)
node db/migrations/run-migrations.js --production

# 3. Run deployment script (handles traffic splitting)
./scripts/deploy-production.sh

# Script automatically:
# - Deploys new revision (no traffic)
# - Runs smoke tests on new revision
# - Migrates traffic gradually (10% → 50% → 100%)
# - Monitors error rates at each phase
# - Rolls back automatically on failure
# - Cleans up old revisions

# 4. Monitor deployment
gcloud logging tail "resource.type=cloud_run_revision" --limit=50

# 5. Check monitoring dashboard
# https://console.cloud.google.com/monitoring/dashboards

# 6. Verify metrics
# - Error rate < 1%
# - p95 latency < 3 seconds
# - Connection pool healthy
# - No alerts firing
```

**Manual Rollback (if needed):**

```bash
# Get previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
    --service=node-server \
    --region=us-central1 \
    --sort-by="~metadata.creationTimestamp" \
    --limit=2 \
    --format="value(metadata.name)" \
    | tail -1)

# Route 100% traffic to previous revision
gcloud run services update-traffic node-server \
    --region=us-central1 \
    --to-revisions=$PREVIOUS_REVISION=100

echo "Rolled back to: $PREVIOUS_REVISION"
```

**Post-Deployment Monitoring (30 minutes):**

```bash
# Watch error logs
gcloud logging tail \
    "resource.type=cloud_run_revision AND severity>=ERROR" \
    --limit=50

# Watch connection pool
gcloud logging tail \
    "resource.type=cloud_run_revision AND jsonPayload.message:\"Pool\"" \
    --limit=20

# Check intake submissions
gcloud logging tail \
    "resource.type=cloud_run_revision AND jsonPayload.message:\"Intake created\"" \
    --limit=10
```

**Deliverables:**
- ✅ Production deployed successfully
- ✅ Zero downtime achieved (gradual traffic migration)
- ✅ Monitoring active and alerts configured
- ✅ Error rate < 1%
- ✅ p95 latency < 3 seconds
- ✅ Connection pool healthy (< 100 total connections)
- ✅ No critical errors in logs
```

---

## 💰 COST IMPACT SUMMARY

| Item | Before | After | Difference | Justification |
|------|--------|-------|------------|---------------|
| **Cloud SQL** | db-g1-small<br>$35/mo | db-custom-2-7680<br>$120/mo | **+$85/mo** | Required for 200 connections |
| **Cloud Run** | No change | No change | $0 | Auto-scales as needed |
| **Monitoring** | Basic (free) | Log-based metrics<br>$0-5/mo | **+$0-5/mo** | Small log volume |
| **Load Balancing** | N/A | N/A | $0 | Not needed (Cloud Run handles) |
| **TOTAL** | **$35/mo** | **$120-125/mo** | **+$85-90/mo** | **$1,020-1,080/year** |

**Justification:**
- $85/mo additional cost prevents $10,000+ in lost revenue from downtime
- Database upgrade is **required** - cannot deploy with 100 max connections
- Monitoring costs are negligible (<$5/mo) for the value provided

---

## 📋 FINAL CHECKLIST

Before Week 1, complete:

### Infrastructure:
- [ ] Cloud SQL upgraded to db-custom-2-7680
- [ ] max_connections set to 200
- [ ] Connection pool reduced to 5 per instance
- [ ] Monitoring dashboard created
- [ ] Alert policies configured
- [ ] Uptime checks created
- [ ] Notification channels added (email)

### Code Changes:
- [ ] `/db/connection.js` updated with dynamic pool sizing
- [ ] `/server.js` graceful shutdown handler added
- [ ] `/scripts/deploy-production.sh` created and tested
- [ ] `/scripts/setup-monitoring.sh` created and run
- [ ] `/services/document-queue.js` created (if using pg-boss)

### Testing:
- [ ] Graceful shutdown tested (send SIGTERM, verify requests complete)
- [ ] Connection pool tested (verify 5 connections per instance)
- [ ] Deployment script tested on staging
- [ ] Monitoring alerts tested (trigger error, verify alert)
- [ ] Uptime checks verified

### Documentation:
- [ ] Update revised plan with these changes
- [ ] Document rollback procedure
- [ ] Document monitoring dashboard usage
- [ ] Document alert response procedures

---

**Document Status:** ✅ Complete - Critical fixes identified and documented
**Budget Impact:** +$85-90/month (required upgrade)
**Implementation:** Week 0, Day 5 (before Week 1 starts)

