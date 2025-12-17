-- Migration 012: Seed attorneys
-- Adds Kevin Lipton and Michael Falsafi as attorneys

BEGIN;

-- First, ensure the attorneys table has the required columns
-- (If you get errors, run this ALTER TABLE first)
-- ALTER TABLE attorneys ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
-- ALTER TABLE attorneys ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- UPDATE attorneys SET full_name = name WHERE full_name IS NULL;

-- Insert Kevin Lipton
-- Note: password_hash is NULL - attorneys use token-based auth, not password auth
INSERT INTO attorneys (email, full_name, password_hash, role, active)
VALUES (
    'kevin@liptonlegal.com',
    'Kevin Lipton',
    NULL,
    'attorney',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    active = EXCLUDED.active;

-- Insert Michael Falsafi
-- Note: password_hash is NULL - attorneys use token-based auth, not password auth
INSERT INTO attorneys (email, full_name, password_hash, role, active)
VALUES (
    'michael@liptonlegal.com',
    'Michael Falsafi',
    NULL,
    'attorney',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    active = EXCLUDED.active;

COMMIT;

-- Verify insertion
SELECT id, full_name, email, role, active FROM attorneys ORDER BY full_name;
