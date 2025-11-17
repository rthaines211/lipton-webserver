# Daily Development Workflow - Client Intake System
**Quick Reference Guide for Daily Development**
**Developer:** Ryan Haines
**Project:** Lipton Legal Group - Client Intake System

---

## 🌅 Morning Startup (9:00 AM)

### 1. Check Environment Health (2 min)
```bash
# Quick health check
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# Check last deployment status
gcloud run services describe node-server-dev --region=us-central1 --format='value(status.conditions[0].message)'
```

### 2. Sync Your Code (1 min)
```bash
# Get latest changes
git pull origin dev/intake-system

# Check your branch
git branch
# Should show: * dev/intake-system
```

### 3. Review Overnight Issues (2 min)
```bash
# Check for errors in logs
gcloud run logs read node-server-dev --region=us-central1 --limit=30 | grep ERROR

# Check GitHub Actions for any failed deployments
# Visit: https://github.com/[your-repo]/actions
```

### 4. Start Claude Code (1 min)
```bash
cd /Users/ryanhaines/Desktop/Lipton\ Webserver
# Start Claude Code - it's now ready for your prompts
```

---

## 💻 Development Loop (9:30 AM - 5:00 PM)

### For Each Feature You Build:

#### Step 1: Tell Claude Code What to Build
```
Example prompts:
"Create a POST endpoint at /api/intake/submit that accepts form data, validates required fields, saves to the intake_submissions table, and returns a confirmation number"

"Extract the health check routes from server.js into a new file routes/health.js using Express Router"

"Add rate limiting middleware that allows 5 submissions per hour per IP address"
```

#### Step 2: Review What Claude Code Created
```bash
# See what files changed
git status

# Review the changes
git diff

# If it looks good, continue. If not, ask Claude Code to adjust.
```

#### Step 3: Commit and Deploy (3 min)
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: add intake submission endpoint with validation"

# Push to trigger auto-deploy
git push origin dev/intake-system
```

#### Step 4: Wait for Deployment (3-5 min)
```bash
# Check deployment progress
# Go to: https://github.com/[your-repo]/actions

# Or check Cloud Build
# Go to: https://console.cloud.google.com/cloud-build/builds?project=docmosis-tornado
```

#### Step 5: Test Your Feature (2-5 min)
```bash
# Test new endpoint
curl -X POST https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/submit \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com"}'

# Check the response
# Should see: {"success":true,"intakeId":1,"confirmationNumber":"INT-2025-00001"}
```

#### Step 6: Debug if Needed
```bash
# If something's wrong, check logs
gcloud run logs read node-server-dev --region=us-central1 --limit=50

# Find your error
# Tell Claude Code: "I'm getting this error: [paste error]. Please fix it."

# Claude Code will fix it, then repeat from Step 3
```

---

## 🗄️ Database Operations

### Quick Database Check
```bash
# Connect to dev database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
# Password is in Secret Manager or your notes

# Common queries
\dt                                    # List all tables
SELECT COUNT(*) FROM intake_submissions;  # Count submissions
SELECT * FROM intake_submissions ORDER BY created_at DESC LIMIT 5;  # Recent submissions
\q                                     # Exit
```

### Run a Migration
```bash
# Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Run migration file
\i migrations/001_create_intake_tables.sql

# Verify it worked
\dt
# Should see 9 new tables

\q  # Exit
```

---

## 🧪 Testing Patterns

### Test Form Submission
```bash
curl -X POST https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/submit \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

### Test Search Endpoint
```bash
curl "https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/search?q=john&status=new" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test File Upload
```bash
curl -X POST https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/upload \
  -F "file=@document.pdf" \
  -F "intakeId=123"
```

### Test Health Endpoints
```bash
# Basic health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# Detailed health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health/detailed
```

---

## 🔄 Common Workflows

### Starting a New Feature
```bash
# 1. Make sure you're on dev branch
git checkout dev/intake-system

# 2. Pull latest
git pull origin dev/intake-system

# 3. Tell Claude Code what to build
# "Build a new endpoint for..."

# 4. Follow the Development Loop above
```

### Fixing a Bug
```bash
# 1. Identify the error in logs
gcloud run logs read node-server-dev --region=us-central1 --limit=100 | grep ERROR

# 2. Tell Claude Code
# "I'm getting this error: [paste]. It happens when [describe]. Please fix."

# 3. Test the fix
# 4. Commit and push
```

### Refactoring Code
```bash
# 1. Tell Claude Code what to refactor
# "The routes/index.js file is 500 lines. Please split it into routes/intake.js and routes/attorney.js"

# 2. Review the changes carefully
git diff

# 3. Test that nothing broke
npm test  # If you have tests
# Or manually test key endpoints

# 4. Commit and push
```

---

## 🕐 End of Day Routine (5:00 PM)

### 1. Save Work in Progress
```bash
# If you have uncommitted changes
git add .
git commit -m "wip: [what you were working on]"
git push origin dev/intake-system
```

### 2. Run Quick Tests
```bash
# Test main endpoints still work
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/submit -X POST -H "Content-Type: application/json" -d '{}'
# Should get validation error, not 500
```

### 3. Check Database State
```bash
# Quick count of today's work
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev -c "SELECT COUNT(*) FROM intake_submissions WHERE DATE(created_at) = CURRENT_DATE;"
```

### 4. Document Progress
```bash
# Add to your progress log
echo "$(date '+%Y-%m-%d'): Completed intake submission endpoint, added validation" >> PROGRESS.md
git add PROGRESS.md
git commit -m "docs: update progress log"
git push origin dev/intake-system
```

---

## 🚨 Quick Troubleshooting

### "Deployment Failed"
```bash
# Check GitHub Actions
# https://github.com/[your-repo]/actions

# Common fixes:
# 1. Check for syntax errors in your code
# 2. Make sure all imports are correct
# 3. Verify package.json has all dependencies
```

### "Can't Connect to Database"
```bash
# Check Cloud SQL is running
gcloud sql instances describe legal-forms-db-dev --format='value(state)'
# Should be: RUNNABLE

# If stopped, start it:
gcloud sql instances patch legal-forms-db-dev --activation-policy=ALWAYS
```

### "Getting 500 Errors"
```bash
# Check detailed logs
gcloud run logs read node-server-dev --region=us-central1 --limit=100

# Look for stack traces
# Common causes:
# - Missing environment variable
# - Database connection issue
# - Missing required field in request
```

### "Git Push Not Triggering Deploy"
```bash
# Check you're on a dev/* branch
git branch
# If not: git checkout dev/intake-system

# Force a deploy manually if needed
gcloud run deploy node-server-dev --source=. --region=us-central1
```

---

## 📋 Daily Checklist

Morning:
- [ ] Environment health check
- [ ] Git pull latest
- [ ] Review overnight logs
- [ ] Check yesterday's deployments

During Development:
- [ ] Clear Claude Code prompt
- [ ] Review changes before committing
- [ ] Test after each deployment
- [ ] Check logs if issues

End of Day:
- [ ] Commit all changes
- [ ] Run basic tests
- [ ] Document progress
- [ ] Push everything to remote

---

## 🔑 Key URLs & Resources

### Your Dev Environment
- **Dev Service URL**: https://node-server-dev-zyiwmzwenq-uc.a.run.app
- **GitHub Actions**: https://github.com/[your-repo]/actions
- **Cloud Console**: https://console.cloud.google.com/run?project=docmosis-tornado
- **Cloud SQL**: https://console.cloud.google.com/sql/instances/legal-forms-db-dev

### Documentation
- Implementation Plan: `IMPLEMENTATION_PLAN_DEV_READY.md`
- This Guide: `DAILY_WORKFLOW.md`
- Feature Checklist: `FEATURE_CHECKLIST_TEMPLATE.md`
- Week 1 Plan: `WEEK_1_DETAILED_PLAN.md`

---

## 💡 Pro Tips

1. **Always test after deploying** - Don't assume it worked
2. **Check logs immediately when something fails** - The error is usually obvious
3. **Commit often** - Small commits are easier to debug/revert
4. **Use descriptive commit messages** - You'll thank yourself later
5. **Test with curl before building UI** - Ensure API works first
6. **Keep Claude Code prompts specific** - Better results with detailed requests
7. **Document weird issues** - Add them to this guide for future reference

---

**Remember:** The auto-deploy takes 3-5 minutes. Use this time to:
- Write test cases for what you just built
- Review the next task
- Update documentation
- Get coffee ☕

---

*Last Updated: November 17, 2025*
*For questions: Check TROUBLESHOOTING.md or ask Claude Code for help*