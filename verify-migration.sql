-- Verify migration was successful

\echo '========================================='
\echo 'MIGRATION VERIFICATION'
\echo '========================================='
\echo ''

\echo '1. Checking intake_submissions structure:'
\d intake_submissions

\echo ''
\echo '2. Counting indexes created:'
SELECT COUNT(*) as total_indexes FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'));

\echo ''
\echo '3. Listing all indexes:'
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE 'intake_%' OR tablename IN ('saved_sessions', 'attorneys', 'audit_logs'))
ORDER BY tablename, indexname;

\echo ''
\echo '4. Testing INSERT and trigger:'
INSERT INTO intake_submissions (intake_number, client_email, first_name, last_name)
VALUES ('INT-2025-TEST1', 'test@example.com', 'Test', 'User');

\echo ''
\echo '5. Testing UPDATE trigger (updated_at should change):'
SELECT pg_sleep(1); -- Wait 1 second
UPDATE intake_submissions
SET client_phone = '555-1234'
WHERE intake_number = 'INT-2025-TEST1';

\echo ''
\echo '6. Verifying trigger worked (updated_at should be > created_at):'
SELECT
    intake_number,
    created_at,
    updated_at,
    (updated_at > created_at) as trigger_works
FROM intake_submissions
WHERE intake_number = 'INT-2025-TEST1';

\echo ''
\echo '7. Cleaning up test data:'
DELETE FROM intake_submissions WHERE intake_number = 'INT-2025-TEST1';

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE!'
\echo '========================================='
