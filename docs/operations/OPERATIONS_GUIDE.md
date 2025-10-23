# Operations & Maintenance Guide
## Legal Form Application

**Version:** 2.0
**Last Updated:** October 23, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Nginx Gateway Operations](#nginx-gateway-operations)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Database Operations](#database-operations)
7. [Backup & Recovery](#backup--recovery)
8. [Performance Optimization](#performance-optimization)
9. [Security Operations](#security-operations)
10. [Incident Response](#incident-response)
11. [Maintenance Procedures](#maintenance-procedures)

---

## Overview

This guide provides comprehensive operational procedures for maintaining the Legal Form Application in production. It consolidates troubleshooting knowledge from 40+ deployment and fix documents into a single reference.

### Production Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│  Cloud Run   │────────▶│  Cloud SQL  │
│             │◀────────│  (Node.js)   │◀────────│ (Postgres)  │
└─────────────┘         └──────────────┘         └─────────────┘
                               │  │
                               │  └──────────────┐
                               ▼                 ▼
                        ┌──────────────┐  ┌──────────────┐
                        │ Cloud Storage│  │   Dropbox    │
                        └──────────────┘  └──────────────┘
```

### Service URLs (Production)

| Service | URL | Purpose |
|---------|-----|---------|
| Node.js API | https://node-server-zyiwmzwenq-uc.a.run.app | Main application |
| Python Pipeline | https://python-pipeline-zyiwmzwenq-uc.a.run.app | Data normalization |
| Health Check | https://node-server.../health | System health |
| Metrics | https://node-server.../metrics | Prometheus metrics |
| API Docs | https://node-server.../api-docs | Swagger UI |

---

## Daily Operations

### Morning Checklist

Run this daily at start of business:

```bash
#!/bin/bash
# save as: daily-health-check.sh

PROJECT_ID="docmosis-tornado"
REGION="us-central1"

echo "🌅 Daily Health Check - $(date)"
echo "================================"

# 1. Check service status
echo ""
echo "1. Service Status"
echo "-----------------"
gcloud run services list --region=$REGION --format="table(SERVICE,STATUS,URL)"

# 2. Check service health
echo ""
echo "2. Health Endpoints"
echo "-------------------"
NODE_URL=$(gcloud run services describe node-server --region=$REGION --format="value(status.url)")
curl -s "$NODE_URL/health" | jq -r '"Node.js: \(.status)"'

PYTHON_URL=$(gcloud run services describe python-pipeline --region=$REGION --format="value(status.url)")
curl -s "$PYTHON_URL/health" | jq -r '"Python: \(.status)"'

# 3. Check database
echo ""
echo "3. Database Status"
echo "------------------"
gcloud sql instances describe legal-forms-db --format="value(state)"

# 4. Check recent errors (last 24 hours)
echo ""
echo "4. Recent Errors (Last 24h)"
echo "---------------------------"
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
    --limit=5 \
    --format="table(timestamp,textPayload)" \
    --freshness=24h

# 5. Check storage usage
echo ""
echo "5. Cloud Storage Usage"
echo "----------------------"
gsutil du -sh gs://${PROJECT_ID}-form-submissions

# 6. Check case submissions (last 24 hours)
echo ""
echo "6. Form Submissions (Last 24h)"
echo "------------------------------"
ACCESS_TOKEN=$(gcloud secrets versions access latest --secret=access-token)
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$NODE_URL/api/form-entries" | \
    jq '[.[] | select(.createdAt > (now - 86400))] | length' | \
    xargs -I {} echo "Submissions: {}"

echo ""
echo "✅ Daily health check complete"
```

### Evening Checklist

Run this daily at end of business:

```bash
#!/bin/bash
# save as: daily-summary.sh

echo "🌙 Daily Summary - $(date)"
echo "=========================="

# Total submissions today
echo "📊 Today's Metrics:"
echo "-------------------"

# Get today's date in ISO format
TODAY=$(date +%Y-%m-%d)

# Query Cloud SQL for today's submissions
gcloud sql connect legal-forms-db --user=postgres --quiet <<EOF
SELECT
    COUNT(*) as total_submissions,
    COUNT(DISTINCT submitter_email) as unique_submitters,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_sec
FROM cases
WHERE DATE(created_at) = '$TODAY';
\q
EOF

# Check for any unprocessed cases
echo ""
echo "⚠️  Pending Items:"
echo "------------------"
gcloud sql connect legal-forms-db --user=postgres --quiet <<EOF
SELECT id, case_number, created_at
FROM cases
WHERE pipeline_status = 'pending'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
\q
EOF

# Backup reminder
echo ""
echo "💾 Backup Status:"
echo "-----------------"
gsutil ls -l gs://${PROJECT_ID}-backups/ | tail -5

echo ""
echo "✅ Daily summary complete"
```

---

## Nginx Gateway Operations

The Nginx gateway (`docmosis-tornado-vm`) serves as the entry point for all production traffic, routing requests between Cloudflare, Docmosis Tornado, and Cloud Run services.

### Quick Status Check

```bash
# SSH to the Nginx VM
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a

# Check Nginx status
sudo systemctl status nginx

# Check if listening on port 80
sudo netstat -tlnp | grep :80

# Check Docmosis status
sudo netstat -tlnp | grep :8080

# View recent requests
sudo tail -n 50 /var/log/nginx/access.log

# View recent errors
sudo tail -n 50 /var/log/nginx/error.log
```

### Daily Nginx Health Check

Add to your daily operations script:

```bash
# Nginx Gateway Health Check
echo ""
echo "5. Nginx Gateway Status"
echo "------------------------"

# Check if Nginx is running
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a \
  --command="sudo systemctl is-active nginx" 2>&1 | grep -q "active" \
  && echo "✅ Nginx: Running" \
  || echo "❌ Nginx: Down"

# Check if Docmosis is running
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a \
  --command="sudo netstat -tlnp | grep :8080" 2>&1 | grep -q "8080" \
  && echo "✅ Docmosis: Running" \
  || echo "❌ Docmosis: Down"

# Test through Cloudflare
curl -I -s https://docs.liptonlegal.com | head -n 1
```

### Common Nginx Operations

#### Reload Configuration (Zero Downtime)

```bash
# SSH to VM
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a

# Test configuration syntax
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

#### Update Access Token

When the Cloud Run access token changes:

```bash
# SSH to VM
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a

# Backup current config
sudo cp /etc/nginx/sites-available/tornado \
       /etc/nginx/sites-available/tornado.backup.$(date +%Y%m%d)

# Edit configuration
sudo nano /etc/nginx/sites-available/tornado

# Find and update this line:
# set $token "OLD_TOKEN";
# to:
# set $token "NEW_TOKEN";

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Verify
curl -I https://docs.liptonlegal.com
```

#### View Real-Time Traffic

```bash
# SSH to VM
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a

# Follow access log (Ctrl+C to stop)
sudo tail -f /var/log/nginx/access.log

# Follow error log
sudo tail -f /var/log/nginx/error.log

# Count requests per minute (last 1000 requests)
sudo tail -n 1000 /var/log/nginx/access.log | \
  awk '{print $4}' | cut -d: -f1-2 | sort | uniq -c | tail -n 10
```

#### Analyze Traffic Patterns

```bash
# Top 10 requested URLs
sudo awk '{print $7}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -n 10

# Response status codes distribution
sudo awk '{print $9}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn

# Client IP addresses (top 10)
sudo awk '{print $1}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -n 10

# Requests per hour (today)
sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/access.log | \
  cut -d: -f2 | uniq -c
```

### Nginx Troubleshooting

#### Issue: 502 Bad Gateway

**For `/api/render` requests (Docmosis):**

```bash
# Check if Docmosis is running
sudo netstat -tlnp | grep :8080

# If not running, check logs
sudo journalctl -u docmosis -n 50

# Start Docmosis (adjust service name if different)
sudo systemctl start docmosis
```

**For all other requests (Cloud Run):**

```bash
# Check Nginx error log
sudo tail -n 50 /var/log/nginx/error.log

# Test Cloud Run directly
curl -I https://node-server-zyiwmzwenq-uc.a.run.app

# Check DNS resolution
dig @8.8.8.8 node-server-zyiwmzwenq-uc.a.run.app

# Test outbound HTTPS
curl -I https://www.google.com
```

#### Issue: 504 Gateway Timeout

Document generation taking too long:

```bash
# Edit timeout settings
sudo nano /etc/nginx/sites-available/tornado

# Increase timeouts:
# proxy_read_timeout 600s;      # 10 minutes
# proxy_connect_timeout 120s;   # 2 minutes

# Apply changes
sudo nginx -t
sudo systemctl reload nginx
```

#### Issue: 413 Request Entity Too Large

File upload too large:

```bash
# Increase max body size
sudo nano /etc/nginx/sites-available/tornado

# Change:
# client_max_body_size 200M;

# Apply changes
sudo nginx -t
sudo systemctl reload nginx
```

#### Issue: Nginx Won't Start

```bash
# Check for configuration errors
sudo nginx -t

# Check for port conflicts
sudo netstat -tlnp | grep :80

# Check logs for specific error
sudo journalctl -u nginx -n 50

# If config is bad, restore from backup
sudo ls -la /etc/nginx/sites-available/tornado.backup.*
sudo cp /etc/nginx/sites-available/tornado.backup.YYYYMMDD \
       /etc/nginx/sites-available/tornado
sudo nginx -t
sudo systemctl start nginx
```

### Nginx Emergency Procedures

#### Complete Nginx Failure

If Nginx is completely down and cannot be recovered quickly:

```bash
# Option 1: Point Cloudflare directly to Cloud Run (temporary)
# Go to Cloudflare DNS settings
# Change A record for docs.liptonlegal.com:
# From: 136.114.198.83 (VM)
# To: CNAME → node-server-zyiwmzwenq-uc.a.run.app

# WARNING: This bypasses Docmosis
# - /api/render requests will fail
# - Users must manually add ?token=*** to URLs
```

#### VM Completely Unresponsive

```bash
# Restart the VM
gcloud compute instances stop docmosis-tornado-vm --zone=us-central1-a
gcloud compute instances start docmosis-tornado-vm --zone=us-central1-a

# Wait for startup (2-3 minutes)
# Then verify services
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-a
sudo systemctl status nginx
sudo systemctl status docmosis
```

### Nginx Log Rotation

Logs are automatically rotated daily. Manual rotation:

```bash
# Check current log size
sudo ls -lh /var/log/nginx/

# Force rotation now
sudo logrotate -f /etc/logrotate.d/nginx

# Verify rotation
sudo ls -lh /var/log/nginx/
```

### Nginx Metrics Collection

View Nginx metrics:

```bash
# Request rate and status codes
sudo tail -n 1000 /var/log/nginx/access.log | \
  awk '{status[$9]++; total++} END {for (s in status) print s, status[s], (status[s]/total*100)"%"}'

# Average response time (if log format includes $request_time)
sudo awk '{sum+=$11; count++} END {print "Avg response time:", sum/count, "seconds"}' \
  /var/log/nginx/access.log
```

For detailed Nginx documentation, see: [docs/infrastructure/NGINX_GATEWAY.md](../infrastructure/NGINX_GATEWAY.md)

---

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | >5% | Investigate logs immediately |
| Response Time | >2s (p95) | Check database performance |
| Memory Usage | >80% | Scale up or restart |
| CPU Usage | >70% sustained | Scale horizontally |
| Database Connections | >15 active | Check for connection leaks |
| Failed Submissions | >3/hour | Check API and database |
| Dropbox Failures | >10% | Verify token, check quota |

### Real-Time Monitoring Commands

```bash
# Watch service logs in real-time
gcloud run services logs tail node-server --region=us-central1

# Filter for errors only
gcloud run services logs tail node-server --region=us-central1 \
    --log-filter="severity>=ERROR"

# Monitor specific case submission
CASE_ID="CASE-123456"
gcloud logging read "resource.type=cloud_run_revision AND textPayload:\"$CASE_ID\"" \
    --limit=50 \
    --format="table(timestamp,textPayload)"

# Monitor database queries
gcloud sql instances describe legal-forms-db --format="value(currentDiskSize,maxDiskSize)"

# Check active connections
gcloud sql connect legal-forms-db --user=postgres <<EOF
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'legal_forms_db'
GROUP BY state;
\q
EOF
```

### Setting Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate - Legal Form App" \
    --condition-display-name="Error rate > 5%" \
    --condition-threshold-value=0.05 \
    --condition-threshold-duration=300s \
    --condition-filter='resource.type="cloud_run_revision" AND severity>=ERROR'

# Create alert for high response time
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Slow API Responses" \
    --condition-display-name="Response time > 2s" \
    --condition-threshold-value=2000 \
    --condition-threshold-duration=300s \
    --condition-filter='metric.type="run.googleapis.com/request_latencies"'

# Create alert for database CPU
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Database CPU High" \
    --condition-display-name="CPU > 80%" \
    --condition-threshold-value=0.8 \
    --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"'
```

---

## Common Issues & Solutions

### Issue 1: High Error Rate

**Symptoms:**
- Many 500 errors in logs
- Users report submission failures
- Error rate >5%

**Diagnosis:**
```bash
# Check recent errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
    --limit=50 \
    --format="table(timestamp,jsonPayload.message)"

# Check error patterns
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
    --limit=200 \
    --format="value(jsonPayload.message)" | sort | uniq -c | sort -rn
```

**Solutions:**

**A. Database Connection Issues**
```bash
# Check database status
gcloud sql instances describe legal-forms-db --format="value(state)"

# If not RUNNABLE, restart
gcloud sql instances restart legal-forms-db

# Check for connection pool exhaustion
gcloud sql connect legal-forms-db --user=postgres <<EOF
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'legal_forms_db';
\q
EOF

# If too many connections (>15), restart service
gcloud run services update node-server --region=us-central1 \
    --set-env-vars="FORCE_RESTART=$(date +%s)"
```

**B. Memory Issues**
```bash
# Check memory usage
gcloud run services describe node-server --region=us-central1 \
    --format="value(spec.template.spec.containers[0].resources.limits.memory)"

# Increase if needed
gcloud run services update node-server --region=us-central1 --memory=1Gi
```

**C. Deployment Issues**
```bash
# Rollback to previous revision
gcloud run revisions list --service=node-server --region=us-central1

# Update traffic to previous revision
gcloud run services update-traffic node-server --region=us-central1 \
    --to-revisions=node-server-00010-abc=100
```

---

### Issue 2: SSE Connection Failures

**Symptoms:**
- Progress bar not updating
- Console errors: "EventSource failed"
- Users don't see real-time updates

**Diagnosis:**
```bash
# Check SSE endpoint logs
gcloud logging read 'resource.type=cloud_run_revision AND textPayload:"SSE"' \
    --limit=50 \
    --format="table(timestamp,textPayload)"

# Test SSE endpoint manually
curl -N -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://node-server-zyiwmzwenq-uc.a.run.app/api/pipeline/status/CASE-123"
```

**Solutions:**

**A. Authentication Errors**
```bash
# Verify access token
gcloud secrets versions access latest --secret=access-token

# Test with correct token
export ACCESS_TOKEN=$(gcloud secrets versions access latest --secret=access-token)
curl -N -H "Accept: text/event-source" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "$NODE_URL/api/pipeline/status/TEST"
```

**B. Timeout Issues**
```bash
# Increase Cloud Run timeout
gcloud run services update node-server --region=us-central1 --timeout=300

# Check for proxy timeout (if using load balancer)
# May need to configure keep-alive settings
```

---

### Issue 3: Dropbox Upload Failures

**Symptoms:**
- Forms submit successfully but no Dropbox file
- Logs show "Dropbox API error"
- Error: "expired_access_token"

**Diagnosis:**
```bash
# Check Dropbox errors in logs
gcloud logging read 'textPayload:"Dropbox"' --limit=20

# Test Dropbox locally
node test-dropbox-connection.js
```

**Solutions:**

**A. Expired Token**
```bash
# Check token expiration
# Dropbox App Token expires after 4 hours
# Generate new long-lived token from Dropbox App Console

# Update secret
echo -n "NEW_DROPBOX_TOKEN" | gcloud secrets versions add dropbox-token --data-file=-

# Restart service to pick up new token
gcloud run services update node-server --region=us-central1 \
    --update-env-vars="DROPBOX_TOKEN_UPDATED=$(date +%s)"
```

**B. Rate Limiting**
```bash
# Check for rate limit errors in logs
gcloud logging read 'textPayload:"rate_limit"' --limit=10

# Solution: Implement exponential backoff (already in code)
# Or temporarily disable Dropbox
gcloud run services update node-server --region=us-central1 \
    --set-env-vars="DROPBOX_ENABLED=false"
```

**C. Newline/Whitespace in Token**
```bash
# Common issue: token has trailing newline
# Fix by recreating secret without newline
echo -n "YOUR_TOKEN_WITHOUT_NEWLINE" | gcloud secrets versions add dropbox-token --data-file=-

# Verify no newline
gcloud secrets versions access latest --secret=dropbox-token | od -c
```

---

### Issue 4: Slow Database Queries

**Symptoms:**
- API responses take >2 seconds
- Timeouts on form submission
- Database CPU >80%

**Diagnosis:**
```bash
# Check slow queries
gcloud sql connect legal-forms-db --user=postgres <<EOF
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
\q
EOF

# Check missing indexes
gcloud sql connect legal-forms-db --user=postgres <<EOF
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY abs(correlation) DESC;
\q
EOF
```

**Solutions:**

**A. Add Missing Indexes**
```sql
-- Connect to database
gcloud sql connect legal-forms-db --user=postgres

-- Add indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parties_case_id ON parties(case_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_party_issues_party_id ON party_issue_selections(party_id);

-- Analyze tables
ANALYZE cases;
ANALYZE parties;
ANALYZE party_issue_selections;
```

**B. Vacuum Database**
```bash
# Run vacuum to reclaim space and update statistics
gcloud sql connect legal-forms-db --user=postgres <<EOF
VACUUM ANALYZE;
\q
EOF
```

**C. Upgrade Database Tier**
```bash
# Check current tier
gcloud sql instances describe legal-forms-db --format="value(settings.tier)"

# Upgrade to larger tier
gcloud sql instances patch legal-forms-db --tier=db-n1-standard-1
```

---

## Database Operations

### Backup Operations

#### Manual Backup

```bash
# Export full database
gcloud sql export sql legal-forms-db \
    gs://${PROJECT_ID}-backups/manual-backup-$(date +%Y%m%d-%H%M%S).sql \
    --database=legal_forms_db

# Export specific table
gcloud sql export sql legal-forms-db \
    gs://${PROJECT_ID}-backups/cases-backup-$(date +%Y%m%d).sql \
    --database=legal_forms_db \
    --table=cases

# Download backup locally
gsutil cp gs://${PROJECT_ID}-backups/manual-backup-*.sql ./backups/
```

#### Restore from Backup

```bash
# List available backups
gsutil ls gs://${PROJECT_ID}-backups/

# Restore from backup
gcloud sql import sql legal-forms-db \
    gs://${PROJECT_ID}-backups/backup-TIMESTAMP.sql \
    --database=legal_forms_db

# Or restore specific table
gcloud sql import sql legal-forms-db \
    gs://${PROJECT_ID}-backups/cases-backup-TIMESTAMP.sql \
    --database=legal_forms_db
```

#### Automated Backups

```bash
# Configure automatic backups
gcloud sql instances patch legal-forms-db \
    --backup-start-time=03:00 \
    --retained-backups-count=7

# List automatic backups
gcloud sql backups list --instance=legal-forms-db

# Restore from automatic backup
gcloud sql backups restore BACKUP_ID \
    --backup-instance=legal-forms-db \
    --backup-location=us-central1
```

### Data Maintenance

#### Clean Old Records

```sql
-- Delete cases older than 90 days
DELETE FROM cases
WHERE created_at < NOW() - INTERVAL '90 days'
  AND pipeline_status = 'completed';

-- Delete orphaned party records
DELETE FROM parties
WHERE case_id NOT IN (SELECT id FROM cases);

-- Delete orphaned issue selections
DELETE FROM party_issue_selections
WHERE party_id NOT IN (SELECT id FROM parties);
```

#### Archive Old Data

```bash
# Export old data for archival
gcloud sql export csv legal-forms-db \
    gs://${PROJECT_ID}-archives/cases-archive-$(date +%Y%m).csv \
    --database=legal_forms_db \
    --query="SELECT * FROM cases WHERE created_at < NOW() - INTERVAL '6 months'"

# Then delete archived records
gcloud sql connect legal-forms-db --user=postgres <<EOF
DELETE FROM cases WHERE created_at < NOW() - INTERVAL '6 months';
\q
EOF
```

---

## Backup & Recovery

### Disaster Recovery Plan

#### RTO & RPO

- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 24 hours
- **Backup Frequency:** Daily automatic + on-demand
- **Backup Retention:** 7 days (automatic), 90 days (manual)

#### Full Recovery Procedure

```bash
#!/bin/bash
# Disaster Recovery Script

set -e

PROJECT_ID="docmosis-tornado"
REGION="us-central1"
BACKUP_DATE="20251023"

echo "🚨 Starting Disaster Recovery"
echo "=============================="

# 1. Create new Cloud SQL instance (if original is lost)
echo "1. Creating new database instance..."
gcloud sql instances create legal-forms-db-recovery \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=$(gcloud secrets versions access latest --secret=db-password)

# 2. Restore from backup
echo "2. Restoring from backup..."
gcloud sql import sql legal-forms-db-recovery \
    gs://${PROJECT_ID}-backups/backup-${BACKUP_DATE}.sql \
    --database=legal_forms_db

# 3. Update Cloud Run to point to new database
echo "3. Updating Cloud Run services..."
gcloud run services update node-server \
    --region=$REGION \
    --set-env-vars="DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:legal-forms-db-recovery"

gcloud run services update python-pipeline \
    --region=$REGION \
    --set-env-vars="DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:legal-forms-db-recovery"

# 4. Verify recovery
echo "4. Verifying recovery..."
NODE_URL=$(gcloud run services describe node-server --region=$REGION --format="value(status.url)")
curl -s "$NODE_URL/health/detailed" | jq .

echo ""
echo "✅ Recovery complete!"
echo "⚠️  Remember to:"
echo "   1. Update DNS if needed"
echo "   2. Verify all data is present"
echo "   3. Test form submission end-to-end"
echo "   4. Delete old instance after verification"
```

---

## Performance Optimization

### Database Optimization

```sql
-- Run monthly maintenance
VACUUM FULL ANALYZE;

-- Update statistics
ANALYZE VERBOSE;

-- Check index health
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';

-- Drop unused indexes
-- DROP INDEX IF EXISTS index_name;

-- Rebuild fragmented indexes
REINDEX TABLE cases;
REINDEX TABLE parties;
```

### Application Optimization

```bash
# Scale up for high traffic
gcloud run services update node-server --region=us-central1 \
    --min-instances=2 \
    --max-instances=20 \
    --concurrency=100 \
    --memory=1Gi \
    --cpu=2

# Scale down for normal traffic
gcloud run services update node-server --region=us-central1 \
    --min-instances=0 \
    --max-instances=10 \
    --concurrency=80 \
    --memory=512Mi \
    --cpu=1
```

### Cloud Storage Lifecycle

```bash
# Optimize storage costs with lifecycle policy
cat > lifecycle-policy.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle-policy.json gs://${PROJECT_ID}-form-submissions
```

---

## Security Operations

### Security Audit

```bash
#!/bin/bash
# Monthly Security Audit

echo "🔒 Security Audit - $(date)"
echo "==========================="

# 1. Check for exposed secrets
echo "1. Checking for exposed secrets..."
gcloud secrets list --format="table(name,createTime)"

# 2. Check service account permissions
echo ""
echo "2. Service Account Permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${PROJECT_NUMBER}"

# 3. Check for public access
echo ""
echo "3. Checking for public access..."
gcloud run services get-iam-policy node-server --region=us-central1 \
    --filter="bindings.members:allUsers"

# 4. Check SSL/TLS
echo ""
echo "4. SSL/TLS Configuration..."
echo "Cloud Run automatically provides TLS 1.2+"

# 5. Check database encryption
echo ""
echo "5. Database Encryption..."
gcloud sql instances describe legal-forms-db \
    --format="value(diskEncryptionConfiguration.kmsKeyName)"

echo ""
echo "✅ Security audit complete"
```

### Rotate Secrets

```bash
#!/bin/bash
# Rotate secrets quarterly

# 1. Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# 2. Add new secret version
echo -n "$NEW_TOKEN" | gcloud secrets versions add access-token --data-file=-

# 3. Update services to use new token
# (automatic with :latest)

# 4. Disable old secret version (after verification)
# gcloud secrets versions disable VERSION --secret=access-token

# 5. Communicate new token to users
echo "New access token generated: $NEW_TOKEN"
echo "⚠️  Notify all API consumers to update their tokens"
```

---

## Incident Response

### Incident Response Playbook

#### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 - Critical | Service down, data loss | Immediate | All hands |
| P2 - High | Major feature broken | 15 minutes | On-call engineer |
| P3 - Medium | Minor feature degraded | 1 hour | Primary engineer |
| P4 - Low | Cosmetic issue | Next business day | Normal priority |

#### P1 Response Procedure

```bash
# 1. Declare incident
echo "⚠️  INCIDENT DECLARED: $(date)" >> incidents.log

# 2. Quick assessment
gcloud run services describe node-server --region=us-central1
gcloud sql instances describe legal-forms-db

# 3. Check recent changes
gcloud run revisions list --service=node-server --limit=5

# 4. Rollback if needed
gcloud run services update-traffic node-server \
    --to-revisions=PREVIOUS_REVISION=100

# 5. Monitor recovery
watch -n 5 'curl -s https://node-server.../health | jq .'

# 6. Document incident
cat >> incidents.log <<EOF
Incident: $(date)
Severity: P1
Impact: Service unavailable
Duration: X minutes
Root Cause: [describe]
Resolution: [describe]
Prevention: [describe]
EOF
```

---

## Maintenance Procedures

### Monthly Maintenance Window

**Schedule:** First Sunday of each month, 2:00 AM - 4:00 AM PST

```bash
#!/bin/bash
# Monthly Maintenance Script

echo "🔧 Monthly Maintenance - $(date)"
echo "================================"

# 1. Database maintenance
echo "1. Database maintenance..."
gcloud sql connect legal-forms-db --user=postgres <<EOF
VACUUM FULL ANALYZE;
REINDEX DATABASE legal_forms_db;
\q
EOF

# 2. Clean up old logs
echo "2. Cleaning up logs..."
gcloud logging delete \
    "resource.type=cloud_run_revision AND timestamp<\"$(date -d '30 days ago' --iso-8601)\"" \
    --quiet

# 3. Update dependencies
echo "3. Checking for updates..."
# Run locally: npm outdated
# Update and test before deploying

# 4. Review metrics
echo "4. Reviewing metrics..."
# Check Prometheus/Grafana dashboards

# 5. Test backup restore
echo "5. Testing backup restore..."
# Run disaster recovery test in staging

echo ""
echo "✅ Monthly maintenance complete"
```

### Quarterly Tasks

- [ ] Review and rotate secrets
- [ ] Security audit and penetration testing
- [ ] Performance benchmarking
- [ ] Capacity planning review
- [ ] Documentation updates
- [ ] Disaster recovery drill
- [ ] Cost optimization review

---

## Support Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | [Phone/Email] | 24/7 |
| Database Admin | [Email] | Business hours |
| Security Team | [Email] | Business hours |
| GCP Support | support.google.com | 24/7 (paid) |

---

## Related Documentation

- **[Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)** - Initial deployment procedures
- **[API Reference](../API_REFERENCE.md)** - API documentation
- **[Architecture](../ARCHITECTURE.md)** - System architecture
- **[Troubleshooting](../TROUBLESHOOTING.md)** - Detailed troubleshooting

---

**Document Version:** 2.0
**Last Updated:** October 23, 2025
**Next Review:** January 2026
