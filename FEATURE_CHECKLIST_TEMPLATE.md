# Feature Checklist Template
**Use this template for each new feature you build**

---

## Feature: [Feature Name]
**Date Started:** [YYYY-MM-DD]
**Developer:** Ryan Haines
**Branch:** dev/intake-system
**Status:** 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## 📋 Requirements
List what this feature needs to do:
- [ ] Requirement 1 (e.g., "Accept POST request with form data")
- [ ] Requirement 2 (e.g., "Validate email format")
- [ ] Requirement 3 (e.g., "Save to intake_submissions table")
- [ ] Requirement 4 (e.g., "Return confirmation number")
- [ ] Requirement 5 (e.g., "Send confirmation email")

---

## 📁 Files to Create/Modify

### New Files
- [ ] `routes/[feature].js` - Route handler
- [ ] `services/[feature]-service.js` - Business logic
- [ ] `middleware/[feature]-validation.js` - Input validation
- [ ] `test/[feature].test.js` - Unit tests

### Modified Files
- [ ] `server.js` - Add new route
- [ ] `package.json` - Add dependencies if needed
- [ ] Database migration if needed

---

## 🛠️ Implementation Steps

### Step 1: Database Setup (if needed)
- [ ] Create/modify database tables
```sql
-- Migration SQL here
CREATE TABLE IF NOT EXISTS...
```
- [ ] Run migration on dev database
```bash
gcloud sql connect legal-forms-db-dev --user=app-user-dev
\i migrations/XXX_feature.sql
```
- [ ] Verify tables created

### Step 2: Backend Implementation
- [ ] Create route handler
```javascript
// Claude Code Prompt:
"Create a route handler in routes/[feature].js that..."
```
- [ ] Create service layer
```javascript
// Claude Code Prompt:
"Create a service in services/[feature]-service.js that..."
```
- [ ] Add validation middleware
```javascript
// Claude Code Prompt:
"Create validation middleware that checks..."
```
- [ ] Wire up in server.js

### Step 3: Testing Implementation
- [ ] Write unit tests
```javascript
// Test cases to cover:
// 1. Happy path
// 2. Validation failures
// 3. Database errors
// 4. Edge cases
```
- [ ] Manual testing with curl
```bash
# Test command:
curl -X POST https://node-server-dev-*/api/[endpoint] \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

### Step 4: Frontend Implementation (if needed)
- [ ] Create UI component
- [ ] Add form validation
- [ ] Connect to API
- [ ] Handle responses/errors

### Step 5: Integration
- [ ] Test with existing features
- [ ] Verify no breaking changes
- [ ] Update documentation

---

## ✅ Testing Checklist

### Unit Tests
- [ ] All functions have tests
- [ ] Tests pass locally: `npm test`
- [ ] Code coverage > 80%

### Manual Testing
- [ ] Happy path works
```bash
# Command:
# Expected result:
```
- [ ] Validation rejects bad input
```bash
# Command with invalid data:
# Expected result: 400 error with message
```
- [ ] Error handling works
```bash
# Command to trigger error:
# Expected result: Appropriate error response
```

### Integration Testing
- [ ] Works with other endpoints
- [ ] Database transactions complete
- [ ] No performance regression

---

## 🔒 Security Checks

- [ ] Input validation on all fields
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Authentication required (if applicable)
- [ ] Authorization checked (if applicable)
- [ ] Rate limiting applied (if public endpoint)
- [ ] Audit logging added
- [ ] Sensitive data not logged

---

## 🚀 Deployment

### Development
- [ ] Code committed: `git add . && git commit -m "feat: [description]"`
- [ ] Pushed to dev: `git push origin dev/intake-system`
- [ ] Auto-deployment successful (check GitHub Actions)
- [ ] Deployed to dev environment
- [ ] Tested on dev URL: https://node-server-dev-zyiwmzwenq-uc.a.run.app

### Verification
- [ ] Health check passes
```bash
curl https://node-server-dev-*/health
```
- [ ] New endpoint responds
```bash
curl https://node-server-dev-*/api/[endpoint]
```
- [ ] Logs look clean
```bash
gcloud run logs read node-server-dev --region=us-central1 --limit=50
```
- [ ] Database has expected data
```sql
SELECT COUNT(*) FROM [table];
```

---

## 📝 Documentation

- [ ] API documentation updated
- [ ] Code comments added
- [ ] README updated if needed
- [ ] CHANGELOG entry added

### API Documentation
```markdown
### POST /api/[endpoint]
**Description:** [What it does]
**Authentication:** Required/Not Required
**Request Body:**
​```json
{
  "field1": "string",
  "field2": "number"
}
​```
**Response:**
​```json
{
  "success": true,
  "data": {}
}
​```
**Error Responses:**
- 400: Validation error
- 401: Unauthorized
- 500: Server error
```

---

## 🐛 Known Issues / Bugs
Document any issues discovered during development:
1. Issue: [Description]
   - Status: 🔴 Open | 🟢 Fixed
   - Fix: [How it was fixed or plan to fix]

---

## 🔄 Rollback Plan

If this feature causes problems in production:

### Quick Rollback (< 5 minutes)
```bash
# Revert to previous Cloud Run revision
gcloud run services update-traffic node-server \
  --to-revisions=node-server-PREVIOUS-REVISION=100 \
  --region=us-central1
```

### Code Rollback
```bash
# Revert the commit
git revert [commit-hash]
git push origin dev/intake-system

# Wait for auto-deploy
```

### Database Rollback (if schema changed)
```sql
-- Rollback migration
DROP TABLE IF EXISTS [new_table];
ALTER TABLE [table] DROP COLUMN [new_column];
-- etc.
```

---

## 📊 Metrics

After deployment, monitor:
- [ ] Response time: < 500ms
- [ ] Error rate: < 1%
- [ ] Success rate: > 99%
- [ ] Database query time: < 100ms

---

## ✨ Definition of Done

A feature is complete when:
- [ ] All requirements implemented
- [ ] All tests passing
- [ ] Security checks complete
- [ ] Deployed to dev environment
- [ ] Documentation updated
- [ ] Code reviewed (if working with team)
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Rollback plan documented

---

## 📌 Notes

Add any additional notes, learnings, or considerations here:
-
-
-

---

## Sign-off

- [ ] Feature complete and ready for staging
- **Developer:** _________________ **Date:** _________________
- **Reviewed by:** _________________ **Date:** _________________ (if applicable)

---

# Example: Completed Feature Checklist

## Feature: Intake Form Submission Endpoint
**Date Started:** 2025-11-18
**Developer:** Ryan Haines
**Branch:** dev/intake-system
**Status:** 🟢 Complete

## 📋 Requirements
- [x] Accept POST request with intake form data
- [x] Validate all required fields
- [x] Save to intake_submissions and related tables
- [x] Generate unique confirmation number (INT-2025-XXXXX)
- [x] Send confirmation email to client
- [x] Return success response with intake ID

## 📁 Files to Create/Modify

### New Files
- [x] `routes/intake.js` - Intake route handlers
- [x] `services/intake-service.js` - Intake business logic
- [x] `middleware/intake-validation.js` - Form validation
- [x] `test/intake.test.js` - Unit tests

### Modified Files
- [x] `server.js` - Added intake router
- [x] `package.json` - Added express-validator

## 🛠️ Implementation Steps

### Step 1: Database Setup
- [x] Created 9 intake tables via migration
- [x] Added indexes for search performance
- [x] Verified with `\dt` - all tables present

### Step 2: Backend Implementation
- [x] Created POST /api/intake/submit endpoint
- [x] Added comprehensive validation for 235+ fields
- [x] Service layer handles multi-table inserts
- [x] Transaction ensures data consistency

### Step 3: Testing Implementation
- [x] Unit tests: 95% coverage
- [x] Manual tests all passing
- [x] Handles invalid data gracefully

## ✅ Testing Checklist

### Manual Testing
- [x] Happy path works
```bash
curl -X POST https://node-server-dev-*/api/intake/submit \
  -H "Content-Type: application/json" \
  -d @test-intake.json
# Result: {"success":true,"intakeId":1,"confirmationNumber":"INT-2025-00001"}
```
- [x] Validation rejects bad input
```bash
# Missing required email
# Result: 400 {"errors":[{"field":"email","message":"Email is required"}]}
```

## 🔒 Security Checks
- [x] All inputs validated and sanitized
- [x] Parameterized queries prevent SQL injection
- [x] Rate limited to 5 submissions per hour per IP
- [x] Audit log entry created for each submission

## 🚀 Deployment
- [x] Deployed to dev environment successfully
- [x] All endpoints responding correctly
- [x] Logs clean, no errors

## 📝 Documentation
- [x] API docs added to README
- [x] Inline code comments complete
- [x] This checklist filled out

## Sign-off
- [x] Feature complete and ready for staging
- **Developer:** Ryan Haines **Date:** 2025-11-18
- **Reviewed by:** N/A (solo project) **Date:** N/A

---

*Template Version: 1.0*
*Last Updated: November 17, 2025*
*Copy this template for each new feature*