# Phase 2.4 - Copy & Paste Ready Commands

This document contains exact commands you can copy and paste directly. No modifications needed in most cases.

---

## SECTION 1: Diagnostic Commands (Run These First)

### 1.1 Check Authentication & Project

```bash
gcloud auth list
```

Expected: See your email address with ACTIVE status.

```bash
gcloud config get-value project
```

Expected: Your GCP Project ID.

---

### 1.2 Verify Secrets Exist

```bash
gcloud secrets list | grep -E "db-user|db-password"
```

Expected: See both `db-user` and `db-password` in output.

---

### 1.3 Check Instance Status

```bash
gcloud sql instances describe legal-forms-db --format="value(state)"
```

Expected: `RUNNABLE`

---

### 1.4 Check Database Exists

```bash
gcloud sql databases list --instance=legal-forms-db
```

Expected: See `legal_forms_db` in the list.

---

### 1.5 Check User Exists

```bash
gcloud sql users list --instance=legal-forms-db
```

Expected: See `app-user` in the list.

---

### 1.6 Get Instance IP Address

```bash
gcloud sql instances describe legal-forms-db --format="value(ipAddresses[0].ipAddress)"
```

Expected: IP address like `1.2.3.4` or `10.x.x.x`.

---

## SECTION 2: Create Missing Components

### 2.1 Create Database (if missing)

```bash
gcloud sql databases create legal_forms_db --instance=legal-forms-db
```

Wait 30 seconds after running.

---

### 2.2 Create User (if missing)

```bash
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

Wait 30 seconds after running.

---

## SECTION 3: Connection Tests

### 3.1 Try gcloud sql connect (Original Method)

```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

Then at the `legal_forms_db=#` prompt, type:

```sql
SELECT 1;
\q
```

Expected: Returns `1` and exits.

**If this works, skip to SECTION 5: Schema Verification**

**If this fails, continue to SECTION 4**

---

## SECTION 4: Fix Permissions (Alternative Method - Cloud SQL Proxy)

### 4.1 Download Cloud SQL Proxy (One Time)

```bash
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy
```

### 4.2 Start the Proxy (Terminal 1)

```bash
PROJECT_ID=$(gcloud config get-value project)
./cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:legal-forms-db=tcp:5432
```

**IMPORTANT**: Keep this terminal open. You should see:
```
Ready to accept connections
```

### 4.3 In a New Terminal (Terminal 2) - Get Password

```bash
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)
echo $DB_PASSWORD
```

### 4.4 Connect as postgres and Grant Permissions

```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U postgres -d legal_forms_db
```

At the `legal_forms_db=#` prompt, copy and paste this entire block:

```sql
GRANT CONNECT ON DATABASE legal_forms_db TO "app-user";
GRANT USAGE ON SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "app-user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "app-user";
```

Then exit:

```sql
\q
```

### 4.5 Test Connection as app-user (Still in Terminal 2)

```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U app-user -d legal_forms_db
```

At the prompt, test:

```sql
SELECT 1;
```

Expected: Returns `1`

```sql
\q
```

Exit psql.

---

## SECTION 5: Schema Verification

### 5.1 List Tables

Connect with:
```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

Or with proxy (if gcloud connect doesn't work):
```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U app-user -d legal_forms_db
```

Then run:
```sql
\dt
```

Expected: See three tables:
- cases
- parties
- party_issue_selections

---

### 5.2 Check Table Structure

```sql
\d cases
\d parties
\d party_issue_selections
```

Expected: See column definitions for each table.

---

### 5.3 Verify Permissions

```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee = 'app-user'
ORDER BY table_name, privilege_type;
```

Expected: `app-user` should have SELECT, INSERT, UPDATE, DELETE on all three tables.

---

### 5.4 Test Data Access

```sql
SELECT COUNT(*) FROM cases;
SELECT COUNT(*) FROM parties;
SELECT COUNT(*) FROM party_issue_selections;
```

Expected: Returns row counts (0 is okay for empty tables, no permission errors).

---

## SECTION 6: Re-Import Schema (If Tables Missing)

### 6.1 Export from Local Database

```bash
pg_dump -U ryanhaines -h localhost legal_forms_db --schema-only > schema.sql
```

### 6.2 Upload to Cloud Storage

```bash
PROJECT_ID=$(gcloud config get-value project)
gsutil cp schema.sql gs://${PROJECT_ID}-db-migration/
```

### 6.3 Import to Cloud SQL

```bash
PROJECT_ID=$(gcloud config get-value project)
gcloud sql import sql legal-forms-db \
  gs://${PROJECT_ID}-db-migration/schema.sql \
  --database=legal_forms_db \
  --user=postgres
```

**This takes 1-2 minutes.** Wait for completion, then verify tables exist:

```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

Then:
```sql
\dt
```

---

## SECTION 7: Fix Network Issues (Connection Timeout/Refused)

### 7.1 Check for Public IP

```bash
gcloud sql instances describe legal-forms-db \
  --format="value(ipAddresses[0].ipAddress)"
```

If empty or internal IP (10.x.x.x), you need to use the Cloud SQL Proxy method (SECTION 4).

If you have a public IP, continue:

### 7.2 Check Authorized Networks

```bash
gcloud sql instances describe legal-forms-db \
  --format="value(settings.ipConfiguration.authorizedNetworks[].value)"
```

Expected: Should show your IP or `0.0.0.0/0` (not secure, but allows any IP).

### 7.3 Find Your IP Address

```bash
curl -s https://api.ipify.org
```

This shows your public IP. Save this value.

### 7.4 Add Your IP to Authorized Networks

```bash
MY_IP=<YOUR_IP_FROM_STEP_7_3>
gcloud sql instances patch legal-forms-db \
  --allowed-networks=$MY_IP \
  --backup
```

Example:
```bash
MY_IP=203.0.113.45
gcloud sql instances patch legal-forms-db \
  --allowed-networks=$MY_IP \
  --backup
```

Wait 30 seconds, then try SECTION 3.1 again.

---

## SECTION 8: Troubleshooting Specific Errors

### Error: "password authentication failed"

The password might be wrong or the user doesn't exist. Run:

```bash
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

Wait 30 seconds, then try connecting again.

---

### Error: "permission denied for schema public"

User needs schema permissions. Use SECTION 4.4 to grant them.

---

### Error: "relation 'cases' does not exist"

Schema wasn't imported. Run SECTION 6 to re-import.

---

### Error: "connection refused"

Instance is either not running or not reachable. Check:

```bash
gcloud sql instances describe legal-forms-db --format="value(state)"
```

If RUNNABLE, check firewall with SECTION 7.

---

## SECTION 9: Complete Validation Script

Run this entire block to validate everything:

```bash
#!/bin/bash

PROJECT_ID=$(gcloud config get-value project)

echo "=== Phase 2.4 Validation ==="
echo ""

# Check 1
echo -n "[1/6] Instance RUNNABLE: "
STATE=$(gcloud sql instances describe legal-forms-db --format="value(state)")
if [ "$STATE" == "RUNNABLE" ]; then echo "✓"; else echo "✗ ($STATE)"; fi

# Check 2
echo -n "[2/6] Database exists: "
if gcloud sql databases list --instance=legal-forms-db | grep -q "legal_forms_db"; then
  echo "✓"
else
  echo "✗"
fi

# Check 3
echo -n "[3/6] User exists: "
if gcloud sql users list --instance=legal-forms-db | grep -q "app-user"; then
  echo "✓"
else
  echo "✗"
fi

# Check 4
echo -n "[4/6] Can connect as postgres: "
DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password)
if PGPASSWORD=$DB_PASSWORD timeout 5 psql -h $(gcloud sql instances describe legal-forms-db --format="value(ipAddresses[0].ipAddress)") -U postgres -d legal_forms_db -c "SELECT 1" 2>/dev/null | grep -q "1"; then
  echo "✓"
else
  echo "✗ (try proxy method)"
fi

# Check 5
echo -n "[5/6] Can connect as app-user: "
if PGPASSWORD=$DB_PASSWORD timeout 5 psql -h $(gcloud sql instances describe legal-forms-db --format="value(ipAddresses[0].ipAddress)") -U app-user -d legal_forms_db -c "SELECT 1" 2>/dev/null | grep -q "1"; then
  echo "✓"
else
  echo "✗ (try proxy method)"
fi

# Check 6
echo -n "[6/6] Tables exist: "
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD timeout 5 psql -h $(gcloud sql instances describe legal-forms-db --format="value(ipAddresses[0].ipAddress)") -U app-user -d legal_forms_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" -t 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "✓ ($TABLE_COUNT tables)"
else
  echo "✗"
fi

echo ""
echo "=== Result ==="
echo "If all checks show ✓, Phase 2.4 is complete."
echo "Proceed to Phase 3: Network Infrastructure"
```

Copy the entire script above into a file, save as `validate.sh`, then run:

```bash
chmod +x validate.sh
./validate.sh
```

---

## SECTION 10: Quick Summary - Follow This Order

**If everything works at Section 3.1:**
1. Run 3.1 command
2. If success, jump to Section 5

**If 3.1 fails:**
1. Run Section 1 diagnostics
2. Run Section 2 commands for missing items
3. Run Section 4 (proxy method)
4. Run Section 5 (verify schema)

**If still failing:**
1. Check error message
2. Find matching error in Section 8
3. Run the fix command
4. Run Section 3.1 again

---

## SECTION 11: Emergency Contacts / Escalation

If after running all above commands you still can't connect:

1. **Check GCP Console**: https://console.cloud.google.com
   - Navigate to Cloud SQL
   - Click on "legal-forms-db"
   - Check "Overview" tab for errors
   - Check "Logs" tab for recent errors

2. **Get Current State**:
   ```bash
   gcloud sql instances describe legal-forms-db
   gcloud sql operations list --instance=legal-forms-db --limit=10
   ```

3. **Common Last Resort**:
   - Delete instance: `gcloud sql instances delete legal-forms-db --quiet`
   - Recreate from Phase 2.1 documentation
   - Most issues resolve with a fresh instance

---

## Files Available for Reference

- **PHASE_2_4_FLOWCHART.txt** - Visual decision tree
- **PHASE_2_4_TROUBLESHOOTING_GUIDE.md** - Detailed explanations
- **phase_2_4_sql_commands.sql** - SQL statements reference
- **phase_2_4_quick_commands.sh** - Bash script version

---

## Success Criteria - Phase 2.4 Complete When:

```bash
✓ gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
✓ Can run: SELECT 1;
✓ Can list tables: \dt
✓ See: cases, parties, party_issue_selections tables
✓ Can query: SELECT COUNT(*) FROM cases;
✓ Next command: Proceed to Phase 3
```

---

End of Copy & Paste Commands

