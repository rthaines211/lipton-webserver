# Quick Start Checklist
## Get Your Dev Environment Running in 15 Minutes

---

## ✅ Pre-Flight Check

Before you start, make sure you have:
- [ ] `gcloud` CLI installed and authenticated
- [ ] Project set to `docmosis-tornado`
- [ ] Git repository cloned locally
- [ ] Terminal open

**Verify:**
```bash
gcloud config get-value project
# Should show: docmosis-tornado
```

---

## 🚀 Step-by-Step Setup (15 minutes)

### Step 1: Run Setup Script (5 minutes)

```bash
# Download the script (it's in your outputs)
# Make it executable
chmod +x setup_dev_environment.sh

# Run it
./setup_dev_environment.sh
```

**⏱️ Takes 5-10 minutes**

**What to do while it runs:**
- ☕ Grab coffee
- 📝 Read the output - it shows progress
- 💾 Save the database password when it's shown

**You'll see:**
```
✓ Cloud SQL instance created
✓ Database created  
✓ Database user configured
✓ Storage bucket created
✓ Core secrets created
✓ IAM permissions configured
✓ cloudbuild-dev.yaml created
✓ GitHub Actions workflow created
✓ Migration script created
✓ Documentation created

✓ Dev Environment Setup Complete!
```

---

### Step 2: Run Database Migration (2 minutes)

```bash
# Connect to dev database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Enter the password from Step 1 output when prompted

# Run the migration
\i migrations/001_create_intake_tables.sql

# Verify tables exist
\dt

# You should see:
# - intake_submissions
# - intake_page_1, 2, 3, 4, 5
# - saved_sessions
# - attorneys
# - audit_logs

# Exit
\q
```

---

### Step 3: Commit Setup Files (2 minutes)

```bash
# Add the generated files
git add cloudbuild-dev.yaml .github/workflows/deploy-dev.yml migrations/ DEV_ENVIRONMENT.md setup_dev_environment.sh

# Commit
git commit -m "Add dev environment configuration"

# Push
git push origin main
```

---

### Step 4: Create Dev Branch & Deploy (3 minutes)

```bash
# Create dev branch
git checkout -b dev/intake-system

# Make a small change to trigger deployment
echo "# Client Intake System" > README_INTAKE.md
git add README_INTAKE.md
git commit -m "Initialize intake system development"

# Push - this triggers auto-deploy!
git push origin dev/intake-system
```

**⏱️ Deployment takes 3-5 minutes**

**Watch it deploy:**
1. Go to GitHub Actions: `https://github.com/YOUR_ORG/YOUR_REPO/actions`
2. You'll see "Deploy to Dev Environment" running
3. Wait for green checkmark ✅

---

### Step 5: Get Your Dev URL (1 minute)

```bash
# Get the URL of your deployed dev service
gcloud run services describe node-server-dev --region=us-central1 --format='value(status.url)'
```

**Example output:**
```
https://node-server-dev-zyiwmzwenq-uc.a.run.app
```

**Test it:**
```bash
# Health check (if you have one)
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# Or just open in browser
open https://node-server-dev-zyiwmzwenq-uc.a.run.app
```

---

### Step 6: Start Claude Code (2 minutes)

```bash
# Make sure you're in your repo directory
cd /path/to/your/repo

# Start Claude Code
claude-code
```

**You're ready to build! 🎉**

---

## ✅ Verification Checklist

After completing the steps above, verify everything works:

- [ ] Cloud SQL instance exists: `gcloud sql instances describe legal-forms-db-dev`
- [ ] Database has tables: Connect and run `\dt`
- [ ] Storage bucket exists: `gcloud storage buckets describe gs://docmosis-tornado-form-submissions-dev`
- [ ] Secrets exist: `gcloud secrets list | grep DEV`
- [ ] Cloud Run service deployed: `gcloud run services describe node-server-dev --region=us-central1`
- [ ] Dev URL responds: `curl https://node-server-dev-zyiwmzwenq-uc.a.run.app`
- [ ] GitHub Actions workflow exists: Check `.github/workflows/deploy-dev.yml`
- [ ] On dev branch: `git branch` shows `dev/intake-system`

---

## 🎯 Your First Task with Claude Code

Try this to test everything:

**Tell Claude Code:**
```
"Create a simple health check endpoint at GET /api/health that:
1. Returns { status: 'ok', environment: 'development', timestamp: [current time] }
2. Add it to routes/health.js
3. Include it in the main app"
```

**Then deploy:**
```bash
git add .
git commit -m "Add health check endpoint"
git push origin dev/intake-system
```

**Wait 3 minutes, then test:**
```bash
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/health
```

**Expected output:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

**If it works, you're 100% ready to build the intake system! 🚀**

---

## 🆘 Troubleshooting

### "Command not found: gcloud"
**Fix:** Install gcloud CLI: https://cloud.google.com/sdk/docs/install

### "Permission denied" when running script
**Fix:** `chmod +x setup_dev_environment.sh`

### "Cloud SQL instance already exists"
**Solution:** Script handles this - it skips existing resources

### "Database password doesn't work"
**Fix:** Get it from Secret Manager:
```bash
gcloud secrets versions access latest --secret=DB_PASSWORD_DEV
```

### "GitHub Actions not running"
**Check:**
1. Did you push to a `dev/*` branch?
2. Does `.github/workflows/deploy-dev.yml` exist?
3. Check Actions tab on GitHub

### "Cloud Run service not found"
**Wait:** First deployment takes 3-5 minutes. Check GitHub Actions progress.

### "Claude Code not installed"
**Install:**
```bash
npm install -g @anthropic-ai/claude-code
# Or
brew install claude-code
```

---

## 📊 What You've Built

After completing this checklist, you have:

### Infrastructure (GCP)
✅ Cloud SQL PostgreSQL dev database  
✅ Cloud Storage dev bucket  
✅ Secret Manager dev secrets  
✅ Cloud Run dev service  
✅ IAM permissions configured  

### Database Schema
✅ 9 tables created  
✅ Indexes configured  
✅ Triggers set up  
✅ Foreign keys established  

### CI/CD Pipeline
✅ GitHub Actions workflow  
✅ Cloud Build configuration  
✅ Auto-deploy on push  
✅ Staging/production path  

### Documentation
✅ DEV_ENVIRONMENT.md  
✅ CLAUDE_CODE_INSTRUCTIONS.md  
✅ Migration scripts  
✅ Quick reference guides  

**Total cost: ~$10-13/month**

---

## 🎓 What's Next?

Now that your dev environment is running, follow the **Week 1 plan**:

### Week 1, Day 1: Code Audit (Claude Code will help!)
```
"Claude, help me audit the existing codebase:
1. Map all current routes and endpoints
2. Identify code that needs refactoring
3. Document the current file structure
4. Create a refactoring plan"
```

### Week 1, Day 2: Refactor Routes
```
"Refactor the route structure:
1. Create routes/intake.js for intake endpoints
2. Create routes/attorney.js for attorney endpoints
3. Create routes/auth.js for authentication
4. Keep routes thin, move logic to services/"
```

### Week 1, Day 3: Database Layer
```
"Create a database service layer:
1. services/database.js with connection pool
2. services/intakeService.js with CRUD operations
3. Handle errors and logging
4. Add connection health checks"
```

Continue through Week 1-9 following your implementation plan!

---

## 💡 Pro Tips

### Commit Often
Every time Claude Code makes changes:
```bash
git add .
git commit -m "Descriptive message"
git push origin dev/intake-system
```

### Check Logs Frequently
```bash
# Quick log check
gcloud run logs read node-server-dev --region=us-central1 --limit=20

# Watch live
gcloud run logs tail node-server-dev --region=us-central1
```

### Test in Browser
- Save your dev URL as a bookmark
- Open Chrome DevTools (Network tab)
- Test API endpoints directly

### Use Claude Code Effectively
- Be specific in requests
- Break large tasks into smaller ones
- Review changes before committing
- Iterate on solutions

---

## 📞 Need Help?

If you get stuck:

1. **Check the logs:**
   ```bash
   gcloud run logs read node-server-dev --region=us-central1 --limit=50
   ```

2. **Verify resources exist:**
   ```bash
   gcloud sql instances list
   gcloud run services list
   gcloud secrets list | grep DEV
   ```

3. **Review documentation:**
   - `DEV_ENVIRONMENT.md` - Dev environment guide
   - `CLAUDE_CODE_INSTRUCTIONS.md` - Full Claude Code guide
   - `security_compliance_requirements.md` - Security requirements

4. **Check GitHub Actions:**
   - Go to your repo on GitHub
   - Click "Actions" tab
   - Review build logs

---

## ✅ Final Checklist Before Building

- [ ] Dev environment created (all resources exist)
- [ ] Database migrated (9 tables created)
- [ ] Setup files committed to git
- [ ] Dev branch created and pushed
- [ ] First deployment successful (Cloud Run service running)
- [ ] Dev URL accessible
- [ ] Claude Code installed and running
- [ ] Tested a simple endpoint (health check)

**If all checked, you're ready to build the client intake system! 🎉**

---

## 🚀 Ready to Start?

Your command:
```bash
cd /path/to/your/repo
git checkout dev/intake-system
claude-code
```

**First thing to tell Claude Code:**
```
"Let's start Week 1, Day 1: Code Audit.
Help me document the existing codebase structure and create a refactoring plan."
```

**Good luck! You've got this! 💪**
