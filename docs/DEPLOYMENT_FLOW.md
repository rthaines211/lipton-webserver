# Deployment Flow Diagram

## Current Staging-First Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PUSH TO MAIN BRANCH                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ✓ Code Quality (Linting, Formatting, Complexity)                  │
│  ✓ Testing (Unit, Integration, E2E with Playwright)                │
│  ✓ Security (Audit, Secret Scan, Container Scan)                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│            BUILD ARTIFACTS (Development, Staging, Prod)             │
│                                                                       │
│  • Creates Docker images for each environment                       │
│  • Tags: staging-{sha}, production-{sha}                           │
│  • Uploads build artifacts to GitHub                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🚀 DEPLOY TO STAGING                             │
│                      (AUTOMATIC)                                     │
│                                                                       │
│  Environment: node-server-staging                                   │
│  URL: https://node-server-staging-zyiwmzwenq-uc.a.run.app          │
│  Database: legal-forms-db-staging                                   │
│  Secrets: Staging versions (DB_PASSWORD_STAGING, etc.)             │
│                                                                       │
│  Actions:                                                            │
│  ✓ Deploys to Cloud Run                                            │
│  ✓ Runs smoke tests                                                │
│  ✓ Validates deployment                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ⏸️  WAIT FOR APPROVAL                            │
│                     (MANUAL GATE)                                    │
│                                                                       │
│  GitHub Actions shows: "Review deployments"                         │
│                                                                       │
│  Required Actions:                                                   │
│  1. Review staging deployment                                       │
│  2. Check staging logs for errors                                   │
│  3. Test staging functionality                                      │
│  4. Approve production deployment                                   │
│                                                                       │
│  Approvers: [Configure in GitHub Settings]                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  🚀 DEPLOY TO PRODUCTION                            │
│              (AFTER MANUAL APPROVAL)                                │
│                                                                       │
│  Environment: node-server                                           │
│  URL: https://node-server-zyiwmzwenq-uc.a.run.app                  │
│  Database: legal-forms-db                                           │
│  Secrets: Production versions (DB_PASSWORD, ACCESS_TOKEN, etc.)    │
│                                                                       │
│  Actions:                                                            │
│  ✓ Deploys to Cloud Run                                            │
│  ✓ Runs production smoke tests                                     │
│  ✓ Sends deployment notification                                   │
│  ✓ Updates production traffic                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                           ✅ COMPLETE
```

---

## Key Safety Features

### 1. **Sequential Dependency Chain**
```yaml
deploy-production:
  needs: [build, deploy-staging]  # Must wait for staging
```
- Production **cannot** deploy until staging succeeds
- If staging fails, production is automatically blocked

### 2. **Environment Protection**
```yaml
environment:
  name: production
  url: https://node-server-zyiwmzwenq-uc.a.run.app
```
- GitHub enforces manual approval
- Only authorized reviewers can approve
- Deployment cannot proceed without approval

### 3. **Branch Restrictions**
```yaml
if: github.ref == 'refs/heads/main'
```
- Only `main` branch triggers staging/production
- `develop` branch only deploys to development
- Pull requests only run tests (no deployment)

---

## Parallel Deployment Strategy (Current)

```
BUILD JOB
    │
    ├─────────────────┬─────────────────┐
    │                 │                 │
    ▼                 ▼                 ▼
Development      Staging         Production
 (Image)         (Image)          (Image)
    │                 │                 │
    │                 │                 │
    ▼                 ▼                 │
 Deploy Dev      Deploy Staging        │
(on develop)      (on main)            │
                      │                 │
                      │                 │
                      └─────────┬───────┘
                                │
                                ▼
                        Deploy Production
                       (needs approval)
```

---

## Environment Configuration Files

### Staging Configuration
**File**: `config/staging.env`
```bash
# Loaded automatically during staging deployment
NODE_ENV=staging
CLOUD_RUN_SERVICE=node-server-staging
DB_CONNECTION=legal-forms-db-staging
# ... other staging-specific variables
```

### Production Configuration
**File**: `config/production.env`
```bash
# Loaded automatically during production deployment
NODE_ENV=production
CLOUD_RUN_SERVICE=node-server
DB_CONNECTION=legal-forms-db
# ... other production-specific variables
```

---

## Smoke Test Strategy

### Staging Smoke Tests (Line 442-446)
After staging deploys, automated tests verify:
- ✓ Service is responding
- ✓ Health checks pass
- ✓ Database connectivity
- ✓ API endpoints accessible

### Production Smoke Tests (Line 506-509)
After production deploys, automated tests verify:
- ✓ Production URL responds
- ✓ Critical paths functional
- ✓ No immediate errors in logs

---

## Manual Testing Checklist (Before Production Approval)

Before approving production deployment, test staging:

### 1. Functional Testing
- [ ] Form submission works
- [ ] Document generation succeeds
- [ ] Email notifications sent
- [ ] Dropbox uploads complete
- [ ] Database queries return correct data

### 2. Integration Testing
- [ ] Node.js ↔ Python pipeline communication
- [ ] Database connections stable
- [ ] SendGrid email delivery
- [ ] Docmosis document rendering
- [ ] Dropbox file access

### 3. Performance Testing
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] Database query performance
- [ ] Container startup time

### 4. Error Handling
- [ ] Invalid form data rejected gracefully
- [ ] API errors logged properly
- [ ] User-facing error messages clear
- [ ] Rollback procedures documented

### 5. Log Review
```bash
# Check staging logs for errors
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)"
```

---

## Rollback Procedure

If issues discovered after production deployment:

### Option 1: Route Traffic to Previous Revision
```bash
# List revisions
gcloud run revisions list \
  --service=node-server \
  --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic node-server \
  --region=us-central1 \
  --to-revisions=node-server-00054-abc=100
```

### Option 2: Redeploy Previous Version
```bash
# Find previous successful deployment SHA
git log --oneline -10

# Trigger workflow with specific SHA (manual dispatch)
# Or revert commit and push
git revert HEAD
git push origin main
```

### Option 3: Emergency Hotfix
```bash
# Create hotfix branch
git checkout -b hotfix/critical-fix

# Make fixes
# ... edit files ...

# Push directly to main (if urgent)
git push origin hotfix/critical-fix
# Open PR and fast-track review
```

---

## Monitoring & Alerts

### Real-time Monitoring
- **GitHub Actions**: View workflow progress
- **Cloud Run Console**: Monitor request metrics
- **Cloud Logging**: Real-time log streaming

### Recommended Alerts
1. **Deployment Failures**: Notify on staging/prod deploy failures
2. **Error Rate Spike**: Alert if error rate > 5%
3. **High Latency**: Alert if p95 latency > 2s
4. **Low Availability**: Alert if uptime < 99.9%

### Slack Integration (Optional)
Add to workflow for notifications:
```yaml
- name: Send Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Production deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Quick Commands Reference

### View Active Deployments
```bash
# List all Cloud Run services
gcloud run services list --project=docmosis-tornado

# View specific service details
gcloud run services describe node-server-staging --region=us-central1
```

### Check Deployment Status
```bash
# View recent workflow runs
gh run list --limit 10

# View specific run details
gh run view <run-id>
```

### Test Endpoints
```bash
# Staging
curl -I https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Production
curl -I https://node-server-zyiwmzwenq-uc.a.run.app/health
```

---

## Success Criteria

✅ Deployment is successful when:
- All CI checks pass (quality, tests, security)
- Staging deploys without errors
- Staging smoke tests pass
- Manual staging testing confirms functionality
- Production approval granted by authorized reviewer
- Production deploys successfully
- Production smoke tests pass
- No errors in production logs (first 10 minutes)

---

## Team Responsibilities

### Developers
- Write tests for new features
- Test locally before pushing
- Monitor staging after deployment
- Document changes in PR descriptions

### Reviewers
- Review code quality and tests
- Verify staging deployment before production approval
- Check staging logs for errors
- Approve production deployment

### DevOps/SRE
- Monitor production metrics
- Respond to alerts
- Manage rollbacks if needed
- Update deployment documentation
