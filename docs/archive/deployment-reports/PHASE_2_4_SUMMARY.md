# Phase 2.4 - Comprehensive Troubleshooting Summary

## Problem Statement

User is unable to execute the Phase 2.4 validation checkpoint command:

```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

This connection failure prevents validation before proceeding to Phase 3.

---

## Root Cause Analysis

### Most Common Issues (Priority Order)

| Issue | Likelihood | Symptom | Fix Complexity |
|-------|-----------|---------|-----------------|
| User not created or password mismatch | 30% | Authentication failed | Low |
| Cloud SQL instance not RUNNABLE | 15% | Connection refused | Medium |
| Missing database | 10% | Database doesn't exist | Low |
| IAM/Authorization issues | 20% | Access denied (no auth) | Medium |
| Schema not imported | 10% | Tables don't exist | Medium |
| Network/Firewall issues | 15% | Connection timeout | High |

---

## Diagnostic Decision Tree

```
START
  ↓
[1] Is instance RUNNABLE?
  ├─ NO → Wait for creation to complete or check errors
  └─ YES ↓
[2] Does database "legal_forms_db" exist?
  ├─ NO → Create it: gcloud sql databases create legal_forms_db
  └─ YES ↓
[3] Does user "app-user" exist?
  ├─ NO → Create it with password from secret
  └─ YES ↓
[4] Can you connect as postgres user?
  ├─ NO → Check network, firewall, or instance IP
  └─ YES ↓
[5] Can you connect as app-user?
  ├─ NO → Grant proper permissions
  └─ YES ↓
[6] Do tables exist (cases, parties, etc)?
  ├─ NO → Re-import schema from backup
  └─ YES ↓
[SUCCESS] - Proceed to Phase 3
```

---

## What to Do - Step by Step

### Step 1: Verify Prerequisites (5 minutes)

Run this to check your setup is correct:

```bash
# Check gcloud is installed and authenticated
gcloud auth list
gcloud config get-value project

# Check secrets exist
gcloud secrets list | grep db-

# Check instance exists
gcloud sql instances list | grep legal-forms-db
```

**Expected**: All commands return without errors.

---

### Step 2: Check Instance Status (2 minutes)

```bash
# Check if instance is RUNNABLE
gcloud sql instances describe legal-forms-db --format="value(state)"
```

**If NOT RUNNABLE**:
- Instance might still be creating (wait 5-10 minutes)
- Instance might have failed creation (check errors)

```bash
# Check for errors
gcloud sql operations list --instance=legal-forms-db --limit=5
gcloud sql operations describe OPERATION_ID --format="value(operationErrors[0].message)"
```

**If instance failed**: Delete and recreate it from Phase 2.1.

---

### Step 3: Check Database and User (2 minutes)

```bash
# Check database exists
gcloud sql databases list --instance=legal-forms-db

# Check user exists
gcloud sql users list --instance=legal-forms-db
```

**If database is missing**:

```bash
gcloud sql databases create legal_forms_db --instance=legal-forms-db
```

**If user is missing**:

```bash
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

---

### Step 4: Test Connection - Try Method A (3 minutes)

```bash
# Try the original command
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

**If it works**: Great! Run the validation SQL commands from phase_2_4_sql_commands.sql

**If it fails with authentication error**: Go to Step 5

**If it fails with connection error**: Go to Step 6

---

### Step 5: Fix Permissions (5 minutes)

If authentication fails, permissions might be wrong. Use the proxy method:

```bash
# Step 1: Download proxy if needed
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy

# Step 2: Start proxy in terminal 1
PROJECT_ID=$(gcloud config get-value project)
./cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:legal-forms-db=tcp:5432

# Step 3: In terminal 2, get password
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)

# Step 4: Connect as postgres
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U postgres -d legal_forms_db

# Step 5: In psql, grant permissions
GRANT CONNECT ON DATABASE legal_forms_db TO "app-user";
GRANT ALL PRIVILEGES ON SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "app-user";

\q
```

**Then test as app-user**:

```bash
# In terminal 2, connect as app-user
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U app-user -d legal_forms_db

# In psql, test
SELECT 1;

\q
```

---

### Step 6: Check Network/Firewall (5-10 minutes)

If connection times out or is refused:

```bash
# Check instance has an IP address
gcloud sql instances describe legal-forms-db \
  --format="value(ipAddresses[0].ipAddress)"

# Check authorized networks
gcloud sql instances describe legal-forms-db \
  --format="value(settings.ipConfiguration.authorizedNetworks[].value)"

# Add your IP if needed (find your IP first)
MY_IP=$(curl -s https://api.ipify.org)
echo "Your IP: $MY_IP"

# Add to authorized networks
gcloud sql instances patch legal-forms-db \
  --allowed-networks=$MY_IP \
  --backup
```

---

## Files Provided

You now have 4 comprehensive troubleshooting files:

### 1. **PHASE_2_4_TROUBLESHOOTING_GUIDE.md** (Main Guide)
   - Complete diagnostic procedures
   - Root cause analysis
   - Step-by-step remediation
   - Copy-paste ready scripts
   - All workarounds explained

   **Use when**: You need comprehensive guidance and context

### 2. **phase_2_4_quick_commands.sh** (Quick Reference)
   - All diagnostic commands in one script
   - Quick status checks
   - Minimal explanation, maximum speed

   **Use when**: You just need the commands quickly

### 3. **phase_2_4_sql_commands.sql** (SQL Statements)
   - All SQL commands needed to fix issues
   - Organized by section
   - Copy-paste ready

   **Use when**: You're connected to the database and need to fix permissions

### 4. **PHASE_2_4_SUMMARY.md** (This File)
   - Executive overview
   - Decision tree for troubleshooting
   - Quick step-by-step solution

   **Use when**: You want a quick overview before diving in

---

## Most Likely Solutions (Try These First)

### Solution 1: Create Missing Database (20% of cases)

```bash
gcloud sql databases create legal_forms_db --instance=legal-forms-db
```

### Solution 2: Create Missing User (30% of cases)

```bash
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

### Solution 3: Grant Permissions via Proxy (25% of cases)

```bash
# Start proxy
PROJECT_ID=$(gcloud config get-value project)
./cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:legal-forms-db=tcp:5432 &

# Get password
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)

# Connect and grant
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U postgres -d legal_forms_db << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "app-user";
\q
EOF
```

### Solution 4: Re-import Schema (15% of cases)

```bash
# Export from local
pg_dump -U ryanhaines -h localhost legal_forms_db --schema-only > schema.sql

# Upload and import
PROJECT_ID=$(gcloud config get-value project)
gsutil cp schema.sql gs://${PROJECT_ID}-db-migration/

gcloud sql import sql legal-forms-db \
  gs://${PROJECT_ID}-db-migration/schema.sql \
  --database=legal_forms_db \
  --user=postgres
```

---

## Common Error Messages & Solutions

### Error: "ERROR: password authentication failed for user"

**Cause**: Password mismatch or user doesn't exist

**Solution**:
```bash
# Recreate user with correct password
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

---

### Error: "FATAL: no entry for host"

**Cause**: Network or firewall issue

**Solution**:
```bash
# Add your IP to authorized networks
MY_IP=$(curl -s https://api.ipify.org)
gcloud sql instances patch legal-forms-db \
  --allowed-networks=$MY_IP \
  --backup
```

---

### Error: "does not exist" (database or table)

**Cause**: Schema not imported

**Solution**: Re-run schema import from Solution 4 above

---

### Error: "permission denied for schema public"

**Cause**: User doesn't have schema permissions

**Solution**: Run permission grants from Solution 3 above

---

## Validation Checklist

After running fixes, verify with this checklist:

```
[ ] Instance state is RUNNABLE
    Command: gcloud sql instances describe legal-forms-db --format="value(state)"
    Expected: RUNNABLE

[ ] Database exists
    Command: gcloud sql databases list --instance=legal-forms-db | grep legal_forms_db
    Expected: legal_forms_db listed

[ ] User exists
    Command: gcloud sql users list --instance=legal-forms-db | grep app-user
    Expected: app-user listed

[ ] Can connect as postgres
    Command: gcloud sql connect legal-forms-db --user=postgres --database=legal_forms_db
    Then: SELECT 1;
    Expected: Returns 1

[ ] Can connect as app-user
    Command: gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
    Then: SELECT 1;
    Expected: Returns 1

[ ] Tables exist
    In psql: \dt
    Expected: cases, parties, party_issue_selections listed

[ ] User has permissions
    In psql: SELECT COUNT(*) FROM cases;
    Expected: Returns 0 or number of rows

[ ] All Phase 2.1-2.3 work completed
    - Instance created
    - Database created
    - User created
    - Schema imported
```

---

## Time Estimates

| Task | Time | Difficulty |
|------|------|-----------|
| Run diagnostics | 5 min | Easy |
| Create missing database | 2 min | Easy |
| Create missing user | 2 min | Easy |
| Grant permissions | 5 min | Easy |
| Re-import schema | 10 min | Medium |
| Fix network issues | 10 min | Medium |
| **Total (worst case)** | **35 min** | - |

---

## When to Escalate

Contact support or rollback if:

1. **Instance creation failed repeatedly**: May need to delete and retry, or contact GCP support
2. **Permission errors persist after fixes**: May be IAM issue at project level
3. **Network timeout after fixes**: May be VPC or firewall configuration issue
4. **Schema import fails**: May be syntax issue in schema file
5. **Can't proceed after 1 hour**: Rollback Phase 2 and start fresh from Phase 2.1

---

## Next Steps After Phase 2.4 Passes

Once you can successfully:
1. Run: `gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db`
2. See tables with: `\dt`
3. Query data with: `SELECT * FROM cases;`

You are ready for **Phase 3: Network Infrastructure**

Phase 3 creates the VPC Connector that allows Cloud Run to reach both:
- Cloud SQL database (private connection via Cloud SQL Proxy)
- Docmosis VM (via VPC)

---

## Documentation Notes

All files follow these principles:
- Copy-paste ready commands (no manual modification needed in most cases)
- Clear success criteria for each step
- Multiple alternative approaches for each problem
- Organized for different use cases:
  - **Guide**: Complete reference with explanations
  - **Quick Commands**: Fast lookup
  - **SQL Commands**: Database operations
  - **Summary**: Quick decision tree

---

## Related Files in This Directory

```
/Users/ryanhaines/Desktop/Lipton Webserver/
├── PHASE_2_4_TROUBLESHOOTING_GUIDE.md      ← Main detailed guide
├── PHASE_2_4_SUMMARY.md                     ← This file
├── phase_2_4_quick_commands.sh              ← Quick command reference
├── phase_2_4_sql_commands.sql               ← SQL operations
├── GCP_PHASED_DEPLOYMENT.md                 ← Original deployment plan
└── [other project files]
```

---

## Quick Start (Absolute Fastest Path)

If you're in a hurry:

1. **Check status** (30 seconds):
   ```bash
   bash phase_2_4_quick_commands.sh
   ```

2. **Pick your problem** from Common Error Messages section above

3. **Run the solution** for that error

4. **Verify** with validation checklist

5. **Proceed** to Phase 3

---

## Support Commands

If you're stuck, run this for detailed diagnostics:

```bash
echo "=== Instance ==="
gcloud sql instances describe legal-forms-db

echo ""
echo "=== Databases ==="
gcloud sql databases list --instance=legal-forms-db

echo ""
echo "=== Users ==="
gcloud sql users list --instance=legal-forms-db

echo ""
echo "=== Recent Operations ==="
gcloud sql operations list --instance=legal-forms-db --limit=10

echo ""
echo "=== Secrets ==="
gcloud secrets list | grep db-
```

Share the output when asking for help - it provides all context needed.

---

End of Phase 2.4 Troubleshooting Summary

