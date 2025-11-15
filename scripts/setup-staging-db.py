#!/usr/bin/env python3
"""
Setup Staging Database Schema
Connects to staging Cloud SQL database and creates the schema
"""

import os
import sys
import subprocess

# Database configuration
INSTANCE_CONNECTION_NAME = "docmosis-tornado:us-central1:legal-forms-db-staging"
DB_USER = "postgres"
DB_NAME = "legal_forms_db_staging"
SCHEMA_FILE = "database/schema.sql"
REGEN_MIGRATION_FILE = "database/migrate_add_regeneration_tracking.sql"
DOCUMENT_TYPES_MIGRATION = "database/migrate_add_document_types.sql"

def get_db_password():
    """Get database password from secret manager"""
    try:
        result = subprocess.run(
            ["gcloud", "secrets", "versions", "access", "latest",
             "--secret=legal-forms-db-password"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to get database password: {e}")
        print("💡 You can manually set it: export DB_PASSWORD='your-password'")
        return os.environ.get('DB_PASSWORD')

def read_sql_file(filepath):
    """Read SQL file contents"""
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ SQL file not found: {filepath}")
        return None

def execute_sql_via_gcloud(sql_content, description):
    """Execute SQL using gcloud sql connect command"""
    print(f"\n{'='*60}")
    print(f"📝 {description}")
    print(f"{'='*60}\n")

    # Create temporary SQL file
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as tmp:
        tmp.write(sql_content)
        tmp_path = tmp.name

    try:
        # Execute via stdin to avoid psql requirement
        # Using gcloud sql execute command
        cmd = [
            "gcloud", "sql", "connect", "legal-forms-db-staging",
            "--user", DB_USER,
            "--database", DB_NAME,
            "--quiet"
        ]

        print(f"🔄 Executing SQL...")
        print(f"   Command: {' '.join(cmd)}")
        print(f"   Input file: {tmp_path}")
        print()

        with open(tmp_path, 'r') as sql_file:
            result = subprocess.run(
                cmd,
                stdin=sql_file,
                capture_output=True,
                text=True
            )

        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            if result.stdout:
                print(f"   Output: {result.stdout[:500]}")
        else:
            print(f"❌ {description} - FAILED")
            print(f"   Error: {result.stderr}")
            return False

    finally:
        # Cleanup temp file
        try:
            os.unlink(tmp_path)
        except:
            pass

    return True

def main():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║     STAGING DATABASE SCHEMA SETUP                             ║
╚═══════════════════════════════════════════════════════════════╝

Target Database: {INSTANCE_CONNECTION_NAME}
Database Name: {DB_NAME}
User: {DB_USER}

⚠️  NOTE: This requires psql client to be installed.
⚠️  If psql is not available, install it with: brew install postgresql

""".format(
        INSTANCE_CONNECTION_NAME=INSTANCE_CONNECTION_NAME,
        DB_NAME=DB_NAME,
        DB_USER=DB_USER
    ))

    # Check if psql is available
    try:
        subprocess.run(['psql', '--version'], capture_output=True, check=True)
        print("✅ psql client found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ psql client not found")
        print("📦 Installing PostgreSQL client...")
        print()

        # Try to install via homebrew
        try:
            result = subprocess.run(
                ['brew', 'install', 'postgresql@15'],
                capture_output=True,
                text=True,
                timeout=300
            )
            if result.returncode == 0:
                print("✅ PostgreSQL client installed successfully")
            else:
                print("❌ Failed to install PostgreSQL client")
                print(f"   Error: {result.stderr}")
                print()
                print("💡 Please install manually:")
                print("   brew install postgresql@15")
                print("   OR")
                print("   brew install postgresql")
                return 1
        except subprocess.TimeoutExpired:
            print("⏱️  Installation taking too long...")
            print("💡 Please run manually: brew install postgresql@15")
            return 1
        except Exception as e:
            print(f"❌ Error installing: {e}")
            return 1

    print()
    input("Press ENTER to continue with schema creation...")
    print()

    # Step 1: Create main schema
    print("📖 Reading main schema file...")
    schema_sql = read_sql_file(SCHEMA_FILE)
    if not schema_sql:
        return 1

    success = execute_sql_via_gcloud(schema_sql, "Creating main database schema")
    if not success:
        return 1

    # Step 2: Add document types migration
    print("\n📖 Reading document types migration...")
    if os.path.exists(DOCUMENT_TYPES_MIGRATION):
        doc_types_sql = read_sql_file(DOCUMENT_TYPES_MIGRATION)
        if doc_types_sql:
            execute_sql_via_gcloud(doc_types_sql, "Adding document types column")

    # Step 3: Add regeneration tracking migration
    print("\n📖 Reading regeneration tracking migration...")
    if os.path.exists(REGEN_MIGRATION_FILE):
        regen_sql = read_sql_file(REGEN_MIGRATION_FILE)
        if regen_sql:
            execute_sql_via_gcloud(regen_sql, "Adding regeneration tracking columns")

    print(f"\n{'='*60}")
    print("✅ DATABASE SETUP COMPLETE!")
    print(f"{'='*60}\n")

    print("🎉 The staging database is now ready for:")
    print("   • Form submissions")
    print("   • Document regeneration")
    print("   • Regeneration tracking and analytics")
    print()
    print("🧪 Next step: Test the regeneration feature at:")
    print("   https://node-server-staging-zyiwmzwenq-uc.a.run.app")
    print()

    return 0

if __name__ == "__main__":
    sys.exit(main())
