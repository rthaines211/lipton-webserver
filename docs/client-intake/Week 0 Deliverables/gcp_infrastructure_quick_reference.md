# GCP Infrastructure - Quick Reference Guide

## 🎯 Quick Facts
- **Project ID**: `docmosis-tornado`
- **Region**: `us-central1`
- **Environments**: Production + Staging (full parity)
- **Current Monthly Cost**: ~$48-77
- **With Intake System**: ~$52-84

---

## 📊 Current Infrastructure at a Glance

### Cloud Run Services (4 total)
| Service | Environment | CPU | Memory | Max Instances | Purpose |
|---------|------------|-----|--------|---------------|---------|
| node-server | Production | 1 | 1 GB | 10 | Main application |
| node-server-staging | Staging | 1 | 1 GB | 10 | Staging app |
| python-pipeline | Production | 1 | 2 GB | 10 | Document processing |
| python-pipeline-staging | Staging | 1 | 2 GB | 10 | Staging pipeline |

### Cloud SQL Databases (2 total)
| Instance | Version | Tier | Storage | Backups | Cost/Month |
|----------|---------|------|---------|---------|------------|
| legal-forms-db | PG 15 | db-f1-micro | 10 GB | 7 days | ~$8 |
| legal-forms-db-staging | PG 14 | db-f1-micro | 10 GB | 7 days | ~$8 |

### Cloud Storage Buckets (6 total)
| Bucket | Purpose | Lifecycle | Location |
|--------|---------|-----------|----------|
| docmosis-tornado-form-submissions | Form data (prod) | 30 days | us-central1 |
| docmosis-tornado-form-submissions-staging | Form data (staging) | 90 days | us-central1 |
| docmosis-templates-liptonlegal | Document templates | None | us-central1 |
| docmosis-tornado-db-migration | DB scripts | None | us-central1 |
| docmosis-tornado_cloudbuild | Build artifacts | Default | US (multi-region) |
| run-sources-docmosis-tornado-us-central1 | Source code | Default | us-central1 |

### Secret Manager (15 secrets)
- Database credentials (prod + staging)
- API tokens (prod + staging) 
- Docmosis API key
- Dropbox OAuth tokens (4 secrets)
- SendGrid API keys (prod + staging)

---

## 🔗 Key URLs

### Production
- **Node Server**: https://node-server-zyiwmzwenq-uc.a.run.app
- **Python Pipeline**: https://python-pipeline-zyiwmzwenq-uc.a.run.app
- **DB Connection**: `docmosis-tornado:us-central1:legal-forms-db`

### Staging
- **Node Server**: https://node-server-staging-zyiwmzwenq-uc.a.run.app
- **Python Pipeline**: https://python-pipeline-staging-zyiwmzwenq-uc.a.run.app
- **DB Connection**: `docmosis-tornado:us-central1:legal-forms-db-staging`

---

## ✅ What's Already Set Up (Good News!)

You have **excellent** infrastructure already in place:

1. ✅ **Dual environments** (prod + staging) - fully separated
2. ✅ **Auto-scaling Cloud Run services** - handles traffic spikes
3. ✅ **PostgreSQL databases** - production-grade, automated backups
4. ✅ **Secret Manager** - secure credential storage
5. ✅ **Cloud Storage** - file storage with lifecycle policies
6. ✅ **CI/CD pipeline** - GitHub Actions + Cloud Build
7. ✅ **Cloud SQL Proxy** - secure database connections
8. ✅ **VPC networking** - for internal Docmosis communication
9. ✅ **Email integration** - SendGrid already configured
10. ✅ **Document generation** - Docmosis pipeline working

**Completeness: 8.5/10** - You're in great shape!

---

## ❌ What's Needed for Client Intake System

### Critical (Must Have)
1. **Database Tables** (5 new tables + 2 supporting tables)
   - intake_submissions, intake_page_1-5, saved_sessions, attorneys
2. **Attorney Authentication**
   - Login system for attorney portal
   - JWT or session-based auth
3. **Frontend Routes**
   - Client intake form pages
   - Attorney dashboard/search portal
4. **RBAC/IAM**
   - Role-based access (attorneys vs. clients)

### Important (Should Have)
5. **Rate Limiting** - prevent form spam
6. **Input Validation** - comprehensive server-side checks
7. **CSRF Protection** - secure form submissions
8. **Audit Logging** - track who accessed what

### Nice to Have (Can Add Later)
9. **Cloud Armor** - DDoS protection (~$5/month)
10. **HA Database** - high availability upgrade (~$8/month more)
11. **Private IPs** - remove public database IPs
12. **Gradual Rollout** - staged deployments (10% → 100%)

---

## 💰 Cost Breakdown

### Current Monthly Costs
| Category | Cost/Month | Notes |
|----------|-----------|-------|
| **Cloud Run** | $18-43 | 4 services, varies with traffic |
| **Cloud SQL** | $19 | 2 databases + storage + backups |
| **Cloud Storage** | $1.50 | ~50 GB across buckets |
| **Networking** | $9-13 | VPC connector + egress |
| **Secret Manager** | $0.30 | 15 secrets |
| **Cloud Build** | $0 | Free tier (120 min/day) |
| **TOTAL** | **$48-77** | |

### With Client Intake System
| Additional Item | Cost/Month | Notes |
|----------------|-----------|-------|
| Database storage | +$0.34 | +2 GB for intake tables |
| Cloud Run traffic | +$3-6 | +20% traffic estimate |
| Storage (uploads) | +$0.20 | +10 GB client documents |
| **NEW TOTAL** | **$52-84** | Only ~$4-7/month more! |

### Optional Enhancements
| Enhancement | Cost/Month | Priority |
|-------------|-----------|----------|
| HA Database (prod only) | +$8 | Medium |
| Cloud Armor WAF | +$5-10 | Low-Medium |
| Audit Logging | +$1-5 | High |
| **With All Enhancements** | **$66-107** | |

---

## ⚠️ Top 3 Risks & Fixes

### 🔴 Risk #1: Database Has Public IP
**Impact**: Potential security vulnerability  
**Fix**: Disable public IPs, use Private IP + VPC  
**Cost**: Free (requires VPC setup)  
**Priority**: Medium (mitigated by Cloud SQL Proxy currently)

### 🔴 Risk #2: No High Availability
**Impact**: Downtime during maintenance or zone failures (99.5% → 99.95% SLA)  
**Fix**: Upgrade production DB to regional (HA) tier  
**Cost**: +$8/month  
**Priority**: Medium (depends on uptime requirements)

### 🟡 Risk #3: 100% Traffic to New Deployments
**Impact**: Bad deploy affects all users instantly  
**Fix**: Enable gradual rollout in Cloud Build/Run  
**Cost**: Free  
**Priority**: High (easy win)

---

## 🛠️ Next Steps for Week 0, Day 2

### Task 1: ✅ Define GCP Resource Requirements
**Status**: COMPLETE (see main document)

Key findings:
- Can reuse existing infrastructure (node-server)
- Need 7 new database tables
- Need attorney auth system
- Estimated +$4-7/month additional cost

### Task 2: Create Cost Estimate
**Status**: COMPLETE (see above)

Summary:
- Current: $48-77/month
- With intake: $52-84/month
- With enhancements: $66-107/month

### Task 3: Draft Security & Compliance Requirements
**Status**: Ready to start

Focus areas:
1. Attorney authentication & RBAC
2. Client data encryption (already using Google-managed keys)
3. Audit logging for sensitive data access
4. Rate limiting and input validation
5. CSRF protection for forms
6. Data retention policy review (30-day auto-delete OK?)

---

## 📁 Intake System Database Schema (Planned)

### Table 1: intake_submissions
```sql
CREATE TABLE intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_email VARCHAR(255) NOT NULL,
    attorney_id UUID REFERENCES attorneys(id),
    status VARCHAR(50) DEFAULT 'new',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmation_number VARCHAR(20) UNIQUE
);
```

### Tables 2-6: intake_page_1 through intake_page_5
```sql
CREATE TABLE intake_page_X (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES intake_submissions(id) ON DELETE CASCADE,
    page_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 7: saved_sessions
```sql
CREATE TABLE saved_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    session_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 8: attorneys
```sql
CREATE TABLE attorneys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'attorney',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);
```

**Total Storage Estimate**: ~2 GB (with indexes and growth room)

---

## 🎯 Implementation Strategy for Intake System

### Option A: Extend Existing node-server (RECOMMENDED)
**Pros**:
- Leverage existing infrastructure
- No new service to manage
- Shares database connection pool
- Minimal additional cost

**Cons**:
- Couples intake with existing system
- Shared scaling limits

**Steps**:
1. Add new routes to node-server
2. Create database migrations
3. Build frontend (React/Vue/vanilla JS)
4. Deploy via existing CI/CD

### Option B: New Standalone Service
**Pros**:
- Complete isolation
- Independent scaling
- Cleaner architecture

**Cons**:
- +$5-10/month cost
- More complexity
- Duplicate infrastructure

**Recommendation**: Start with Option A, migrate to Option B if needed

---

## 📞 Support & Resources

### GCP Console Links
- **Project**: https://console.cloud.google.com/home/dashboard?project=docmosis-tornado
- **Cloud Run**: https://console.cloud.google.com/run?project=docmosis-tornado
- **Cloud SQL**: https://console.cloud.google.com/sql/instances?project=docmosis-tornado
- **Storage**: https://console.cloud.google.com/storage/browser?project=docmosis-tornado
- **Secrets**: https://console.cloud.google.com/security/secret-manager?project=docmosis-tornado

### Useful gcloud Commands
```bash
# List all Cloud Run services
gcloud run services list

# Describe a service
gcloud run services describe node-server --region=us-central1

# List Cloud SQL instances
gcloud sql instances list

# Get current project
gcloud config get-value project

# View recent deployments
gcloud run revisions list --service=node-server --region=us-central1 --limit=5
```

---

## ✅ Week 0, Day 2 Completion Checklist

- [x] **Define GCP Resource Requirements** - See main document Section 13
- [x] **Create Cost Estimate** - Current: $48-77, With intake: $52-84
- [ ] **Draft Security & Compliance Requirements** - Next task!

---

**Document Created**: November 17, 2025  
**Last Updated**: November 17, 2025  
**Version**: 1.0
