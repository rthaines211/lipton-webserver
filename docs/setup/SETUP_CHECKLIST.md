# CI/CD Setup Checklist ✅

Quick visual checklist to get your CI/CD automation up and running in **10-15 minutes**.

## 🎯 Overview

You need to complete 3 main tasks:
1. ✅ Add GCP service account key to GitHub Secrets
2. ✅ Enable GitHub Pages
3. ✅ Create production environment with approvers

---

## 📋 Option 1: Automated Setup (Recommended)

Use the helper script to automate most of the setup:

```bash
# Run the setup helper
./scripts/setup-github-cicd.sh
```

**What it does:**
- ✅ Checks prerequisites (gcloud, authentication)
- ✅ Creates or verifies service account
- ✅ Grants all required permissions
- ✅ Creates service account key
- ✅ Optionally adds secret via GitHub CLI
- ✅ Provides step-by-step instructions

**Then follow the manual steps below for GitHub Pages and Environment setup.**

---

## 📋 Option 2: Manual Setup

### STEP 1: Get Your GCP Service Account Key (5 minutes)

#### A. If you've deployed manually before:

```bash
# Find your existing service account
gcloud iam service-accounts list --project=docmosis-tornado

# You'll see something like:
# github-actions@docmosis-tornado.iam.gserviceaccount.com
# or
# node-server@docmosis-tornado.iam.gserviceaccount.com

# Use that email to create a new key:
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=YOUR-SERVICE-ACCOUNT-EMAIL@docmosis-tornado.iam.gserviceaccount.com
```

#### B. If you need to create a new service account:

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --project=docmosis-tornado

# Grant permissions (run all 6 commands)
PROJECT_ID="docmosis-tornado"
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/compute.instanceAdmin.v1"

# Create key file
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=$SA_EMAIL
```

#### C. View the key:

```bash
cat ~/gcp-key.json
```

**Copy the ENTIRE JSON output** (including `{` and `}`). It looks like:

```json
{
  "type": "service_account",
  "project_id": "docmosis-tornado",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions@docmosis-tornado.iam.gserviceaccount.com",
  ...
}
```

---

### STEP 2: Add Secret to GitHub (2 minutes)

#### Method A: Using GitHub CLI (Fastest)

```bash
# Install GitHub CLI if needed
brew install gh  # macOS
# or visit: https://cli.github.com/

# Login
gh auth login

# Add the secret
gh secret set GCP_SA_KEY < ~/gcp-key.json

# Verify
gh secret list
# Should show: GCP_SA_KEY  Updated just now

# Delete local key file
shred -u ~/gcp-key.json  # Linux
# or
rm -P ~/gcp-key.json     # macOS
```

✅ **Done with Step 2!**

#### Method B: Using GitHub Website

1. **Open your browser and go to:**
   ```
   https://github.com/YOUR-USERNAME/YOUR-REPO/settings/secrets/actions
   ```
   Replace `YOUR-USERNAME` and `YOUR-REPO` with your actual values.

2. **Click the green "New repository secret" button** (top right)

3. **Fill in the form:**
   - **Name:** `GCP_SA_KEY` (must be exactly this, case-sensitive)
   - **Secret:** Paste the ENTIRE JSON you copied earlier

4. **Click "Add secret"** (green button)

5. **Verify:** You should see `GCP_SA_KEY` in the list with "Updated X seconds ago"

6. **Delete local key file:**
   ```bash
   shred -u ~/gcp-key.json  # Linux
   # or
   rm -P ~/gcp-key.json     # macOS
   ```

✅ **Done with Step 2!**

---

### STEP 3: Enable GitHub Pages (1 minute)

This makes your VitePress documentation accessible online.

1. **Go to:**
   ```
   https://github.com/YOUR-USERNAME/YOUR-REPO/settings/pages
   ```

2. **Under "Build and deployment":**
   - Find the **"Source"** dropdown
   - Select: **"GitHub Actions"** ✅
   - (NOT "Deploy from a branch")

3. **Click "Save"** if prompted

4. **You'll see:**
   ```
   Your site is ready to be published at
   https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```

✅ **Done with Step 3!**

**Note:** Documentation won't be live until first workflow runs (after you push to main).

---

### STEP 4: Create Production Environment (2 minutes)

This adds manual approval requirement for production deployments.

1. **Go to:**
   ```
   https://github.com/YOUR-USERNAME/YOUR-REPO/settings/environments
   ```

2. **Click "New environment"** button

3. **Environment name:** `production` (must be exactly this, lowercase)

4. **Click "Configure environment"**

5. **Enable protection rules:**

   **Check the box:** ✅ **"Required reviewers"**

   **Add reviewers:**
   - Type GitHub username(s) of people who can approve production deployments
   - These people must have write access to your repository
   - Add yourself and/or team members
   - Click their names to add them

6. **Optional but recommended:**
   - ✅ **Wait timer:** Set to 0 (immediate deployment after approval)
   - Leave other settings as default

7. **Click "Save protection rules"** (green button at bottom)

8. **Verify:** You should see "production" in the environments list with "1 protection rule"

✅ **Done with Step 4!**

---

## ✅ Verification

### Check Your Setup

Run these commands to verify everything:

```bash
# 1. Check GitHub secret (if you have GitHub CLI)
gh secret list
# Should show: GCP_SA_KEY

# 2. Check workflows are present
ls -la .github/workflows/
# Should show: ci-cd-main.yml, deploy-docs.yml, etc.

# 3. Check service account permissions
gcloud projects get-iam-policy docmosis-tornado \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@docmosis-tornado.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
# Should show 6 roles
```

### Visual Checklist

- [ ] `GCP_SA_KEY` secret added to GitHub (Step 2)
- [ ] GitHub Pages source set to "GitHub Actions" (Step 3)
- [ ] Production environment created (Step 4)
- [ ] Required reviewers added to production environment (Step 4)
- [ ] Local key file deleted (security)
- [ ] Workflows exist in `.github/workflows/` directory

---

## 🚀 Deploy and Test

Now trigger your first deployment:

```bash
# 1. Commit the workflows (if not already done)
git add .github/workflows/ docs/ renovate.json scripts/ *.md
git commit -m "ci: add comprehensive CI/CD automation"

# 2. Push to main branch
git push origin main

# 3. Watch workflows run
# Go to: https://github.com/YOUR-USERNAME/YOUR-REPO/actions
```

**What happens:**
1. ✅ Main CI/CD pipeline runs (quality, tests, security, build, deploy to staging)
2. ✅ Documentation deploys to GitHub Pages
3. ⏸️  Production deployment waits for your approval
4. 👍 Approve production deployment in Actions tab
5. ✅ Production deployment completes

---

## 📊 First Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| Code quality checks | ~2 min | Automatic |
| Testing (Playwright) | ~3 min | Automatic |
| Security scanning | ~2 min | Automatic |
| Build (3 environments) | ~5 min | Automatic |
| Deploy to staging | ~2 min | Automatic |
| **Staging verification** | ~1 min | Automatic |
| **Production approval** | Manual | **You approve** |
| Deploy to production | ~2 min | Automatic |
| Documentation deploy | ~2 min | Parallel |
| **TOTAL** | **~15 min** | + approval time |

---

## 🎯 What to Expect

### After First Push to Main:

1. **GitHub Actions Tab:**
   - You'll see 2-3 workflows running simultaneously
   - Green ✅ checks appear as they complete
   - Red ❌ if something fails (check logs)

2. **Production Deployment:**
   - After staging succeeds, you'll see:
     ```
     Review deployments
     production environment is waiting for approval from required reviewers
     ```
   - Click "Review deployments" → Check "production" → "Approve and deploy"

3. **Documentation:**
   - After first successful docs workflow:
   - Visit: `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - Interactive VitePress site with search, navigation, etc.

4. **Application:**
   - Staging: Auto-deployed at staging URL
   - Production: Deployed after your approval
   - Check: `https://node-server-zyiwmzwenq-uc.a.run.app`

---

## 🔍 Troubleshooting

### Workflow Fails Immediately

**Check:**
```bash
# Is the secret name exactly right?
gh secret list | grep GCP_SA_KEY

# Is the JSON valid?
cat ~/gcp-key.json | jq .  # Should parse without errors
```

**Fix:** Re-add the secret with the exact name `GCP_SA_KEY`

### "Permission Denied" Error

**Check:**
```bash
# Verify all 6 roles are granted
gcloud projects get-iam-policy docmosis-tornado \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR-SA-EMAIL" \
  --format="table(bindings.role)"
```

**Fix:** Re-run the permission grant commands from Step 1B

### Tests Fail

**Check:**
```bash
# Run tests locally first
npm test

# Check database schema exists
ls -la schema.sql
```

**Fix:** Ensure `schema.sql` is in the repo root

### Can't Approve Production Deployment

**Check:**
- Do you have write access to the repo?
- Did you add yourself as a required reviewer?
- Is the environment name exactly "production" (lowercase)?

**Fix:** Go back to Step 4 and verify environment setup

---

## 📚 Full Documentation

For detailed information, see:

- **Quick Reference:** [`CI_CD_AUTOMATION_COMPLETE.md`](/CI_CD_AUTOMATION_COMPLETE.md)
- **Complete Guide:** [`docs/operations/CI_CD_WORKFLOWS.md`](/docs/operations/CI_CD_WORKFLOWS.md)
- **Secrets Setup:** [`docs/setup/GITHUB_SECRETS_SETUP.md`](/docs/setup/GITHUB_SECRETS_SETUP.md)

---

## 🎉 Success Indicators

You're fully set up when:

✅ `gh secret list` shows `GCP_SA_KEY`
✅ GitHub Pages source is "GitHub Actions"
✅ Production environment has required reviewers
✅ First workflow completes successfully
✅ Documentation is live at GitHub Pages URL
✅ Staging deployment succeeds
✅ Production approval workflow works

**You should see:**
- Green ✅ checks on your commits
- Live documentation site
- Auto-deployments to staging
- Manual approval flow for production

---

## 💡 Quick Tips

- **Test locally first:** `npm test` before pushing
- **Check logs:** Actions tab → Click workflow → Click job → Expand step
- **Skip CI:** Add `[skip ci]` to commit message if needed
- **Re-run failed:** Actions → Failed workflow → "Re-run jobs"
- **Emergency rollback:** Deploy previous commit SHA manually

---

**Setup Help:** Run `./scripts/setup-github-cicd.sh` for guided setup

**Questions?** See [`docs/operations/CI_CD_WORKFLOWS.md`](/docs/operations/CI_CD_WORKFLOWS.md) Troubleshooting section
