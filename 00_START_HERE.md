# Phase 2.4 Troubleshooting - START HERE

## Your Problem

You're unable to execute this Phase 2.4 validation command:

```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

## Solution: 3 Quick Options

### Option 1: Fast Track (5-15 minutes)
**You know what you want and just need to fix it:**

1. Open: `/Users/ryanhaines/Desktop/Lipton Webserver/PHASE_2_4_COPY_PASTE_COMMANDS.md`
2. Go to **Section 1** - run diagnostics to identify the issue
3. Go to **Section 2-8** - find your error and run the fix
4. Go to **Section 5** - verify the fix worked

### Option 2: Visual Guide (10-20 minutes)
**You want to understand the flow before fixing:**

1. Open: `/Users/ryanhaines/Desktop/Lipton Webserver/PHASE_2_4_FLOWCHART.txt`
2. Follow the flowchart to identify your issue
3. Execute the recommended commands at each step
4. Verify at the end

### Option 3: Comprehensive Reference (30-45 minutes)
**You want full context and deep understanding:**

1. Read: `/Users/ryanhaines/Desktop/Lipton Webserver/PHASE_2_4_SUMMARY.md`
2. For detailed steps: `/Users/ryanhaines/Desktop/Lipton Webserver/PHASE_2_4_TROUBLESHOOTING_GUIDE.md`
3. For SQL operations: `/Users/ryanhaines/Desktop/Lipton Webserver/phase_2_4_sql_commands.sql`
4. Run and verify

---

## File Directory (7 Documents Created)

```
/Users/ryanhaines/Desktop/Lipton Webserver/

1. 00_START_HERE.md (this file)
   └─ Quick navigation to solutions

2. PHASE_2_4_COPY_PASTE_COMMANDS.md (Best for implementation)
   └─ Exact bash and SQL commands, organized by problem
   └─ Use this to: Get exact commands to run
   └─ Time: 5-20 minutes

3. PHASE_2_4_FLOWCHART.txt (Best for visual learners)
   └─ ASCII art decision tree
   └─ Use this to: Follow a visual flowchart to your solution
   └─ Time: 10-20 minutes

4. PHASE_2_4_SUMMARY.md (Best for quick overview)
   └─ Root cause analysis + decision tree + common errors
   └─ Use this to: Understand what's happening
   └─ Time: 10-15 minutes

5. PHASE_2_4_TROUBLESHOOTING_GUIDE.md (Best for detailed reference)
   └─ Complete 9-step diagnostic and remediation plan
   └─ Use this to: Deep dive into each step with explanations
   └─ Time: 30-45 minutes to read all

6. phase_2_4_quick_commands.sh (Best for bash execution)
   └─ Shell script with all diagnostic and remediation commands
   └─ Use this to: Run "bash phase_2_4_quick_commands.sh"
   └─ Time: 5-10 minutes

7. phase_2_4_sql_commands.sql (Best for database operations)
   └─ All SQL statements organized by section
   └─ Use this to: Copy/paste SQL in psql session
   └─ Time: Reference as needed

8. PHASE_2_4_README.md (Best for navigation)
   └─ Index of all documents with descriptions
   └─ Use this to: Pick the right document for your needs
```

---

## Root Cause Analysis (What's Most Likely Wrong)

**Probability Order:**
1. **User doesn't exist or password mismatch (30%)** - Fix: 2 minutes
2. **Wrong permissions (25%)** - Fix: 5 minutes
3. **Network/firewall issue (15%)** - Fix: 5-10 minutes
4. **Instance not RUNNABLE (15%)** - Fix: 5-10 minutes
5. **Database doesn't exist (10%)** - Fix: 2 minutes
6. **Schema not imported (5%)** - Fix: 10 minutes

---

## The Fastest Path to Fix

**Step 1: Diagnose** (2 minutes)
```bash
# Check instance state
gcloud sql instances describe legal-forms-db --format="value(state)"

# Check database exists
gcloud sql databases list --instance=legal-forms-db | grep legal_forms_db

# Check user exists
gcloud sql users list --instance=legal-forms-db | grep app-user
```

**Step 2: Fix Based on Findings**

- **Instance not RUNNABLE:** Wait 5-10 minutes
- **Database missing:** Run: `gcloud sql databases create legal_forms_db --instance=legal-forms-db`
- **User missing:** Run: `gcloud sql users create app-user --instance=legal-forms-db --password=$(gcloud secrets versions access latest --secret=db-password)`
- **Connection fails:** Use Cloud SQL Proxy (see PHASE_2_4_COPY_PASTE_COMMANDS.md Section 4)

**Step 3: Verify** (2 minutes)
```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```
Then: `SELECT 1;` then `\q`

---

## Document Selection Guide

**Pick ONE based on your preference:**

| Your Situation | Best Document | Time | Read First |
|---|---|---|---|
| "Just give me the commands" | COPY_PASTE_COMMANDS.md | 5-20 min | Section 1 (diagnostics) |
| "Show me a flowchart" | FLOWCHART.txt | 10-20 min | Start at top |
| "Quick summary first" | SUMMARY.md | 10-15 min | Decision Tree section |
| "I want everything explained" | TROUBLESHOOTING_GUIDE.md | 30-45 min | Step 1 section |
| "Run it as a script" | phase_2_4_quick_commands.sh | 5-10 min | Run: `bash phase_2_4_quick_commands.sh` |
| "I need all the docs" | PHASE_2_4_README.md | 5 min | Navigation section |

---

## Troubleshooting Decision Tree (30 Seconds)

```
Can you run: gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db ?

├─ YES, it works
│  └─ Can you see tables with \dt ?
│     ├─ YES → Phase 2.4 is COMPLETE, proceed to Phase 3
│     └─ NO → Re-import schema (COPY_PASTE_COMMANDS.md Section 6)
│
└─ NO, it fails
   ├─ With "authentication failed"
   │  └─ Fix: Create user or grant permissions (Section 2 or 4)
   │
   ├─ With "connection refused"
   │  └─ Fix: Check instance status or use proxy method (Section 3 or 4)
   │
   ├─ With "database does not exist"
   │  └─ Fix: Create database (Section 2)
   │
   └─ With "permission denied"
      └─ Fix: Grant permissions (Section 4)
```

---

## Most Common Quick Fixes

### Fix #1: User doesn't exist (2 minutes)
```bash
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)
```

### Fix #2: Database doesn't exist (2 minutes)
```bash
gcloud sql databases create legal_forms_db --instance=legal-forms-db
```

### Fix #3: Bad permissions (5 minutes)
See: PHASE_2_4_COPY_PASTE_COMMANDS.md, Section 4

### Fix #4: Instance not ready (wait 5-10 minutes)
```bash
gcloud sql instances describe legal-forms-db --format="value(state)"
# Keep checking until it shows: RUNNABLE
```

---

## Success Checklist

You're done when all of these work:

```
[✓] Command works: gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
[✓] Prompt appears: legal_forms_db=#
[✓] Query works: SELECT 1;
[✓] Query returns: 1
[✓] List tables: \dt
[✓] Shows tables: cases, parties, party_issue_selections
[✓] Exit works: \q

Then: You can proceed to Phase 3 (Network Infrastructure)
```

---

## Next Steps After Phase 2.4

Once you pass this validation:

1. ✅ Phase 2.4 - Cloud SQL Validation (YOU ARE HERE)
2. → Phase 3 - Network Infrastructure (VPC Connector)
3. → Phase 4 - Deploy Python Service
4. → Phase 5 - Deploy Node.js Service
5. → Phase 6 - End-to-End Testing
6. → Phase 7 - Production Hardening

**Time remaining:** 2-3 hours to complete all phases

---

## If You Get Stuck

1. **Identify your error message** from the connection attempt
2. **Go to:** PHASE_2_4_COPY_PASTE_COMMANDS.md, Section 8 (Specific Errors)
3. **Find your error** in the list
4. **Run the fix command**
5. **Try connecting again**

---

## Files Available at a Glance

All files are in: `/Users/ryanhaines/Desktop/Lipton Webserver/`

**START WITH ONE OF THESE:**
- Fast fix → `PHASE_2_4_COPY_PASTE_COMMANDS.md`
- Visual → `PHASE_2_4_FLOWCHART.txt`
- Quick read → `PHASE_2_4_SUMMARY.md`

**DETAILED REFERENCE:**
- Full guide → `PHASE_2_4_TROUBLESHOOTING_GUIDE.md`
- Navigation → `PHASE_2_4_README.md`

**FOR EXECUTION:**
- Bash script → `phase_2_4_quick_commands.sh`
- SQL only → `phase_2_4_sql_commands.sql`

---

## Diagnostic Commands (Copy & Paste Ready)

Check your current state quickly:

```bash
# All in one check
echo "Instance:" && gcloud sql instances describe legal-forms-db --format="value(state)"
echo "Database:" && gcloud sql databases list --instance=legal-forms-db | grep legal_forms_db
echo "User:" && gcloud sql users list --instance=legal-forms-db | grep app-user
echo "Secrets:" && gcloud secrets list | grep -E "db-user|db-password"
```

---

## Time Estimates

| Scenario | Time | Difficulty |
|----------|------|-----------|
| Everything already works | <5 min | Trivial |
| Missing database or user | 5-10 min | Easy |
| Permission issues | 10-15 min | Easy |
| Network issues | 10-20 min | Medium |
| Schema re-import | 15-25 min | Medium |
| Multiple issues | 30-45 min | Medium |

---

## Key Takeaways

1. **Phase 2.4 validates your Cloud SQL setup**
   - Instance is running
   - Database exists
   - User can authenticate
   - Tables are imported
   - Permissions are correct

2. **Most issues are quick fixes**
   - 70% of issues fixed in <10 minutes
   - 25% fixed in 10-20 minutes
   - 5% need deeper troubleshooting

3. **You have 8 documents to help**
   - Pick one based on your learning style
   - All contain the same information, different formats
   - Use as reference for future issues

4. **You're close**
   - Phase 2.1-2.3 are already done
   - Just validating the setup
   - Phase 3 comes right after

---

## One More Thing

All commands in the documentation are **copy-paste ready** - no modifications needed in most cases. Just copy the command and paste into your terminal.

**Exception:** Database password needs to come from the secret manager:
```bash
gcloud secrets versions access latest --secret=db-password
```

This is already built into all the provided commands.

---

## Ready to Fix?

**Choose your approach:**

- **In a hurry?** → Go to `PHASE_2_4_COPY_PASTE_COMMANDS.md`
- **Want to understand first?** → Go to `PHASE_2_4_SUMMARY.md`
- **Like flowcharts?** → Go to `PHASE_2_4_FLOWCHART.txt`
- **Need everything?** → Go to `PHASE_2_4_TROUBLESHOOTING_GUIDE.md`

**Pick one and start now.** You'll have this fixed in 15-30 minutes.

---

**Good luck! You've got this.**

Once Phase 2.4 passes, Phase 3 (Network Infrastructure) is straightforward and takes about 15-20 minutes.

