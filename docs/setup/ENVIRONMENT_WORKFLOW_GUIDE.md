# 🔄 Environment Workflow Guide

## Overview

Your application uses a **3-tier deployment pipeline** to ensure changes are properly tested before reaching production users.

---

## 📊 Environment Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DEVELOPMENT (Your Laptop)                                    │
│    • Local testing                                              │
│    • Fast iteration                                             │
│    • No auth required                                           │
│    • Branch: develop                                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ git push origin develop
                 │ (optional: triggers CI/CD)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. STAGING (Cloud Run - Testing)                                │
│    • Full production-like environment                           │
│    • Separate database & Dropbox                                │
│    • Team testing & QA                                          │
│    • Branch: main (auto-deploys)                                │
│    • URL: https://node-server-staging-zyiwmzwenq-uc.a.run.app  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Manual approval in GitHub Actions
                 │ (after staging tests pass)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PRODUCTION (Cloud Run - Live Users)                          │
│    • Real users, real data                                      │
│    • Production database & Dropbox                              │
│    • Requires approval to deploy                                │
│    • Branch: main (manual approval)                             │
│    • URL: https://node-server-zyiwmzwenq-uc.a.run.app          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Standard Workflow: Making Changes

### Step 1: Develop Locally (Development)

```bash
# 1. Make sure you're on the develop branch
git checkout develop

# 2. Create a feature branch (optional but recommended)
git checkout -b feature/my-new-feature

# 3. Make your changes to the code
# Edit files: server.js, *.js, etc.

# 4. Test locally
npm install           # If you added new dependencies
npm start             # Runs on http://localhost:3000

# 5. Test your changes in the browser
# Open http://localhost:3000 and verify everything works

# 6. Commit your changes
git add .
git commit -m "feat: add new feature"

# 7. Push to your feature branch (or directly to develop)
git push origin feature/my-new-feature

# 8. Create a Pull Request to merge into develop
# (Or push directly to develop if you prefer)
```

**At this stage:**
- ✅ Code is on your laptop
- ✅ Tested locally
- ❌ Not deployed anywhere yet

---

### Step 2: Deploy to Staging

```bash
# 1. Merge your changes into the main branch
git checkout main
git merge develop    # Or merge your feature branch

# 2. Push to main branch
git push origin main

# 3. GitHub Actions CI/CD automatically triggers
# This happens automatically when you push to main!
```

**What GitHub Actions does automatically:**
1. ✅ Runs code quality checks (linting, formatting)
2. ✅ Runs automated tests
3. ✅ Scans for security vulnerabilities
4. ✅ Builds the application
5. ✅ **Automatically deploys to STAGING** (no approval needed!)

**Wait 5-10 minutes**, then:
```bash
# Check staging deployment
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Or open in browser:
# https://node-server-staging-zyiwmzwenq-uc.a.run.app
```

**At this stage:**
- ✅ Code is deployed to **Staging** (Cloud Run)
- ✅ Uses staging database and Dropbox folder
- ✅ Team can test the changes
- ❌ Not in production yet

---

### Step 3: Promote to Production

After testing in staging and confirming everything works:

```bash
# 1. Go to GitHub Actions
# https://github.com/YOUR_USERNAME/YOUR_REPO/actions

# 2. Find the workflow run from your main branch push

# 3. Click on the "Deploy to Production" job

# 4. Click "Review deployments" button

# 5. Check the "production" environment checkbox

# 6. Click "Approve and deploy"
```

**Manual approval required because:**
- ⚠️  Production has real users
- ⚠️  Production has real client data
- ⚠️  You want to control exactly when changes go live

**After approval:**
- ✅ Code is deployed to **Production** (Cloud Run)
- ✅ Real users can access the changes
- ✅ Uses production database and Dropbox folder

---

## ❓ Your Question: "If I make a change in staging and I want it to go to dev?"

### Short Answer: **You shouldn't make changes in staging directly!**

Staging is a **deployment target**, not a **development environment**. Here's why:

| Environment | Can You Edit Code? | Purpose |
|-------------|-------------------|---------|
| **Development** (laptop) | ✅ YES | Make changes here |
| **Staging** (Cloud Run) | ❌ NO | Test changes here |
| **Production** (Cloud Run) | ❌ NO | Users access here |

### The Correct Flow

```
You write code on laptop → Push to git → Deploys to staging → Approve → Deploys to production
     (DEVELOPMENT)                          (STAGING)                    (PRODUCTION)
```

**NOT:**
```
❌ Make changes in staging → Push to development (WRONG!)
```

---

## 🔧 What If Staging Has Changes You Want Locally?

If for some reason staging has code that your local development doesn't have (maybe someone else deployed), here's how to sync:

```bash
# 1. Make sure your local main branch is up to date
git checkout main
git pull origin main

# 2. Merge those changes into your develop branch
git checkout develop
git merge main

# 3. Now your local dev environment has the staging changes
npm install  # Install any new dependencies
npm start    # Run locally
```

---

## 📋 Quick Reference Commands

### Local Development
```bash
# Start local server
npm start                                    # Runs on http://localhost:3000

# Run tests
npm test

# Check what environment you're in
echo $NODE_ENV                               # Should show "development"
```

### Staging (Cloud Run)
```bash
# View staging logs
gcloud run services logs read node-server-staging --region=us-central1 --limit=50

# Check staging service status
gcloud run services describe node-server-staging --region=us-central1

# Test staging health
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# Manual deploy to staging (if CI/CD is broken)
./scripts/deploy.sh staging
```

### Production (Cloud Run)
```bash
# View production logs
gcloud run services logs read node-server --region=us-central1 --limit=50

# Check production service status
gcloud run services describe node-server --region=us-central1

# Test production health
curl https://node-server-zyiwmzwenq-uc.a.run.app/health

# Manual deploy to production (emergency only!)
./scripts/deploy.sh production
```

---

## 🎯 Best Practices

### ✅ DO:
1. **Develop locally first** - Fast iteration, no costs, easy debugging
2. **Test in staging** - Catch bugs before production
3. **Use git branches** - Keep your work organized
4. **Review changes** - Check staging before promoting to production
5. **Use CI/CD** - Let GitHub Actions handle deployments

### ❌ DON'T:
1. **Don't edit code in staging/production** - Changes will be overwritten on next deploy
2. **Don't skip staging** - Always test in staging first
3. **Don't push directly to production** - Use the approval process
4. **Don't commit secrets** - Use GCP Secret Manager (already set up)
5. **Don't test with production data** - Use staging database instead

---

## 🐛 Troubleshooting

### "I pushed to main but staging didn't deploy"

Check GitHub Actions:
```bash
# Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/actions
# Look for failed workflows
# Check the logs for errors
```

### "Staging is running old code"

Force redeploy:
```bash
./scripts/deploy.sh staging
```

### "I need to rollback staging/production"

```bash
# List recent revisions
gcloud run revisions list --service=node-server-staging --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic node-server-staging \
  --region=us-central1 \
  --to-revisions=node-server-staging-00001-abc=100
```

### "My local development isn't working"

```bash
# Check your .env file or config/development.env
cat config/development.env

# Make sure database is running
psql -U ryanhaines -d legal_forms_db -c "SELECT 1"

# Reinstall dependencies
rm -rf node_modules
npm install

# Restart the server
npm start
```

---

## 📚 Additional Resources

- [Staging Environment Guide](docs/STAGING_ENVIRONMENT_GUIDE.md)
- [Multi-Environment Architecture](docs/MULTI_ENVIRONMENT_ARCHITECTURE.md)
- [Deployment Scripts](scripts/deploy.sh)
- [CI/CD Workflows](.github/workflows/ci-cd-main.yml)
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md)

---

## 🎉 Summary

**Remember the flow:**
1. **Develop** on your laptop (make changes, test locally)
2. **Push to git** (`develop` branch → merge to `main`)
3. **Deploy to staging** (automatic when you push to `main`)
4. **Test in staging** (verify everything works)
5. **Approve production** (manual approval in GitHub Actions)
6. **Deploy to production** (happens after approval)

**Never make changes directly in staging or production!** Always develop locally, then deploy through git and CI/CD.

---

**Created:** October 27, 2025
**Last Updated:** October 27, 2025
