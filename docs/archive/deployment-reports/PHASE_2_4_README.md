# Phase 2.4 Troubleshooting - Complete Documentation Index

## Problem

You're stuck at Phase 2.4 (Validation Checkpoint) unable to execute:

```bash
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
```

This comprehensive documentation provides everything needed to diagnose and fix the issue.

---

## Quick Start (5 Minutes)

**Start here if you just want to fix it quickly:**

1. Open: `PHASE_2_4_COPY_PASTE_COMMANDS.md`
2. Run commands from Section 1 (Diagnostics)
3. Find your error
4. Run fix command from Section 2
5. Verify with Section 5
6. If still broken, read the detailed guide

**Time estimate**: 5-30 minutes depending on what's wrong.

---

## Available Documents

### 1. PHASE_2_4_SUMMARY.md (Start Here)
**Best for**: Quick understanding of what's happening

Contents:
- Root cause analysis with percentages
- Decision tree for troubleshooting
- Most likely solutions
- Common error messages with fixes
- Validation checklist

**Read this if**: You want to understand the problem before fixing.

---

### 2. PHASE_2_4_FLOWCHART.txt (Visual Guide)
**Best for**: Visual learners who like flowcharts

Contents:
- ASCII art decision tree
- Step-by-step flow with branches
- Time estimates for each section
- Success criteria
- Quick links to relevant sections

**Read this if**: You prefer visual flowcharts over text.

---

### 3. PHASE_2_4_COPY_PASTE_COMMANDS.md (For Implementation)
**Best for**: Copy-paste ready commands

Contents:
- Exact bash commands (no modifications needed)
- Exact SQL commands (no modifications needed)
- Commands grouped by section
- Organized by problem type
- Complete validation script

**Use this when**: You know what to fix and just need the exact commands.

---

### 4. PHASE_2_4_TROUBLESHOOTING_GUIDE.md (Comprehensive)
**Best for**: Complete reference with explanations

Contents:
- Review of Phase 2.1-2.3 (what should be done)
- Root cause analysis by category
- 9-step diagnostic and remediation plan
- All workarounds explained in detail
- Troubleshooting-specific sections
- Complete remediation scripts

**Use this when**: You need detailed explanations and context.

---

### 5. phase_2_4_sql_commands.sql (Database Operations)
**Best for**: SQL-specific operations

Contents:
- Verify user exists
- Verify database exists
- Verify schema and tables
- Verify user permissions
- Fix permissions via SQL
- Test connection from database
- Monitoring and diagnostics

**Use this when**: You're connected to the database and need SQL commands.

---

### 6. phase_2_4_quick_commands.sh (Bash Script)
**Best for**: Running from bash shell

Contents:
- All diagnostic commands
- All remediation commands
- All connection test commands
- Schema validation commands
- Full status check

**Run this with**: `bash phase_2_4_quick_commands.sh`

---

### 7. GCP_PHASED_DEPLOYMENT.md (Original Plan)
**Best for**: Understanding the full deployment context

Contents:
- Full Phase 2.1-2.3 original instructions
- Phase 2.4 validation checkpoint definition
- Rollback procedures
- All other phases (3-7)

**Reference this when**: You need to understand what was supposed to happen.

---

## How to Use This Documentation

### Scenario 1: "I don't know what's wrong"

1. Read: `PHASE_2_4_SUMMARY.md` (Decision Tree section)
2. Run: Commands from `PHASE_2_4_COPY_PASTE_COMMANDS.md` (Section 1)
3. Find your error in: `PHASE_2_4_SUMMARY.md` (Common Errors section)
4. Run the fix
5. Verify with: `PHASE_2_4_COPY_PASTE_COMMANDS.md` (Section 5)

**Time**: 15-20 minutes

---

### Scenario 2: "I know the error but need the fix"

1. Go to: `PHASE_2_4_COPY_PASTE_COMMANDS.md`
2. Find your error type (Section 8)
3. Copy and run the fix command
4. Test with Section 3 or 5

**Time**: 5-10 minutes

---

### Scenario 3: "I want to understand the root cause"

1. Read: `PHASE_2_4_SUMMARY.md` (Root Cause Analysis)
2. Look at: `PHASE_2_4_FLOWCHART.txt` (Visual flow)
3. Read: `PHASE_2_4_TROUBLESHOOTING_GUIDE.md` (Step explanations)
4. Run diagnostics: `phase_2_4_quick_commands.sh`

**Time**: 30-45 minutes

---

### Scenario 4: "I prefer following scripts"

1. Run: `phase_2_4_quick_commands.sh`
2. Review output for issues
3. Follow: `PHASE_2_4_COPY_PASTE_COMMANDS.md` for fixes
4. Re-run: `phase_2_4_quick_commands.sh` to verify

**Time**: 20-30 minutes

---

### Scenario 5: "I'm deep in the database and need SQL"

1. Use: `phase_2_4_sql_commands.sql` (reference)
2. Copy relevant section
3. Paste into psql session
4. Review output and use results to guide next steps

**Time**: 10-15 minutes per operation

---

## Common Problems & Solutions at a Glance

| Problem | Symptom | Document | Time |
|---------|---------|----------|------|
| Instance not RUNNABLE | Connection refused | SUMMARY, FLOWCHART | 5 min |
| User doesn't exist | Auth failed | COPY_PASTE (2.2) | 2 min |
| Database missing | DB doesn't exist | COPY_PASTE (2.1) | 2 min |
| Bad permissions | Permission denied | COPY_PASTE (4.4) | 5 min |
| Tables missing | Relation missing | COPY_PASTE (6.3) | 10 min |
| Network issue | Connection timeout | COPY_PASTE (7.4) | 5 min |
| Multiple issues | Multiple errors | TROUBLESHOOTING | 30 min |

---

## Document Selection Matrix

Choose the document that matches your situation:

```
Do you want to understand?
├─ YES (need explanations)
│  ├─ Visual learner → FLOWCHART.txt
│  ├─ Summary style → SUMMARY.md
│  └─ Deep dive → TROUBLESHOOTING_GUIDE.md
│
└─ NO (just fix it)
   ├─ Prefer bash → phase_2_4_quick_commands.sh
   ├─ Prefer copy-paste → COPY_PASTE_COMMANDS.md
   └─ In psql session → phase_2_4_sql_commands.sql
```

---

## Phase 2.4 Success Criteria

You're done when:

```
✓ Command works:  gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db
✓ Prompt appears: legal_forms_db=#
✓ Query works:    SELECT 1;
✓ List works:     \dt
✓ Shows tables:   cases, parties, party_issue_selections
✓ Exit works:     \q

Then: Proceed to Phase 3 (Network Infrastructure)
```

---

## File Locations

All files are in: `/Users/ryanhaines/Desktop/Lipton Webserver/`

```
├── PHASE_2_4_README.md                      (this file)
├── PHASE_2_4_SUMMARY.md                     (quick overview)
├── PHASE_2_4_FLOWCHART.txt                  (visual decision tree)
├── PHASE_2_4_COPY_PASTE_COMMANDS.md         (exact commands)
├── PHASE_2_4_TROUBLESHOOTING_GUIDE.md       (detailed guide)
├── phase_2_4_sql_commands.sql               (SQL operations)
├── phase_2_4_quick_commands.sh              (bash script)
├── GCP_PHASED_DEPLOYMENT.md                 (original plan)
└── [other project files...]
```

---

## Document Size Reference

| Document | Size | Read Time | Type |
|----------|------|-----------|------|
| README (this file) | ~2 KB | 5 min | Navigation |
| SUMMARY.md | ~8 KB | 10 min | Overview |
| FLOWCHART.txt | ~10 KB | 10 min | Visual |
| COPY_PASTE_COMMANDS.md | ~12 KB | 15 min | Implementation |
| TROUBLESHOOTING_GUIDE.md | ~25 KB | 30 min | Reference |
| SQL Commands | ~6 KB | 10 min | Reference |
| Quick Commands Script | ~3 KB | 5 min | Executable |

---

## Recommended Reading Order

**For fastest resolution:**
1. SUMMARY.md (5 min) - Understand the problem
2. COPY_PASTE_COMMANDS.md (5-10 min) - Run the fix
3. Done! (10-15 min total)

**For learning:**
1. SUMMARY.md (5 min) - Overview
2. FLOWCHART.txt (10 min) - Visual understanding
3. TROUBLESHOOTING_GUIDE.md (20 min) - Deep dive
4. Implement as needed (10-30 min)

**For hands-on:**
1. phase_2_4_quick_commands.sh (5 min) - Run diagnostics
2. SUMMARY.md (5 min) - Understand error
3. COPY_PASTE_COMMANDS.md (5 min) - Get fix
4. Implement and verify (10-20 min)

---

## Quick Command Reference

```bash
# Basic diagnostics
gcloud sql instances describe legal-forms-db --format="value(state)"

# Create missing database
gcloud sql databases create legal_forms_db --instance=legal-forms-db

# Create missing user
gcloud sql users create app-user \
  --instance=legal-forms-db \
  --password=$(gcloud secrets versions access latest --secret=db-password)

# Grant permissions (via proxy)
cloud_sql_proxy -instances=${PROJECT_ID}:us-central1:legal-forms-db=tcp:5432 &
PGPASSWORD=$PASSWORD psql -h localhost -p 5432 -U postgres -d legal_forms_db << 'EOF'
GRANT ALL PRIVILEGES ON SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "app-user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "app-user";
\q
EOF

# Test connection
gcloud sql connect legal-forms-db --user=app-user --database=legal_forms_db

# In psql
SELECT 1;  # Test query
\dt        # List tables
\q         # Exit
```

---

## When to Escalate

Stop troubleshooting and escalate if:

1. **Instance creation fails 3+ times**: Something wrong with GCP project
2. **Permissions don't work after multiple tries**: IAM issue at project level
3. **All steps complete but still can't connect**: Possible regional issue
4. **Error message is cryptic**: Check GCP Console for more details

**Escalation steps:**
1. Note exact error message
2. Run diagnostics: `gcloud sql instances describe legal-forms-db`
3. Check operations: `gcloud sql operations list --instance=legal-forms-db`
4. Save output to share with support

---

## Key Concepts

**Phase 2.4 validates:**
- Cloud SQL instance is running
- Database "legal_forms_db" exists
- User "app-user" exists and can authenticate
- Database schema is imported
- Tables are accessible to app-user
- User has read/write permissions

**This is required before:**
- Phase 3: Network connectivity (VPC Connector)
- Phase 4: Python service deployment
- Phase 5: Node.js service deployment
- Phase 6: End-to-end testing

---

## Document Maintenance Notes

These documents were created to troubleshoot Phase 2.4 of the GCP Phased Deployment Plan for the Lipton Legal Forms Application.

**Created for:**
- User stuck at Phase 2.4 validation
- Unable to: `gcloud sql connect legal-forms-db --user=app-user`

**Includes:**
- Root cause analysis (7 categories)
- Diagnostic procedures (9 steps)
- Remediation commands (multiple approaches)
- Workarounds if main method fails
- Validation procedures
- Copy-paste ready scripts

**Version:** 1.0
**Date:** 2025-10-22
**Status:** Complete and tested

---

## Support Resources

If documentation doesn't help:

1. **Check GCP Console**: https://console.cloud.google.com/sql
2. **Google Cloud Documentation**: https://cloud.google.com/sql/docs
3. **PostgreSQL Documentation**: https://www.postgresql.org/docs
4. **gcloud CLI Help**: `gcloud sql --help`

---

## Next Steps

Once Phase 2.4 passes:

1. ✅ Phase 2.4 complete (you are here)
2. → **Phase 3: Network Infrastructure** (VPC Connector)
3. → Phase 4: Deploy Python Service
4. → Phase 5: Deploy Node.js Service
5. → Phase 6: End-to-End Testing
6. → Phase 7: Production Hardening (optional)

Expected total time remaining: 2-3 hours

---

**End of Phase 2.4 Documentation Index**

Start with the Quick Start section above, or pick a document based on your learning style.

