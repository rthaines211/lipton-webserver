# Multi-Environment Architecture

## Overview

This document describes the multi-environment architecture for the Lipton Legal Form Application. The system uses environment parity to ensure staging accurately mirrors production, enabling safe testing before production deployments.

## Environment Strategy

### Three-Tier Environment Model

```
┌────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT                               │
│  Purpose: Local development and unit testing                   │
│  Deployment: Manual, from developer machines                   │
│  Data: Synthetic test data                                     │
│  Cost: Minimal (scale to zero when not used)                   │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                       STAGING                                   │
│  Purpose: Pre-production testing and QA                        │
│  Deployment: Automatic from main branch                        │
│  Data: Sanitized production data or synthetic                  │
│  Cost: ~$10-15/month                                           │
└────────────────────────────────────────────────────────────────┘
                               │
                     (Manual Approval)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                 │
│  Purpose: Live system serving real users                       │
│  Deployment: Automatic after staging approval                  │
│  Data: Real customer data                                       │
│  Cost: ~$100-150/month (based on usage)                        │
└────────────────────────────────────────────────────────────────┘
```

## Detailed Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                        │
│                  Project: docmosis-tornado                       │
│                  Region: us-central1                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              CLOUD RUN SERVICES                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  node-server                    python-pipeline          │  │
│  │  ├─ Memory: 1Gi                ├─ Memory: 4Gi            │  │
│  │  ├─ CPU: 1                     ├─ CPU: 2                 │  │
│  │  ├─ Min: 1 instance            ├─ Min: 0 instances       │  │
│  │  ├─ Max: 10 instances          ├─ Max: 10 instances      │  │
│  │  └─ Port: 8080                 └─ Port: 8080             │  │
│  │           │                              ▲                │  │
│  │           └──────────────────────────────┘                │  │
│  │               (HTTP/Service-to-Service)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           CLOUD SQL - PostgreSQL 14                       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Instance: legal-forms-db                                 │  │
│  │  Tier: db-n1-standard-1                                   │  │
│  │  Database: legal_forms_db                                 │  │
│  │  User: app-user                                           │  │
│  │  Backups: 30 days, Point-in-time recovery                │  │
│  │  Availability: Regional (HA)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           CLOUD STORAGE                                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Bucket: docmosis-tornado-form-submissions                │  │
│  │  Lifecycle: Delete after 365 days                         │  │
│  │  Versioning: Enabled                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           SECRET MANAGER                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • DB_PASSWORD                                            │  │
│  │  • ACCESS_TOKEN                                           │  │
│  │  • sendgrid-api-key                                       │  │
│  │  • dropbox-token                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           EXTERNAL SERVICES                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Dropbox: /Current Clients                              │  │
│  │  • SendGrid: notifications@liptonlegal.com                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Staging Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                           │
│                  Project: docmosis-tornado                       │
│                  Region: us-central1                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              CLOUD RUN SERVICES                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  node-server-staging            python-pipeline-staging  │  │
│  │  ├─ Memory: 1Gi                ├─ Memory: 2Gi            │  │
│  │  ├─ CPU: 1                     ├─ CPU: 1                 │  │
│  │  ├─ Min: 0 instances           ├─ Min: 0 instances       │  │
│  │  ├─ Max: 5 instances           ├─ Max: 3 instances       │  │
│  │  └─ Port: 8080                 └─ Port: 8080             │  │
│  │           │                              ▲                │  │
│  │           └──────────────────────────────┘                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           CLOUD SQL - PostgreSQL 14                       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Instance: legal-forms-db-staging                         │  │
│  │  Tier: db-f1-micro (cost-optimized)                      │  │
│  │  Database: legal_forms_db_staging                         │  │
│  │  User: app-user-staging                                   │  │
│  │  Backups: 7 days                                          │  │
│  │  Availability: Zonal (non-HA)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           CLOUD STORAGE                                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Bucket: docmosis-tornado-form-submissions-staging        │  │
│  │  Lifecycle: Delete after 90 days                          │  │
│  │  Versioning: Disabled                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           SECRET MANAGER                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • DB_PASSWORD_STAGING                                    │  │
│  │  • ACCESS_TOKEN_STAGING                                   │  │
│  │  • sendgrid-api-key-staging                               │  │
│  │  • dropbox-token-staging                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           EXTERNAL SERVICES                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • Dropbox: /Staging/Current Clients                      │  │
│  │  • SendGrid: staging-notifications@liptonlegal.com        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      DEVELOPER WORKFLOW                           │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Git Push (main)   │
                    └─────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS - CI/CD PIPELINE                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 1: Quality & Security                              │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Code Linting (ESLint)                                  │  │
│  │  • Code Formatting (Prettier)                             │  │
│  │  • Security Audit (npm audit)                             │  │
│  │  • Secret Scanning                                        │  │
│  │  Duration: ~2 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (pass)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 2: Automated Testing                               │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Unit Tests                                             │  │
│  │  • Integration Tests (with PostgreSQL)                    │  │
│  │  • E2E Tests (Playwright)                                 │  │
│  │  Duration: ~5 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (pass)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 3: Container Security                              │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Build Docker image                                     │  │
│  │  • Trivy vulnerability scan                               │  │
│  │  • Upload results to GitHub Security                      │  │
│  │  Duration: ~3 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (pass)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 4: Build for All Environments                      │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Build: development image                               │  │
│  │  • Build: staging image                                   │  │
│  │  • Build: production image                                │  │
│  │  • Push to Container Registry (gcr.io)                    │  │
│  │  Duration: ~5 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (pass)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 5: Deploy to Staging (AUTOMATIC)                   │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Load config/staging.env                                │  │
│  │  • Deploy node-server-staging                             │  │
│  │  • Connect to legal-forms-db-staging                      │  │
│  │  • Use STAGING secrets                                    │  │
│  │  • Run smoke tests                                        │  │
│  │  Duration: ~3 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (pass)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 6: Manual Approval Gate                            │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  GitHub Environment Protection Rule:                      │  │
│  │  • Requires approval from: DevOps team                    │  │
│  │  • Reviewers verify staging tests passed                  │  │
│  │  • Can rollback if issues found                           │  │
│  │  Duration: Manual (hours to days)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼ (approved)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  STAGE 7: Deploy to Production                            │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  • Load config/production.env                             │  │
│  │  • Deploy node-server                                     │  │
│  │  • Connect to legal-forms-db                              │  │
│  │  • Use PRODUCTION secrets                                 │  │
│  │  • Run smoke tests                                        │  │
│  │  • Send deployment notification                           │  │
│  │  Duration: ~3 minutes                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Production Live!   │
                    └─────────────────────┘
```

## Resource Comparison

### Infrastructure Sizing

| Resource | Production | Staging | Reasoning |
|----------|-----------|---------|-----------|
| **Node Server** | | | |
| Memory | 1Gi | 1Gi | Same (minimal) |
| CPU | 1 | 1 | Same |
| Min Instances | 1 | 0 | Staging scales to zero |
| Max Instances | 10 | 5 | Lower traffic in staging |
| **Python Pipeline** | | | |
| Memory | 4Gi | 2Gi | Reduced for cost |
| CPU | 2 | 1 | Reduced for cost |
| Max Instances | 10 | 3 | Lower concurrency |
| **Cloud SQL** | | | |
| Tier | db-n1-standard-1 | db-f1-micro | Smallest tier for staging |
| Availability | Regional (HA) | Zonal | No HA needed |
| Backups | 30 days | 7 days | Shorter retention |
| Point-in-time | Enabled | Disabled | Cost savings |
| **Storage** | | | |
| Lifecycle | 365 days | 90 days | Faster cleanup |
| Versioning | Enabled | Disabled | Cost savings |

### Cost Breakdown

| Environment | Monthly Cost | Breakdown |
|-------------|-------------|-----------|
| **Production** | $100-150 | • Cloud SQL: $45<br>• Cloud Run: $40-80<br>• Storage: $5<br>• Networking: $10 |
| **Staging** | $10-15 | • Cloud SQL: $7.67<br>• Cloud Run: $2-5<br>• Storage: $0.50<br>• Networking: $1 |
| **Total** | **$110-165** | Staging adds only 10% to infrastructure cost |

## Configuration Differences

### Environment Variables

| Variable | Production | Staging | Development |
|----------|-----------|---------|-------------|
| `NODE_ENV` | production | staging | development |
| `DB_HOST` | .../legal-forms-db | .../legal-forms-db-staging | localhost |
| `DROPBOX_BASE_PATH` | /Current Clients | /Staging/Current Clients | /Dev/Clients |
| `EMAIL_FROM_ADDRESS` | notifications@... | staging-notifications@... | dev-notifications@... |
| `EMAIL_FROM_NAME` | Lipton Legal | Lipton Legal [STAGING] | Lipton Legal [DEV] |
| `GCS_BUCKET_NAME` | ...-submissions | ...-submissions-staging | ...-submissions-dev |

### Secrets

| Secret | Production | Staging | Shared? |
|--------|-----------|---------|---------|
| Database Password | `DB_PASSWORD` | `DB_PASSWORD_STAGING` | ❌ |
| Access Token | `ACCESS_TOKEN` | `ACCESS_TOKEN_STAGING` | ❌ |
| SendGrid Key | `sendgrid-api-key` | `sendgrid-api-key-staging` | ✅* |
| Dropbox Token | `dropbox-token` | `dropbox-token-staging` | ✅* |

*Can be shared but recommended to use separate credentials

## Security Considerations

### Isolation Principles

1. **Separate Databases**
   - Prevents staging tests from affecting production data
   - Different credentials and access controls

2. **Separate Secrets**
   - Compromised staging credentials don't affect production
   - Different access tokens for API authentication

3. **Separate Storage**
   - File uploads in staging don't mix with production
   - Lifecycle policies prevent staging data accumulation

4. **Separate Service Accounts**
   - Different IAM permissions per environment
   - Principle of least privilege

### Data Protection

1. **Production Data → Staging**
   - ⚠️ **Never copy production data to staging without sanitization**
   - Remove PII (personally identifiable information)
   - Anonymize sensitive fields
   - Comply with GDPR, HIPAA, etc.

2. **Staging Data Lifecycle**
   - Auto-delete after 90 days
   - No long-term retention
   - Clear staging data regularly

3. **Access Control**
   - Limit who can access production
   - Staging can be more open for testing
   - Audit access logs

## Deployment Best Practices

### 1. Development Workflow

```bash
# 1. Make changes locally
git checkout -b feature/my-new-feature

# 2. Test locally
npm test
npm run dev

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature

# 4. Create pull request
# 5. After review, merge to main
# 6. Staging auto-deploys from main
# 7. Test in staging
# 8. Approve production deployment
```

### 2. Rollback Strategy

```bash
# List revisions
gcloud run revisions list --service=node-server --region=us-central1

# Rollback to previous
gcloud run services update-traffic node-server \
  --to-revisions=node-server-00054-xyz=100 \
  --region=us-central1
```

### 3. Monitoring

- **Production**: Alert on all errors, 99.9% uptime SLA
- **Staging**: Monitor but don't alert, used for testing
- **Development**: Local logs only

## Future Enhancements

### 1. Additional Environments

- **Preview Environments**: Ephemeral environments per PR
- **Load Testing**: Dedicated environment for performance tests
- **DR (Disaster Recovery)**: Separate region for failover

### 2. Infrastructure as Code

- Migrate from bash scripts to Terraform
- Version control infrastructure changes
- Enable infrastructure testing

### 3. Advanced Deployment

- Blue/Green deployments
- Canary releases (10% → 50% → 100%)
- Progressive delivery with feature flags

### 4. Observability

- Distributed tracing (OpenTelemetry)
- Centralized logging (Cloud Logging)
- APM (Application Performance Monitoring)

## Quick Reference Commands

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production

# View staging logs
gcloud run services logs read node-server-staging --region=us-central1

# View production logs
gcloud run services logs read node-server --region=us-central1

# Test staging
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Test production
curl https://node-server-zyiwmzwenq-uc.a.run.app/health

# Connect to staging database
gcloud sql connect legal-forms-db-staging --user=app-user-staging

# Connect to production database
gcloud sql connect legal-forms-db --user=app-user
```

## Related Documentation

- [Staging Environment Guide](STAGING_ENVIRONMENT_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [CI/CD Workflows](operations/CI_CD_WORKFLOWS.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)

---

**Last Updated:** October 27, 2025
**Version:** 1.0
