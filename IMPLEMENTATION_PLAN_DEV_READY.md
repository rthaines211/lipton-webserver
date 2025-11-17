# Client Intake System - Dev-Ready Implementation Plan
**Version:** 3.0 (Development Environment Optimized)
**Project:** Lipton Legal Group - Client Intake Integration
**Timeline:** 9 weeks (Starting November 18, 2025)
**Developer:** Ryan Haines
**Environment:** dev/intake-system branch → node-server-dev

---

## 🚀 Quick Start Checklist

Before starting Week 1:
- [x] Dev environment created (legal-forms-db-dev, node-server-dev)
- [x] GitHub Actions configured for auto-deploy
- [x] Secrets in Secret Manager (DB_PASSWORD_DEV, ACCESS_TOKEN_DEV)
- [ ] Database migration file created
- [ ] Dev branch created: `git checkout -b dev/intake-system`
- [ ] First deploy tested: `git push origin dev/intake-system`

---

## 📋 Executive Summary

### What Changed from Version 2.0
- ✅ **Dev-specific workflows**: Every task includes git commands and deploy steps
- ✅ **Database-first approach**: Create tables Week 1, Day 1 (not Week 3)
- ✅ **Testing commands**: Specific curl commands for each feature
- ✅ **Daily breakdown**: Hour-by-hour tasks with Claude Code prompts
- ✅ **Rollback plans**: How to undo changes if something breaks

### Development Flow for Every Feature
```
1. Create feature branch: git checkout -b dev/feature-name
2. Make changes with Claude Code
3. Test locally (if possible) or commit for dev test
4. Commit: git add . && git commit -m "feat: description"
5. Push: git push origin dev/feature-name
6. Wait 3-5 minutes for auto-deploy
7. Test on dev URL: curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/endpoint
8. Check logs: gcloud run logs read node-server-dev --region=us-central1 --limit=50
9. Fix issues and repeat
10. When ready: merge to staging branch
```

---

## 📅 Week-by-Week Implementation

### WEEK 1: Database Setup & Initial Refactoring
**Goal:** Create all database tables, begin extracting routes from server.js

| Day | Task | Deliverable | Dev Commands | Testing |
|-----|------|-------------|--------------|---------|
| **Monday** | Create database migration | 9 intake tables created | `gcloud sql connect legal-forms-db-dev --user=app-user-dev`<br>`\i migrations/001_create_intake_tables.sql`<br>`\dt` (verify 9 tables) | `SELECT * FROM intake_submissions;` |
| **Tuesday** | Extract health check routes | routes/health.js | `git add routes/health.js`<br>`git commit -m "refactor: extract health routes"`<br>`git push origin dev/intake-system` | `curl https://node-server-dev-*/health` |
| **Wednesday** | Extract form submission routes | routes/forms.js | Same git workflow | Test existing form endpoints still work |
| **Thursday** | Create database service layer | services/database.js | Same git workflow | Test DB connection pool |
| **Friday** | Create intake service skeleton | services/intake-service.js | Same git workflow | Unit tests for service methods |

**Week 1 Claude Code Prompts:**
```
Monday: "Create a PostgreSQL migration file that creates 9 tables for the intake system based on the requirements: intake_submissions (main table with 30 columns including client info), intake_page_1 through intake_page_5 (JSONB storage for each page), saved_sessions (for resume tokens), attorneys (user accounts), and audit_logs (tracking table). Include proper indexes and foreign keys."

Tuesday: "Extract all health check routes from server.js into a new file routes/health.js using Express Router. Include /health, /health/ready, and /health/detailed endpoints. Update server.js to use the new router."
```

---

### WEEK 2: Complete Refactoring & Service Layer
**Goal:** Finish modularizing server.js, create service architecture

| Day | Task | Deliverable | Dev Commands | Testing |
|-----|------|-------------|--------------|---------|
| **Monday** | Extract authentication middleware | middleware/auth.js | Deploy & test | Test ACCESS_TOKEN validation |
| **Tuesday** | Extract email service | services/email-service.js | Deploy & test | Send test email |
| **Wednesday** | Create validation middleware | middleware/validation.js | Deploy & test | Test input validation |
| **Thursday** | Extract document routes | routes/documents.js | Deploy & test | Test doc generation |
| **Friday** | Integration testing | All routes working | Full system test | End-to-end test suite |

**Testing Checkpoint:**
```bash
# Test all endpoints still work after refactoring
curl https://node-server-dev-*/health
curl https://node-server-dev-*/api/form-entries
# Verify logs show modular structure
gcloud run logs read node-server-dev --region=us-central1 --limit=100 | grep "route"
```

---

### WEEK 3: Intake Form Backend
**Goal:** Build complete intake submission API

| Day | Task | Files Created | Testing Commands |
|-----|------|---------------|------------------|
| **Monday** | Create intake submission endpoint | routes/intake.js<br>POST /api/intake/submit | `curl -X POST https://node-server-dev-*/api/intake/submit -H "Content-Type: application/json" -d '{"firstName":"Test","lastName":"User","email":"test@example.com"}'` |
| **Tuesday** | Add field validation | middleware/intake-validation.js | Test with invalid data, verify 400 errors |
| **Wednesday** | Create save/resume functionality | POST /api/intake/save<br>GET /api/intake/resume/:token | Test save returns token, resume retrieves data |
| **Thursday** | Add file upload handling | POST /api/intake/upload | Test with multipart/form-data |
| **Friday** | Email confirmation system | intake-confirmation template | Verify email received in SendGrid |

**Database Verification:**
```sql
-- Connect to dev database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

-- Check submissions are saved
SELECT id, client_email, created_at FROM intake_submissions ORDER BY created_at DESC LIMIT 5;

-- Check page data is stored
SELECT intake_id, page_number, page_data FROM intake_page_data WHERE intake_id = 1;
```

---

### WEEK 4-5: Intake Form Frontend
**Goal:** Build the complete 25-section client intake form

| Section Groups | Components | Testing Focus |
|----------------|------------|---------------|
| **Week 4, Days 1-2** | Sections 1-5: Personal & Contact Info | Auto-save to localStorage |
| **Week 4, Days 3-4** | Sections 6-10: Property & Household | Dynamic household member addition |
| **Week 4, Day 5** | Sections 11-15: Building Issues | Checkbox state management |
| **Week 5, Days 1-2** | Sections 16-20: Health & Harassment | Conditional field display |
| **Week 5, Days 3-4** | Sections 21-25: Documents & Additional | File upload preview |
| **Week 5, Day 5** | Integration & Testing | Full form submission flow |

**Frontend Testing:**
```javascript
// Test auto-save is working
localStorage.getItem('intakeFormData') // Should have saved data

// Test form submission
document.querySelector('#intakeForm').submit() // Should POST to /api/intake/submit

// Verify validation messages appear
document.querySelector('input[name="email"]').value = 'invalid'
document.querySelector('input[name="email"]').blur() // Should show error
```

---

### WEEK 6: Attorney Portal & Search
**Goal:** Build attorney search modal and intake management

| Day | Task | Endpoint/Component | Testing |
|-----|------|-------------------|---------|
| **Monday** | Create attorney auth endpoints | POST /api/attorney/login<br>GET /api/attorney/verify | Test JWT generation and validation |
| **Tuesday** | Build search API | GET /api/intake/search?q=smith&status=new | Test search filters and pagination |
| **Wednesday** | Create search modal UI | Modal component with filters | Test modal open/close, responsive design |
| **Thursday** | Implement intake selection | GET /api/intake/:id/doc-gen-format | Test data transformation to doc gen format |
| **Friday** | Status management | PUT /api/intake/:id/status | Test status updates and audit logging |

**Attorney Portal Testing:**
```bash
# Test attorney login
curl -X POST https://node-server-dev-*/api/attorney/login \
  -H "Content-Type: application/json" \
  -d '{"email":"attorney@liptonlegal.com","password":"test"}'

# Test search (with JWT token from login)
curl https://node-server-dev-*/api/intake/search?q=john&status=new \
  -H "Authorization: Bearer JWT_TOKEN_HERE"

# Test status update
curl -X PUT https://node-server-dev-*/api/intake/123/status \
  -H "Authorization: Bearer JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"status":"reviewing","notes":"Looks valid"}'
```

---

### WEEK 7: Field Mapping & Integration
**Goal:** Connect intake data to document generation system

| Day | Task | Component | Verification |
|-----|------|-----------|--------------|
| **Monday** | Create field mapping config | config/intake-field-mapping.js | Unit test mappings |
| **Tuesday** | Build mapping service | services/intake-mapper.js | Test transformation accuracy |
| **Wednesday** | Integrate with doc gen form | Update existing form population | Test form pre-fills correctly |
| **Thursday** | Handle complex mappings | Pest/building issue transformations | Verify all checkboxes map |
| **Friday** | Testing & refinement | End-to-end mapping test | 90% field coverage achieved |

**Mapping Verification:**
```javascript
// Test mapping service
const mapper = require('./services/intake-mapper');
const intakeData = { /* sample intake */ };
const docGenData = mapper.mapToDocGen(intakeData);
console.log('Mapped fields:', Object.keys(docGenData).length);
console.log('Coverage:', mapper.getCoverage(intakeData));
```

---

### WEEK 8: Testing & Security
**Goal:** Comprehensive testing, security hardening, performance optimization

| Day | Focus Area | Tasks | Success Criteria |
|-----|------------|-------|------------------|
| **Monday** | Security Audit | Add rate limiting, CSRF protection, XSS prevention | No OWASP Top 10 vulnerabilities |
| **Tuesday** | Unit Testing | Test all services and utilities | 80% code coverage |
| **Wednesday** | Integration Testing | Test API endpoints | All endpoints return correct status codes |
| **Thursday** | E2E Testing | Full user flows | Client can submit, attorney can retrieve |
| **Friday** | Performance Testing | Load testing, query optimization | < 500ms response times |

**Security Testing:**
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST https://node-server-dev-*/api/intake/submit -d '{}'
done
# Should get 429 after 5 attempts

# Test SQL injection protection
curl https://node-server-dev-*/api/intake/search?q='; DROP TABLE intake_submissions; --
# Should return 400 or sanitized results

# Test XSS prevention
curl -X POST https://node-server-dev-*/api/intake/submit \
  -d '{"firstName":"<script>alert(1)</script>"}'
# Should be escaped in response
```

---

### WEEK 9: Staging & Production Deployment
**Goal:** Move from dev → staging → production

| Day | Environment | Tasks | Verification |
|-----|-------------|-------|--------------|
| **Monday** | Staging Prep | Merge dev → staging, run migrations on staging DB | All features work in staging |
| **Tuesday** | Staging Testing | Full regression test suite | No critical bugs |
| **Wednesday** | Production Prep | Create prod migration scripts, backup prod DB | Rollback plan ready |
| **Thursday** | Production Deploy | Merge staging → main, deploy to production | Health checks pass |
| **Friday** | Monitoring | Set up alerts, verify metrics | System stable for 24 hours |

**Deployment Commands:**
```bash
# Monday: Deploy to staging
git checkout staging
git merge dev/intake-system
git push origin staging
# Verify: https://node-server-staging-*/health

# Thursday: Deploy to production
git checkout main
git merge staging
git push origin main
# Verify: https://node-server-zyiwmzwenq-uc.a.run.app/health

# Rollback if needed
gcloud run services update-traffic node-server \
  --to-revisions=node-server-PREVIOUS-REVISION=100 \
  --region=us-central1
```

---

## 📊 Daily Development Workflow

### Morning Routine (9:00 AM)
```bash
# 1. Check dev environment health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# 2. Pull latest changes
git pull origin dev/intake-system

# 3. Check deployment status
gcloud run services describe node-server-dev --region=us-central1 --format='value(status.conditions[0].message)'

# 4. Review overnight logs for errors
gcloud run logs read node-server-dev --region=us-central1 --limit=50 | grep ERROR
```

### Development Cycle (9:30 AM - 5:00 PM)
```bash
# 1. Start Claude Code for feature development
# "Create an endpoint for [specific feature]"

# 2. After Claude Code creates files
git status
git diff

# 3. Commit and deploy
git add .
git commit -m "feat: implement [feature]"
git push origin dev/intake-system

# 4. Wait for deployment (check GitHub Actions)
# https://github.com/[your-repo]/actions

# 5. Test the feature
curl https://node-server-dev-*/api/[endpoint]

# 6. Check logs if issues
gcloud run logs read node-server-dev --region=us-central1 --limit=50
```

### End of Day (5:00 PM)
```bash
# 1. Run test suite
npm test

# 2. Check database state
gcloud sql connect legal-forms-db-dev --user=app-user-dev
SELECT COUNT(*) FROM intake_submissions;
\q

# 3. Commit any pending work
git add .
git commit -m "wip: end of day checkpoint"
git push origin dev/intake-system

# 4. Document progress
echo "$(date): Completed [features]" >> DAILY_PROGRESS.md
```

---

## 🚨 Rollback Plans

### Database Rollback
```sql
-- Before any migration, create backup
pg_dump legal_forms_db_dev > backup_$(date +%Y%m%d).sql

-- Rollback migration
DROP TABLE IF EXISTS intake_submissions CASCADE;
DROP TABLE IF EXISTS intake_page_1 CASCADE;
-- etc for all tables

-- Restore from backup if needed
psql legal_forms_db_dev < backup_20251118.sql
```

### Code Rollback
```bash
# Revert last deployment
gcloud run services update-traffic node-server-dev \
  --to-revisions=node-server-dev-PREVIOUS=100 \
  --region=us-central1

# Revert git commits
git revert HEAD
git push origin dev/intake-system

# Force redeploy specific commit
git checkout SAFE_COMMIT_HASH
gcloud run deploy node-server-dev --source=. --region=us-central1
```

---

## 📈 Success Metrics & Checkpoints

### Week 1 Checkpoint
- ✅ All 9 database tables created
- ✅ Health routes extracted and working
- ✅ Basic service structure in place
- ✅ Can query intake_submissions table

### Week 3 Checkpoint
- ✅ Can submit intake via API
- ✅ Data saves to all tables correctly
- ✅ Email confirmation sends
- ✅ Save/resume tokens work

### Week 6 Checkpoint
- ✅ Full intake form renders
- ✅ Attorney can search intakes
- ✅ Modal selection works
- ✅ Form pre-population accurate

### Week 9 Checkpoint
- ✅ System live in production
- ✅ < 500ms response times
- ✅ Zero critical bugs
- ✅ 90% field mapping coverage

---

## 🔧 Configuration Files

### Environment Variables (Already Set)
```bash
# Development (node-server-dev)
NODE_ENV=development
DB_HOST=/cloudsql/docmosis-tornado:us-central1:legal-forms-db-dev
DB_NAME=legal_forms_db_dev
DB_USER=app-user-dev
DB_PASSWORD=[from Secret Manager]
ACCESS_TOKEN_DEV=[from Secret Manager]
SENDGRID_API_KEY=[existing key works]
```

### Required NPM Packages
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "express-rate-limit": "^6.10.0",
    "multer": "^1.4.5",
    "express-validator": "^7.0.0",
    "@sendgrid/mail": "^7.7.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "eslint": "^8.0.0"
  }
}
```

---

## 📝 Risk Mitigation

### High Risk Areas
1. **Database Migration Failure**
   - Mitigation: Test on dev first, keep backups
   - Rollback: Restore from backup

2. **Breaking Existing Doc Gen**
   - Mitigation: No changes to existing tables
   - Rollback: Revert code changes

3. **Performance Issues**
   - Mitigation: Add indexes, use pagination
   - Rollback: Scale up Cloud Run instances

### Monitoring Setup
```bash
# Set up alerts
gcloud alpha monitoring policies create \
  --notification-channels=[CHANNEL_ID] \
  --display-name="High Error Rate Alert" \
  --condition="resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
```

---

## 📚 Quick Reference

### Common Commands
```bash
# Deploy to dev
git push origin dev/intake-system

# View logs
gcloud run logs read node-server-dev --region=us-central1 --limit=50

# Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev

# Test endpoint
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/[endpoint]

# Check deployment status
gcloud run services describe node-server-dev --region=us-central1
```

### File Structure After Implementation
```
/Users/ryanhaines/Desktop/Lipton Webserver/
├── server.js (reduced to 200 lines)
├── routes/
│   ├── health.js (new)
│   ├── intake.js (new)
│   ├── forms.js (extracted)
│   ├── documents.js (extracted)
│   └── attorney.js (new)
├── services/
│   ├── intake-service.js (new)
│   ├── intake-mapper.js (new)
│   ├── database.js (new)
│   └── email-service.js (extended)
├── middleware/
│   ├── auth.js (extracted)
│   ├── validation.js (new)
│   └── rate-limit.js (new)
├── migrations/
│   └── 001_create_intake_tables.sql (new)
└── config/
    └── intake-field-mapping.js (new)
```

---

## ✅ Pre-Launch Checklist

### Development Complete
- [ ] All 9 weeks of tasks completed
- [ ] 235+ intake fields implemented
- [ ] Attorney portal functional
- [ ] Field mapping > 90% coverage

### Testing Complete
- [ ] Unit tests pass (80% coverage)
- [ ] Integration tests pass
- [ ] Security audit complete
- [ ] Load testing successful

### Deployment Ready
- [ ] Staging environment tested
- [ ] Production migration scripts ready
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

---

**Plan Status:** ✅ DEV-READY for execution
**Total Timeline:** 9 weeks
**Confidence Level:** 95%
**Next Action:** Create database migration file, then begin Week 1

---

**Document Version:** 3.0
**Last Updated:** November 17, 2025
**Changes from v2.0:** Added dev-specific workflows, database-first approach, daily commands, testing steps, rollback plans