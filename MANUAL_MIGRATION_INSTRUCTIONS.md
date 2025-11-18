# Manual Migration Instructions

Since automated connection is having password issues, here's how to run the migration manually:

## Option 1: Using gcloud sql connect (Recommended)

1. **Connect to the database:**
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev
   ```

2. **When prompted for password, enter:**
   ```
   VVAqB2mUqdAxIBnej1MnYjg3v
   ```

3. **Once connected (you'll see `legal_forms_db_dev=>`), run:**
   ```sql
   \i migrations/001_create_intake_tables.sql
   ```

4. **Verify tables were created:**
   ```sql
   \dt
   ```
   You should see 9 new tables: intake_submissions, intake_page_1 through intake_page_5, saved_sessions, attorneys, and audit_logs.

5. **Check one of the tables:**
   ```sql
   \d intake_submissions
   ```

6. **Exit when done:**
   ```sql
   \q
   ```

## Option 2: Using psql directly

If Option 1 doesn't work, try connecting with the database IP:

1. **Get the IP address:**
   ```bash
   gcloud sql instances describe legal-forms-db-dev --format='value(ipAddresses[0].ipAddress)'
   ```

2. **Connect using psql:**
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   psql "host=34.170.73.198 port=5432 dbname=legal_forms_db_dev user=app-user-dev sslmode=require"
   ```
   Password: `VVAqB2mUqdAxIBnej1MnYjg3v`

3. **Then run the migration:**
   ```sql
   \i migrations/001_create_intake_tables.sql
   ```

## Verification Queries

After running the migration, verify everything worked:

```sql
-- Count tables created
SELECT COUNT(*) as table_count FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'));
-- Should return: 9

-- List all intake tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'))
ORDER BY tablename;

-- Count indexes
SELECT COUNT(*) as index_count FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'));
-- Should return: 23

-- Test insert and trigger
INSERT INTO intake_submissions (intake_number, client_email, first_name, last_name)
VALUES ('INT-2025-TEST1', 'test@example.com', 'Test', 'User');

SELECT intake_number, created_at, updated_at FROM intake_submissions WHERE intake_number = 'INT-2025-TEST1';

-- Clean up test
DELETE FROM intake_submissions WHERE intake_number = 'INT-2025-TEST1';
```

## After Successful Migration

Once the migration is complete, run these commands:

```bash
# Update migration log
echo "Migration 001 completed: $(date)" >> migrations/MIGRATION_LOG.md

# Commit the migration
git add migrations/001_create_intake_tables.sql
git commit -m "feat: add database migration for 9 intake tables

- Created intake_submissions table
- Created 5 intake_page tables with JSONB storage
- Created saved_sessions for save/resume functionality
- Created attorneys table for authentication
- Created audit_logs for compliance tracking
- Added 23 indexes for performance
- Added 6 triggers for automatic timestamps"

git push origin dev/intake-system
```

## Troubleshooting

### Password not working
- Make sure you're copying the password exactly: `VVAqB2mUqdAxIBnej1MnYjg3v`
- No extra spaces or newlines
- Password is case-sensitive

### Can't connect
- Make sure your IP is allowlisted (gcloud does this automatically)
- Check the instance is running: `gcloud sql instances describe legal-forms-db-dev --format='value(state)'` should return `RUNNABLE`

### Migration fails midway
- If you get an error about tables already existing, that's OK - the migration uses `IF NOT EXISTS`
- To start fresh: See migrations/001_rollback.sql (we'll create this next)
