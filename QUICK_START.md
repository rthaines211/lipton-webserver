# Quick Start - Run Migration Now

## Step 1: Connect to Database

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
```

**Password when prompted:** `VVAqB2mUqdAxIBnej1MnYjg3v`

## Step 2: Run Migration

Once connected (you'll see `legal_forms_db_dev=>`), paste this:

```sql
\i migrations/001_create_intake_tables.sql
```

## Step 3: Verify

```sql
-- Should show 9 tables
\dt

-- Exit
\q
```

## That's it!

Your 9 intake tables are now created:
- ✅ intake_submissions
- ✅ intake_page_1, intake_page_2, intake_page_3, intake_page_4, intake_page_5
- ✅ saved_sessions
- ✅ attorneys
- ✅ audit_logs

---

## Next Steps (After Migration Success)

```bash
# Commit the migration files
git add migrations/
git commit -m "feat: add database migration for 9 intake tables"
git push origin dev/intake-system
```

Then tell Claude "migration complete" and we'll continue with:
1. ✅ Verify tables (we'll check together)
2. Creating the database connection service
3. Creating the intake service skeleton

---

## If Something Goes Wrong

To rollback (removes all tables):
```bash
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
# Then: \i migrations/001_rollback.sql
```

---

**Ready? Copy the Step 1 command above and run it in your terminal!**
