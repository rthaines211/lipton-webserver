# 🧪 Testing Your Staging-First Deployment

## ✅ What's Already Working

Based on the verification, your setup is **almost complete**:

- ✅ **Local Configuration**: All config files present
- ✅ **Git Repository**: Properly configured with GitHub remote
- ✅ **Google Cloud**: Correct project, services running
- ✅ **GCP Secrets**: All required secrets exist
- ✅ **Services**: Both staging and production responding

**Repository**: `rthaines211/lipton-webserver`

---

## 📋 Final Setup Steps (5-10 minutes)

### Step 1: Configure GitHub Environments ⚠️ REQUIRED

Visit: **https://github.com/rthaines211/lipton-webserver/settings/environments**

#### Create `staging` Environment:
1. Click "New environment"
2. Name: `staging`
3. **Protection rules**:
   - ✅ Deployment branches: Restrict to `main` only
   - ⏹️ Required reviewers: Leave empty (allows auto-deployment)
4. Click "Configure environment"

#### Create `production` Environment:
1. Click "New environment"
2. Name: `production`
3. **Protection rules**: ⚠️ **CRITICAL**
   - ✅ **Required reviewers**: Add yourself (and team members)
   - ✅ **Deployment branches**: Restrict to `main` only
   - ⏱️ **Wait timer**: (Optional) 10 minutes
4. Click "Configure environment"

---

### Step 2: Add GitHub Repository Secret

Visit: **https://github.com/rthaines211/lipton-webserver/settings/secrets/actions**

#### Create GCP Service Account Key:

```bash
# Generate a new service account key
gcloud iam service-accounts keys create ~/gcp-sa-key.json \
  --iam-account=945419684329-compute@developer.gserviceaccount.com \
  --project=docmosis-tornado

# Display the key (copy the entire JSON output)
cat ~/gcp-sa-key.json
```

#### Add to GitHub:
1. Click "New repository secret"
2. **Name**: `GCP_SA_KEY`
3. **Value**: Paste the entire JSON content from above
4. Click "Add secret"

#### Clean up (Important for security):
```bash
# Delete the local key file
rm ~/gcp-sa-key.json
```

---

## 🧪 Test Your Deployment Pipeline

### Option 1: Simple Test (Recommended)

The easiest way to test:

```bash
# 1. Make a small change
echo "" >> README.md
echo "Testing staging-first deployment at $(date)" >> README.md

# 2. Commit and push
git add README.md
git commit -m "test: verify staging-first deployment pipeline"
git push origin main

# 3. Watch the magic happen!
# Visit: https://github.com/rthaines211/lipton-webserver/actions
```

### Option 2: Use Test Script

```bash
# Run the automated test script
./scripts/test-deployment-flow.sh
```

---

## 👀 What to Watch For

After pushing to `main`, you should see this sequence:

```
GitHub Actions
    ↓
1. ✅ Code Quality & Linting (2-3 min)
    ↓
2. ✅ Run Test Suite (3-5 min)
    ↓
3. ✅ Security Scanning (2-3 min)
    ↓
4. ✅ Build Application (3-5 min)
    ↓
5. ✅ Deploy to Staging (2-3 min) ← Automatic
    ↓
6. ⏸️ Deploy to Production ← Waiting for YOUR approval
    ↓
7. (You approve in GitHub)
    ↓
8. ✅ Deploy to Production (2-3 min)
```

**Total Time**:
- To staging: ~15-20 minutes
- To production: +2-3 minutes after approval

---

## ✅ Verification Steps

### After Staging Deploys:

#### 1. Check Staging Status
```bash
# Test staging endpoint
curl https://node-server-staging-zyiwmzwenq-uc.a.run.app/health

# View staging logs
gcloud run services logs read node-server-staging \
  --region=us-central1 \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

#### 2. Manual Testing on Staging
Visit: **https://node-server-staging-zyiwmzwenq-uc.a.run.app**

Test these features:
- [ ] Home page loads
- [ ] Form submission works
- [ ] Document generation succeeds
- [ ] No errors in browser console
- [ ] Check staging logs for errors

#### 3. Approve Production Deployment

1. Go to: **https://github.com/rthaines211/lipton-webserver/actions**
2. Click on the running "CI/CD Pipeline" workflow
3. You'll see a **yellow banner** saying "Review deployments"
4. Click "Review deployments"
5. Check the box next to "production"
6. (Optional) Add a comment: "Staging verified, approving production"
7. Click "Approve and deploy" (green button)

### After Production Deploys:

#### 1. Check Production Status
```bash
# Test production endpoint
curl https://node-server-zyiwmzwenq-uc.a.run.app/health

# View production logs
gcloud run services logs read node-server \
  --region=us-central1 \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

#### 2. Manual Testing on Production
Visit: **https://node-server-zyiwmzwenq-uc.a.run.app**

Quick smoke test:
- [ ] Home page loads
- [ ] Basic functionality works
- [ ] No immediate errors

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ **Pre-Deployment**
- [x] Local verification passes
- [ ] GitHub environments configured
- [ ] GCP_SA_KEY secret added

✅ **During Deployment**
- [ ] All CI checks pass (quality, tests, security)
- [ ] Build completes successfully
- [ ] Staging deploys automatically
- [ ] Production waits for approval

✅ **Post-Deployment**
- [ ] Staging is accessible and working
- [ ] No errors in staging logs
- [ ] Manual testing on staging passes
- [ ] Production deploys after approval
- [ ] Production is accessible and working
- [ ] No errors in production logs

---

## 🚨 Troubleshooting

### Issue: "Environments not found"
**Solution**: Create the environments (Step 1 above)

### Issue: "Required reviewers not met"
**Solution**: You forgot to add yourself as a reviewer in production environment settings

### Issue: "GCP authentication failed"
**Cause**: `GCP_SA_KEY` secret missing or invalid
**Solution**:
1. Verify secret exists: https://github.com/rthaines211/lipton-webserver/settings/secrets/actions
2. Regenerate service account key if needed

### Issue: "No review required" (production deploys automatically)
**Cause**: Production environment doesn't have required reviewers
**Solution**: Edit production environment and add required reviewers

### Issue: Deployment stuck on "Queued"
**Cause**: GitHub Actions may be waiting for available runners
**Solution**: Wait a few minutes, GitHub will assign a runner

### Issue: Docker build fails
**Cause**: Docker image build might fail if dependencies are missing
**Solution**: Check the workflow logs for specific error messages

---

## 📊 Monitoring Commands

```bash
# View staging logs (real-time)
gcloud run services logs tail node-server-staging --region=us-central1

# View production logs (real-time)
gcloud run services logs tail node-server --region=us-central1

# Check service status
gcloud run services describe node-server-staging \
  --region=us-central1 \
  --format="table(status.conditions)"

# List recent revisions
gcloud run revisions list \
  --service=node-server \
  --region=us-central1 \
  --limit=5
```

---

## 🔄 Rollback Procedure

If something goes wrong in production:

### Quick Rollback (Route Traffic to Previous Revision)
```bash
# 1. List revisions
gcloud run revisions list \
  --service=node-server \
  --region=us-central1

# 2. Identify the previous working revision (e.g., node-server-00053-xyz)
# 3. Route 100% traffic to that revision
gcloud run services update-traffic node-server \
  --region=us-central1 \
  --to-revisions=node-server-00053-xyz=100
```

This takes effect **immediately** (within seconds).

---

## 📚 Reference Links

- **GitHub Actions**: https://github.com/rthaines211/lipton-webserver/actions
- **GitHub Environments**: https://github.com/rthaines211/lipton-webserver/settings/environments
- **GitHub Secrets**: https://github.com/rthaines211/lipton-webserver/settings/secrets/actions
- **Staging Service**: https://node-server-staging-zyiwmzwenq-uc.a.run.app
- **Production Service**: https://node-server-zyiwmzwenq-uc.a.run.app
- **Cloud Run Console**: https://console.cloud.google.com/run?project=docmosis-tornado

---

## 🎉 Next Steps After Successful Test

Once your test deployment works:

1. ✅ **Document the process** for your team
2. ✅ Set up **Slack notifications** for deployments (optional)
3. ✅ Create **runbooks** for common deployment scenarios
4. ✅ Set up **monitoring alerts** in GCP
5. ✅ Schedule **regular staging tests** before production deploys
6. ✅ Add **deployment badges** to README (optional)

---

## 💡 Tips

- **Always test on staging first** - Never skip staging validation
- **Use descriptive commit messages** - They appear in deployment logs
- **Monitor logs during deployment** - Catch issues early
- **Keep staging up to date** - Staging should mirror production
- **Document any manual steps** - Make deployment repeatable
- **Test rollback procedures** - Know how to recover quickly

---

**Last Verification Run**: Your local setup is complete! ✅

**Remaining Steps**:
1. Configure GitHub environments (5 min)
2. Add GCP_SA_KEY secret (2 min)
3. Test deployment (push to main)
4. Approve production (manual)

**Estimated Time to Complete**: 10-15 minutes
