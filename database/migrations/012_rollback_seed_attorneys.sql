-- Rollback for Migration 012: Seed attorneys
-- Removes Kevin Lipton and Michael Falsafi attorneys

BEGIN;

DELETE FROM attorneys WHERE email IN ('kevin@liptonlegal.com', 'michael@liptonlegal.com');

COMMIT;

-- Verify removal
SELECT id, full_name, email, role, active FROM attorneys ORDER BY full_name;
