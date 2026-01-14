-- ============================================================================
-- GRANT PERMISSIONS TO app-user-staging
-- Run this SQL in GCP Console → Cloud SQL → legal-forms-db-staging
-- Connect as: postgres user
-- ============================================================================

-- Grant all privileges on the contingency tables to app-user-staging
GRANT ALL PRIVILEGES ON TABLE contingency_agreements TO "app-user-staging";
GRANT ALL PRIVILEGES ON TABLE contingency_plaintiffs TO "app-user-staging";
GRANT ALL PRIVILEGES ON TABLE contingency_defendants TO "app-user-staging";

-- Grant usage on the sequences (for auto-incrementing IDs)
GRANT USAGE, SELECT ON SEQUENCE contingency_agreements_id_seq TO "app-user-staging";
GRANT USAGE, SELECT ON SEQUENCE contingency_plaintiffs_id_seq TO "app-user-staging";
GRANT USAGE, SELECT ON SEQUENCE contingency_defendants_id_seq TO "app-user-staging";

-- Verify permissions were granted
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'app-user-staging'
  AND table_name IN ('contingency_agreements', 'contingency_plaintiffs', 'contingency_defendants')
ORDER BY table_name, privilege_type;
