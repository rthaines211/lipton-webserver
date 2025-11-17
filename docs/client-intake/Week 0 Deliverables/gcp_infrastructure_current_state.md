# GCP Infrastructure Documentation - Current State
## Lipton Legal Group - Docmosis Tornado Project

**Project ID**: `docmosis-tornado`  
**Project Number**: `945419684329`  
**Primary Region**: `us-central1`  
**Documentation Date**: November 17, 2025

---

## Executive Summary

The current infrastructure supports a legal forms generation system with production and staging environments. The system integrates with Docmosis for document generation, Dropbox for file storage, and SendGrid for email notifications. The infrastructure is built on Google Cloud Platform using Cloud Run for compute, Cloud SQL for database, and Cloud Storage for file storage.

### Current Completeness Assessment: 8.5/10

**What Exists:**
- ✅ Dual environment (production + staging)
- ✅ Cloud Run services with auto-scaling
- ✅ Cloud SQL PostgreSQL databases
- ✅ Secret Manager for secure configuration
- ✅ Cloud Storage for file storage
- ✅ CI/CD via Cloud Build (GitHub Actions integration)
- ✅ VPC connector for private networking (python-pipeline-prod)
- ✅ Email integration (SendGrid)
- ✅ Document generation pipeline

**What's Needed for Client Intake System:**
- ❌ New database tables for intake forms (5 tables)
- ❌ New Cloud Run service or routes for intake form frontend
- ❌ Attorney authentication/authorization system
- ❌ Enhanced IAM roles for attorneys vs. clients
- ⚠️ Additional Secret Manager entries (if needed for new integrations)

---

## 1. Cloud Run Services

### 1.1 Production Services

#### **node-server** (Production)
- **URL**: https://node-server-zyiwmzwenq-uc.a.run.app
- **Region**: us-central1
- **Resources**:
  - CPU: 1 vCPU
  - Memory: 1 GiB
  - Max Scale: 10 instances
  - Container Concurrency: 80
  - Timeout: 300 seconds
- **Container Image**: `us-central1-docker.pkg.dev/docmosis-tornado/cloud-run-source-deploy/node-server`
- **Latest Revision**: node-server-00078-wj7 (deployed 2025-11-15)
- **Cloud SQL Connection**: `docmosis-tornado:us-central1:legal-forms-db` (via Unix socket)
- **Features**:
  - Startup CPU boost enabled
  - Cloud SQL Proxy integrated
  - Auto-scaling based on traffic
- **Environment Variables** (Key Ones):
  - `NODE_ENV=production`
  - `DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db`
  - `DB_NAME=legal_forms_db`
  - `DB_USER=app-user`
  - `PIPELINE_API_URL=https://python-pipeline-zyiwmzwenq-uc.a.run.app`
  - `GCS_BUCKET_NAME=docmosis-tornado-form-submissions`
  - `EMAIL_PROVIDER=sendgrid`
  - `EMAIL_FROM_ADDRESS=notifications@liptonlegal.com`
  - `DROPBOX_ENABLED=true`
  - `DOCMOSIS_ENABLED=true`
  - `DOCMOSIS_API_URL=http://10.128.0.3:8080/api/render` (internal VPC)

#### **python-pipeline** (Production)
- **URL**: https://python-pipeline-zyiwmzwenq-uc.a.run.app
- **Region**: us-central1
- **Resources**:
  - CPU: 1 vCPU
  - Memory: 2 GiB (double the Node service)
  - Max Scale: 10 instances
  - Container Concurrency: 160
  - Timeout: 300 seconds
- **Container Image**: `us-central1-docker.pkg.dev/docmosis-tornado/cloud-run-source-deploy/python-pipeline`
- **Latest Revision**: python-pipeline-00015-v5h (deployed 2025-11-11)
- **Network Configuration**:
  - VPC Access Connector: `legal-forms-connector`
  - VPC Egress: `private-ranges-only` (routes to internal Docmosis server)
- **Cloud SQL Connection**: `phase-5-gcp-sql-lab:us-central1:lipton-prod-db` 
  - ⚠️ NOTE: Different project/instance than node-server uses
- **Environment Variables**:
  - `DROPBOX_ENABLED=true`
  - `DROPBOX_BASE_PATH=/Current Clients`
  - `BUILD_ID=build-1761572598`

### 1.2 Staging Services

#### **node-server-staging**
- **URL**: https://node-server-staging-zyiwmzwenq-uc.a.run.app
- **Region**: us-central1
- **Resources**: Same as production (1 vCPU, 1 GiB, max 10 instances)
- **Latest Revision**: node-server-staging-00060-sjw (deployed 2025-11-15)
- **Cloud SQL Connection**: `docmosis-tornado:us-central1:legal-forms-db-staging`
- **Key Differences from Production**:
  - `NODE_ENV=staging`
  - `DB_NAME=legal_forms_db_staging`
  - `DB_USER=app-user-staging`
  - `EMAIL_FROM_ADDRESS=staging-notifications@liptonlegal.com`
  - `EMAIL_FROM_NAME=Lipton Legal [STAGING]`
  - `DROPBOX_BASE_PATH=/Current Clients/STAGING`
  - `GCS_BUCKET_NAME=docmosis-tornado-form-submissions-staging`
  - `PIPELINE_API_URL=https://python-pipeline-staging-945419684329.us-central1.run.app`

#### **python-pipeline-staging**
- **URL**: https://python-pipeline-staging-zyiwmzwenq-uc.a.run.app
- **Region**: us-central1
- **Resources**: Same as prod Python (1 vCPU, 2 GiB)
- **Container Concurrency**: 10 (significantly lower than prod's 160)
- **Latest Revision**: python-pipeline-staging-00004-lz4 (deployed 2025-11-11)
- **Network**: No VPC connector (unlike production)
- **Environment**:
  - `DROPBOX_BASE_PATH=/Current Clients/STAGING`
  - `DOCMOSIS_ENDPOINT=https://us-app102.docmosis.com/api/render` (external, not VPC)

### 1.3 Service Account
All Cloud Run services use the default compute service account:
- **Service Account**: `945419684329-compute@developer.gserviceaccount.com`

---

## 2. Cloud SQL Databases

### 2.1 Production Database

**Instance Name**: `legal-forms-db`
- **Version**: PostgreSQL 15.14
- **Region**: us-central1-c
- **Tier**: db-f1-micro (shared-core, 0.6 GB RAM)
- **Storage**: 10 GB SSD (auto-resize enabled, no limit)
- **Connection**: `docmosis-tornado:us-central1:legal-forms-db`
- **Public IP**: 34.70.77.83
- **Outgoing IP**: 136.115.249.132
- **Backup Configuration**:
  - Automated backups: Enabled (daily at 03:00 UTC)
  - Retained backups: 7 days
  - Transaction log retention: 7 days
- **High Availability**: Zonal (single zone, no HA)
- **Maintenance Window**: Sunday at 4:00 AM
- **SSL**: Allowed but not required
- **Deletion Protection**: Disabled
- **Service Account**: `p945419684329-eu1olj@gcp-sa-cloud-sql.iam.gserviceaccount.com`

**Upgradeable To**: PostgreSQL 16, 17, or 18

### 2.2 Staging Database

**Instance Name**: `legal-forms-db-staging`
- **Version**: PostgreSQL 14.19
- **Region**: us-central1-a (different zone from production)
- **Tier**: db-f1-micro
- **Storage**: 10 GB SSD (auto-resize enabled)
- **Connection**: `docmosis-tornado:us-central1:legal-forms-db-staging`
- **Public IP**: 35.239.21.172
- **Outgoing IP**: 136.115.72.240
- **Backup Configuration**: Same as production (7 day retention)
- **Maintenance Window**: Sunday at 3:00 AM (1 hour before prod)
- **Service Account**: `p945419684329-8nipr9@gcp-sa-cloud-sql.iam.gserviceaccount.com`

**Upgradeable To**: PostgreSQL 15, 16, 17, or 18

### 2.3 Database Users
- **Production**: `app-user`
- **Staging**: `app-user-staging`

---

## 3. Cloud Storage Buckets

### 3.1 Active Buckets

#### **docmosis-tornado-form-submissions** (Production)
- **Location**: us-central1 (regional)
- **Storage Class**: Standard
- **Created**: 2025-10-22
- **Purpose**: Store form submission data/documents
- **Lifecycle Policy**: 
  - Delete objects with prefix `form-entry-` after 30 days
- **Public Access**: Prevented (inherited)
- **Uniform Bucket-Level Access**: Disabled (uses ACLs)

#### **docmosis-tornado-form-submissions-staging**
- **Location**: us-central1 (regional)
- **Storage Class**: Standard
- **Created**: 2025-10-27
- **Purpose**: Staging form submissions
- **Lifecycle Policy**: Delete after 90 days (longer retention than prod)
- **Public Access**: Prevented
- **Uniform Bucket-Level Access**: Disabled

#### **docmosis-templates-liptonlegal**
- **Location**: us-central1 (regional)
- **Storage Class**: Standard
- **Created**: 2025-10-06
- **Purpose**: Store Docmosis document templates
- **Public Access**: Prevented
- **Uniform Bucket-Level Access**: Enabled (no ACLs)

#### **docmosis-tornado-db-migration**
- **Location**: us-central1 (regional)
- **Storage Class**: Standard
- **Created**: 2025-10-22
- **Purpose**: Database migration scripts/backups
- **Public Access**: Prevented
- **Uniform Bucket-Level Access**: Disabled

#### **docmosis-tornado_cloudbuild**
- **Location**: US (multi-region)
- **Storage Class**: Standard
- **Created**: 2025-10-22
- **Purpose**: Cloud Build artifacts and logs
- **Public Access**: Prevented
- **Uniform Bucket-Level Access**: Disabled

#### **run-sources-docmosis-tornado-us-central1**
- **Location**: us-central1 (regional)
- **Storage Class**: Standard
- **Created**: 2025-10-22
- **Purpose**: Cloud Run source code deployments
- **CORS Configuration**: Enabled for Google Cloud Console access
- **Public Access**: Prevented
- **Uniform Bucket-Level Access**: Enabled

---

## 4. Secret Manager

### 4.1 Database Secrets
- `DB_PASSWORD` - Production database password
- `DB_PASSWORD_STAGING` - Staging database password
- `db-password` - Legacy/alternative DB password
- `db-user` - Database username secret

### 4.2 API Access Tokens
- `ACCESS_TOKEN` - Production API access token
- `ACCESS_TOKEN_STAGING` - Staging API access token
- `access-token` - Legacy/alternative access token

### 4.3 External Service Integrations

#### Docmosis (Document Generation)
- `docmosis-key` - Docmosis API access key

#### Dropbox (File Storage)
- `dropbox-token` - OAuth access token (production)
- `dropbox-token-staging` - OAuth access token (staging)
- `dropbox-app-key` - Dropbox app key
- `dropbox-app-secret` - Dropbox app secret
- `dropbox-refresh-token` - OAuth refresh token

#### SendGrid (Email)
- `sendgrid-api-key` - Production SendGrid API key
- `sendgrid-api-key-staging` - Staging SendGrid API key

### 4.4 Secret Configuration
- **Replication**: All secrets use automatic replication
- **Access**: Granted via service account IAM roles
- **Versioning**: All secrets support multiple versions (using `latest` in env vars)

---

## 5. Networking & Security

### 5.1 VPC Configuration

#### VPC Connector
- **Name**: `legal-forms-connector`
- **Usage**: python-pipeline (production only)
- **Purpose**: Private connectivity to internal Docmosis server at `10.128.0.3:8080`

### 5.2 Cloud SQL Connectivity
- **Method**: Cloud SQL Proxy via Unix socket
- **Production Path**: `/cloudsql/docmosis-tornado:us-central1:legal-forms-db`
- **Staging Path**: `/cloudsql/docmosis-tornado:us-central1:legal-forms-db-staging`
- **Benefits**: No need for IP whitelisting, encrypted connection, IAM authentication

### 5.3 Ingress Configuration
- **All Services**: Allow all ingress traffic (public internet)
- **No IP Restrictions**: Currently no allowlist/blocklist

### 5.4 Service-to-Service Communication
- **node-server** → **python-pipeline**: HTTP API calls
- **python-pipeline** → **Docmosis**: 
  - Production: Internal VPC (10.128.0.3:8080)
  - Staging: External HTTPS (us-app102.docmosis.com)

---

## 6. CI/CD & Deployment

### 6.1 Cloud Build Integration
- **Trigger**: GitHub Actions
- **Service Account**: `github-actions@docmosis-tornado.iam.gserviceaccount.com`
- **Build Artifacts**: Stored in `docmosis-tornado_cloudbuild` bucket
- **Container Registry**: `us-central1-docker.pkg.dev/docmosis-tornado/cloud-run-source-deploy/`

### 6.2 Deployment Pattern
- **Source**: GitHub repository
- **Build**: Cloud Build creates container images
- **Deploy**: Images pushed to Artifact Registry
- **Run**: Cloud Run deploys new revisions
- **Traffic**: 100% to latest revision (no gradual rollout currently)

### 6.3 Recent Deployments
- **node-server**: Revision 78 (2025-11-15)
- **node-server-staging**: Revision 60 (2025-11-15)
- **python-pipeline**: Revision 15 (2025-11-11)
- **python-pipeline-staging**: Revision 4 (2025-11-11)

---

## 7. External Integrations

### 7.1 Docmosis (Document Generation)
- **Production**: Internal server at `10.128.0.3:8080` (via VPC)
- **Staging**: Cloud service at `https://us-app102.docmosis.com/api/render`
- **Templates**: Stored in `docmosis-templates-liptonlegal` bucket

### 7.2 Dropbox (File Storage)
- **Production Path**: `/Current Clients`
- **Staging Path**: `/Current Clients/STAGING`
- **Authentication**: OAuth 2.0 with refresh tokens
- **Failure Handling**: Continue on failure (non-blocking)

### 7.3 SendGrid (Email)
- **Production Sender**: `notifications@liptonlegal.com` (Lipton Legal)
- **Staging Sender**: `staging-notifications@liptonlegal.com` (Lipton Legal [STAGING])
- **Configuration**: 
  - Max retries: 3
  - Retry delay: 1000ms
  - Enabled in both environments

---

## 8. Monitoring & Operations

### 8.1 Health Checks
- **Type**: TCP socket probe on port 8080
- **Startup Probe**:
  - Failure threshold: 1
  - Period: 240 seconds
  - Timeout: 240 seconds
- **Startup CPU Boost**: Enabled on all services

### 8.2 Logging
- **Platform**: Google Cloud Logging (native)
- **Log Collection**: Automatic from Cloud Run services
- **Project-level Logging**: Via `GCLOUD_PROJECT=docmosis-tornado` env var

### 8.3 Error Handling
- **Pipeline Failures**: Continue on failure (non-blocking)
- **Dropbox Failures**: Continue on failure (non-blocking)
- **Email Failures**: Retry up to 3 times with backoff

---

## 9. Cost Considerations

### 9.1 Current Infrastructure Costs (Estimated)

#### Compute (Cloud Run)
- **node-server**: ~$5-15/month (based on traffic, 1 vCPU, 1GB)
- **node-server-staging**: ~$2-5/month (lower traffic)
- **python-pipeline**: ~$10-20/month (2GB memory)
- **python-pipeline-staging**: ~$1-3/month
- **Total Compute**: ~$18-43/month

#### Database (Cloud SQL)
- **legal-forms-db** (db-f1-micro): ~$7.67/month (shared-core)
- **legal-forms-db-staging** (db-f1-micro): ~$7.67/month
- **Storage** (20 GB total): ~$3.40/month
- **Backups** (estimated 10 GB): ~$0.26/month
- **Total Database**: ~$19/month

#### Storage (Cloud Storage)
- **Estimated usage**: 50 GB across all buckets
- **Standard storage**: ~$1.00/month
- **Operations**: ~$0.50/month
- **Total Storage**: ~$1.50/month

#### Networking
- **VPC Connector**: ~$8.47/month (always-on)
- **Egress**: ~$1-5/month (depends on traffic)
- **Total Networking**: ~$9-13/month

#### Other Services
- **Secret Manager**: ~$0.30/month (15 secrets)
- **Cloud Build**: Included in free tier (120 build-minutes/day)

### 9.2 Estimated Current Total: **~$48-77/month**

### 9.3 External Service Costs (Not in GCP Bill)
- **Docmosis Cloud** (staging): Variable per document generation
- **SendGrid**: Depends on email volume
- **Dropbox**: Separate subscription

---

## 10. Security Posture

### 10.1 Strengths
✅ Secrets stored in Secret Manager (not hardcoded)  
✅ Separate production and staging environments  
✅ Cloud SQL connection via Unix socket (no public internet exposure from services)  
✅ Automated backups with 7-day retention  
✅ Service account used for deployments (GitHub Actions)  
✅ Container images in private Artifact Registry  
✅ VPC for internal service communication (production python-pipeline)  

### 10.2 Areas for Improvement
⚠️ Cloud SQL has public IPs exposed (both instances)  
⚠️ SSL not required for Cloud SQL connections  
⚠️ No deletion protection on databases  
⚠️ No high availability (single-zone databases)  
⚠️ Cloud Run services accept all ingress (no IP restrictions)  
⚠️ Some buckets use ACLs instead of uniform bucket-level access  
⚠️ No Cloud Armor / DDoS protection mentioned  
⚠️ No audit logging configuration visible  

---

## 11. Compliance & Data Handling

### 11.1 Data Residency
- **Primary Region**: us-central1 (Iowa, USA)
- **Multi-region Storage**: Only `docmosis-tornado_cloudbuild` bucket (US multi-region)
- **International Traffic**: None (all US-based)

### 11.2 Data Retention
- **Database Backups**: 7 days
- **Transaction Logs**: 7 days
- **Form Submissions** (production): 30 days (then auto-deleted)
- **Form Submissions** (staging): 90 days
- **Cloud Build Logs**: Default retention (90 days)
- **Bucket Soft Delete**: 7 days (all buckets)

### 11.3 Legal/Compliance Considerations
⚠️ **Client data** is stored in form submission buckets with lifecycle policies  
⚠️ Need to verify if 30-day retention meets legal requirements  
⚠️ Dropbox integration stores client files outside GCP  
⚠️ No mention of encryption keys (using Google-managed by default)  
⚠️ No audit logs configured for sensitive data access  

---

## 12. Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐         ┌─────────────────┐                       │
│  │   Internet   │────────▶│  node-server    │                       │
│  │   (HTTPS)    │         │  Cloud Run      │                       │
│  └──────────────┘         │  1 vCPU / 1 GB  │                       │
│                           └────────┬─────────┘                       │
│                                    │                                 │
│                           ┌────────▼─────────┐                       │
│                           │  legal-forms-db  │                       │
│                           │  PostgreSQL 15   │                       │
│                           │  db-f1-micro     │                       │
│                           └──────────────────┘                       │
│                                    │                                 │
│                           ┌────────▼──────────┐                      │
│                           │ python-pipeline   │                      │
│                           │ Cloud Run         │◀───VPC Connector     │
│                           │ 1 vCPU / 2 GB     │                      │
│                           └────────┬──────────┘                      │
│                                    │                                 │
│                           ┌────────▼──────────┐                      │
│                           │  Docmosis Server  │                      │
│                           │  10.128.0.3:8080  │                      │
│                           └───────────────────┘                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Cloud Storage Buckets:                                         │ │
│  │  • docmosis-tornado-form-submissions (30-day lifecycle)        │ │
│  │  • docmosis-templates-liptonlegal                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ External Integrations:                                         │ │
│  │  • Dropbox: /Current Clients                                   │ │
│  │  • SendGrid: notifications@liptonlegal.com                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          STAGING ENVIRONMENT                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐         ┌──────────────────────┐                  │
│  │   Internet   │────────▶│ node-server-staging  │                  │
│  │   (HTTPS)    │         │ Cloud Run            │                  │
│  └──────────────┘         │ 1 vCPU / 1 GB        │                  │
│                           └────────┬──────────────┘                  │
│                                    │                                 │
│                           ┌────────▼──────────────┐                  │
│                           │ legal-forms-db-staging│                  │
│                           │ PostgreSQL 14         │                  │
│                           │ db-f1-micro           │                  │
│                           └───────────────────────┘                  │
│                                    │                                 │
│                           ┌────────▼──────────────┐                  │
│                           │ python-pipeline-stage │                  │
│                           │ Cloud Run             │                  │
│                           │ 1 vCPU / 2 GB         │                  │
│                           └────────┬──────────────┘                  │
│                                    │                                 │
│                           ┌────────▼──────────────┐                  │
│                           │ Docmosis Cloud API    │                  │
│                           │ (External HTTPS)      │                  │
│                           └───────────────────────┘                  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Cloud Storage Buckets:                                         │ │
│  │  • docmosis-tornado-form-submissions-staging (90-day lifecycle)│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ External Integrations:                                         │ │
│  │  • Dropbox: /Current Clients/STAGING                           │ │
│  │  • SendGrid: staging-notifications@liptonlegal.com             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           SHARED RESOURCES                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Secret Manager (15 secrets total)                            │   │
│  │  • Database credentials (prod + staging)                     │   │
│  │  • API tokens (prod + staging)                               │   │
│  │  • Docmosis, Dropbox, SendGrid keys                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ CI/CD Pipeline                                                │   │
│  │  • GitHub Actions → Cloud Build → Artifact Registry → Deploy│   │
│  │  • Service Account: github-actions@...                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Shared Buckets                                                │   │
│  │  • docmosis-tornado_cloudbuild (build artifacts)              │   │
│  │  • run-sources-docmosis-tornado-us-central1 (source code)     │   │
│  │  • docmosis-tornado-db-migration (DB scripts)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. Next Steps for Client Intake System

### 13.1 Infrastructure Additions Needed

#### Database Changes
- ✅ **Already have**: PostgreSQL production and staging databases
- ❌ **Need to add**: 5 new tables for intake system:
  1. `intake_submissions` - Main submission records
  2. `intake_page_1` - Page 1 data (JSONB)
  3. `intake_page_2` - Page 2 data (JSONB)
  4. `intake_page_3` - Page 3 data (JSONB)
  5. `intake_page_4` - Page 4 data (JSONB)
  6. `intake_page_5` - Page 5 data (JSONB)
  7. `saved_sessions` - Resume tokens for save/resume functionality
  8. `attorneys` - Attorney user accounts and permissions

#### Cloud Run Services
**Option A**: Add routes to existing `node-server` service
- Pros: No new service, leverage existing infrastructure
- Cons: Couples intake form with existing system

**Option B**: Create new `intake-form` Cloud Run service
- Pros: Isolated, independent scaling, cleaner separation
- Cons: Additional cost (~$5-10/month), more complexity

**Recommendation**: Option A for MVP, migrate to Option B if intake system grows

#### Storage
- ✅ **Already have**: `docmosis-tornado-form-submissions` bucket
- ✅ Can reuse for client-uploaded documents post-submission
- ❌ **Consider adding**: Separate bucket for intake-specific uploads if needed

#### Authentication
- ❌ **Need to add**: Attorney authentication system
  - Option 1: Firebase Authentication
  - Option 2: Cloud Identity Platform
  - Option 3: Custom JWT-based auth in Node service
- ❌ **Need to add**: IAM roles for attorneys vs. clients (read-only public access for clients)

#### Secrets
- ✅ **Already have**: Secret Manager configured
- ⚠️ **May need**: Additional secrets for attorney auth (e.g., JWT secret, OAuth client secrets)

### 13.2 Estimated Additional Costs

**Client Intake System Additions**:
- Database storage: +2 GB → +$0.34/month
- Cloud Run traffic: +20% → +$3-6/month (assuming existing service)
- Storage (client uploads): +10 GB → +$0.20/month
- **Total Additional**: ~$4-7/month

**New Total with Intake System**: ~$52-84/month

### 13.3 Security Enhancements Needed
1. **Attorney Authentication**: JWT or session-based auth
2. **RBAC**: Role-based access control (attorneys vs. clients vs. admins)
3. **Rate Limiting**: Prevent form spam/abuse
4. **CSRF Protection**: For form submissions
5. **Input Validation**: Comprehensive server-side validation
6. **Audit Logging**: Track who accesses/modifies intake submissions

---

## 14. Risk Assessment

### 14.1 High Priority Risks

#### Database Risks
🔴 **Single-Zone Databases**: No high availability (99.5% SLA vs. 99.95% for HA)
- **Impact**: Potential downtime during maintenance or zone failures
- **Mitigation**: Upgrade to regional (HA) configuration for production
- **Cost**: +$7.67/month → $15.34/month total

🔴 **Public IP Exposure**: Databases have public IPs
- **Impact**: Potential attack surface
- **Mitigation**: Disable public IPs, use Private IP + VPC
- **Cost**: Free (but requires VPC configuration)

#### Compute Risks
🟡 **No Gradual Rollout**: 100% traffic to new revisions immediately
- **Impact**: Bad deployment affects all users instantly
- **Mitigation**: Implement gradual traffic migration (e.g., 10% → 50% → 100%)
- **Cost**: Free (Cloud Run feature)

🟡 **Auto-scaling Limits**: Max 10 instances
- **Impact**: Might not handle sudden traffic spikes
- **Mitigation**: Increase max instances or add Cloud CDN
- **Cost**: Pay-per-use (scales with traffic)

#### Security Risks
🟡 **No IP Restrictions**: All services accept public traffic
- **Impact**: Potential DDoS or abuse
- **Mitigation**: Cloud Armor WAF, allowlist attorney IPs for portal
- **Cost**: Cloud Armor starts at ~$5/month

🟡 **No Audit Logging**: Can't track sensitive data access
- **Impact**: Compliance issues, can't investigate breaches
- **Mitigation**: Enable Cloud Audit Logs
- **Cost**: ~$1-5/month depending on volume

### 14.2 Medium Priority Risks

🟢 **Data Retention**: 30-day auto-delete on form submissions
- **Impact**: Might violate legal retention requirements
- **Mitigation**: Review with legal team, extend retention if needed
- **Cost**: Storage cost increases proportionally

🟢 **No Deletion Protection**: Databases can be accidentally deleted
- **Impact**: Catastrophic data loss
- **Mitigation**: Enable deletion protection
- **Cost**: Free

🟢 **Staging Uses Different PostgreSQL Version**: Prod=15, Staging=14
- **Impact**: Potential incompatibilities during testing
- **Mitigation**: Upgrade staging to PostgreSQL 15
- **Cost**: Free

---

## 15. Recommendations

### 15.1 Immediate Actions (Week 0-1)
1. ✅ Document current infrastructure (THIS DOCUMENT)
2. ⚠️ Enable deletion protection on both databases
3. ⚠️ Upgrade staging database to PostgreSQL 15 (match production)
4. ⚠️ Review data retention policies with legal team
5. ⚠️ Plan database schema changes for intake system

### 15.2 Short-Term (Week 1-3)
1. Create intake system database tables
2. Add attorney authentication system
3. Configure audit logging
4. Implement gradual traffic rollout in CI/CD
5. Test intake form integration with existing node-server

### 15.3 Medium-Term (Week 4-9)
1. Add input validation and rate limiting
2. Implement RBAC for attorneys
3. Consider HA database upgrade (if budget allows)
4. Add monitoring dashboards for intake system
5. Load testing and performance optimization

### 15.4 Long-Term (Post-Launch)
1. Evaluate Cloud Armor for DDoS protection
2. Consider private IP for databases (remove public IPs)
3. Implement disaster recovery plan
4. Regular security audits
5. Cost optimization (reserved instances if usage is predictable)

---

## Document Version History
- **v1.0** - 2025-11-17 - Initial infrastructure documentation (Ryan Haines)

---

## Appendix A: Useful Commands

### View Cloud Run Service Details
```bash
gcloud run services describe SERVICE_NAME --region=us-central1 --format=yaml
```

### View Cloud SQL Instance Details
```bash
gcloud sql instances describe INSTANCE_NAME
```

### List Secrets
```bash
gcloud secrets list
```

### View IAM Policies
```bash
gcloud projects get-iam-policy docmosis-tornado
```

### View Recent Cloud Run Revisions
```bash
gcloud run revisions list --service=SERVICE_NAME --region=us-central1 --limit=5
```

### Get Cloud SQL Connection Name
```bash
gcloud sql instances describe INSTANCE_NAME --format="value(connectionName)"
```

### Estimate Monthly Costs
```bash
gcloud billing accounts list
gcloud billing budgets list --billing-account=ACCOUNT_ID
```

---

**END OF DOCUMENT**
