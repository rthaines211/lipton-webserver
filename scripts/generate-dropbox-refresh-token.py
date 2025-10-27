#!/usr/bin/env python3
"""
Dropbox Refresh Token Generator
================================

This script generates a permanent refresh token for Dropbox OAuth authentication.
Run this once to get credentials that auto-refresh forever.

Prerequisites:
    pip install dropbox

Usage:
    python3 scripts/generate-dropbox-refresh-token.py

What this does:
    1. Prompts for your Dropbox App Key and App Secret
    2. Generates an authorization URL
    3. You visit the URL and authorize the app
    4. You paste the authorization code back here
    5. Script generates a REFRESH TOKEN (store this in GCP Secret Manager)

Author: Claude Code
Date: 2025-10-27
"""

import sys
import os

# Check if dropbox is installed
try:
    from dropbox import DropboxOAuth2FlowNoRedirect
except ImportError:
    print("❌ Dropbox library not found!")
    print("\nAttempting to install dropbox library...")

    # Try to install with --user flag (works on most systems)
    result = os.system(f"{sys.executable} -m pip install --user dropbox 2>/dev/null")

    if result != 0:
        # If that fails, try with --break-system-packages (macOS workaround)
        print("Trying alternative installation method...")
        result = os.system(f"{sys.executable} -m pip install --break-system-packages dropbox 2>/dev/null")

    if result == 0:
        print("✅ Dropbox library installed successfully!")
        print("\nPlease run this script again to continue.")
    else:
        print("\n⚠️  Automatic installation failed.")
        print("\nPlease install manually with ONE of these commands:")
        print(f"  1. {sys.executable} -m pip install --user dropbox")
        print(f"  2. {sys.executable} -m pip install --break-system-packages dropbox")
        print("  3. brew install pipx && pipx install dropbox")
        print("\nThen run this script again.")

    sys.exit(1)


def print_banner():
    """Print a nice banner."""
    print("\n" + "=" * 70)
    print("  DROPBOX REFRESH TOKEN GENERATOR")
    print("=" * 70)
    print()
    print("This script will generate a permanent refresh token for Dropbox.")
    print("You only need to run this once!")
    print()


def get_input(prompt, secret=False):
    """Get input from user with optional secret masking."""
    if secret:
        import getpass
        return getpass.getpass(prompt)
    return input(prompt).strip()


def main():
    """Main function to generate refresh token."""
    print_banner()

    # Step 1: Get App Credentials
    print("📋 STEP 1: Enter Your Dropbox App Credentials")
    print("-" * 70)
    print("Get these from: https://www.dropbox.com/developers/apps")
    print("(Your App → Settings tab → OAuth 2 section)")
    print()

    app_key = get_input("Enter your Dropbox App Key: ")
    if not app_key:
        print("❌ App Key is required!")
        sys.exit(1)

    app_secret = get_input("Enter your Dropbox App Secret: ", secret=True)
    if not app_secret:
        print("❌ App Secret is required!")
        sys.exit(1)

    print()
    print("✅ Credentials received")
    print()

    # Step 2: Start OAuth Flow
    print("🔐 STEP 2: Authorization")
    print("-" * 70)

    try:
        auth_flow = DropboxOAuth2FlowNoRedirect(
            app_key,
            app_secret,
            token_access_type='offline'  # This requests refresh token
        )
    except Exception as e:
        print(f"❌ Failed to initialize OAuth flow: {e}")
        sys.exit(1)

    authorize_url = auth_flow.start()

    print()
    print("Please follow these steps:")
    print()
    print("1. Open this URL in your browser:")
    print(f"   {authorize_url}")
    print()
    print("2. Click 'Allow' to authorize the app")
    print()
    print("3. Copy the authorization code that appears")
    print()

    auth_code = get_input("4. Paste the authorization code here: ")
    if not auth_code:
        print("❌ Authorization code is required!")
        sys.exit(1)

    print()
    print("🔄 Exchanging authorization code for tokens...")
    print()

    # Step 3: Exchange Code for Tokens
    try:
        oauth_result = auth_flow.finish(auth_code)
    except Exception as e:
        print(f"❌ Failed to get tokens: {e}")
        print()
        print("Common issues:")
        print("  - Authorization code expired (they expire quickly, try again)")
        print("  - Incorrect App Key or Secret")
        print("  - Code copied incorrectly (no extra spaces)")
        sys.exit(1)

    # Step 4: Display Results
    print("=" * 70)
    print("  ✅ SUCCESS! TOKENS GENERATED")
    print("=" * 70)
    print()

    print("🔑 YOUR CREDENTIALS:")
    print("-" * 70)
    print()
    print(f"App Key:       {app_key}")
    print(f"App Secret:    {app_secret[:10]}...{app_secret[-10:]}")
    print(f"Refresh Token: {oauth_result.refresh_token}")
    print()

    # Step 5: Instructions
    print("=" * 70)
    print("  📝 NEXT STEPS: Store These in GCP Secret Manager")
    print("=" * 70)
    print()
    print("Run these commands to store your credentials securely:")
    print()
    print("# 1. Create secrets (if they don't exist)")
    print(f"gcloud secrets create dropbox-app-key --project=docmosis-tornado")
    print(f"gcloud secrets create dropbox-app-secret --project=docmosis-tornado")
    print(f"gcloud secrets create dropbox-refresh-token --project=docmosis-tornado")
    print()
    print("# 2. Store the values")
    print(f'echo -n "{app_key}" | gcloud secrets versions add dropbox-app-key --data-file=- --project=docmosis-tornado')
    print(f'echo -n "{app_secret}" | gcloud secrets versions add dropbox-app-secret --data-file=- --project=docmosis-tornado')
    print(f'echo -n "{oauth_result.refresh_token}" | gcloud secrets versions add dropbox-refresh-token --data-file=- --project=docmosis-tornado')
    print()
    print("# 3. Grant access to Cloud Run service account")
    print("for secret in dropbox-app-key dropbox-app-secret dropbox-refresh-token; do")
    print('  gcloud secrets add-iam-policy-binding $secret \\')
    print('    --member="serviceAccount:945419684329-compute@developer.gserviceaccount.com" \\')
    print('    --role="roles/secretmanager.secretAccessor" \\')
    print('    --project=docmosis-tornado')
    print("done")
    print()
    print("=" * 70)
    print()

    # Optional: Save to file
    save_commands = get_input("Would you like to save these commands to a file? (y/n): ")
    if save_commands.lower() in ['y', 'yes']:
        script_path = "setup-dropbox-secrets.sh"
        with open(script_path, 'w') as f:
            f.write("#!/bin/bash\n")
            f.write("# Dropbox Secret Manager Setup\n")
            f.write("# Generated: " + __import__('datetime').datetime.now().isoformat() + "\n\n")
            f.write("set -e\n\n")
            f.write("PROJECT_ID=\"docmosis-tornado\"\n")
            f.write("SERVICE_ACCOUNT=\"945419684329-compute@developer.gserviceaccount.com\"\n\n")
            f.write("echo \"Creating secrets...\"\n")
            f.write("gcloud secrets create dropbox-app-key --project=$PROJECT_ID 2>/dev/null || echo \"Secret already exists\"\n")
            f.write("gcloud secrets create dropbox-app-secret --project=$PROJECT_ID 2>/dev/null || echo \"Secret already exists\"\n")
            f.write("gcloud secrets create dropbox-refresh-token --project=$PROJECT_ID 2>/dev/null || echo \"Secret already exists\"\n\n")
            f.write("echo \"Storing values...\"\n")
            f.write(f'echo -n "{app_key}" | gcloud secrets versions add dropbox-app-key --data-file=- --project=$PROJECT_ID\n')
            f.write(f'echo -n "{app_secret}" | gcloud secrets versions add dropbox-app-secret --data-file=- --project=$PROJECT_ID\n')
            f.write(f'echo -n "{oauth_result.refresh_token}" | gcloud secrets versions add dropbox-refresh-token --data-file=- --project=$PROJECT_ID\n\n')
            f.write("echo \"Granting access to service account...\"\n")
            f.write("for secret in dropbox-app-key dropbox-app-secret dropbox-refresh-token; do\n")
            f.write("  gcloud secrets add-iam-policy-binding $secret \\\n")
            f.write("    --member=\"serviceAccount:$SERVICE_ACCOUNT\" \\\n")
            f.write("    --role=\"roles/secretmanager.secretAccessor\" \\\n")
            f.write("    --project=$PROJECT_ID\n")
            f.write("done\n\n")
            f.write("echo \"✅ All secrets configured successfully!\"\n")

        os.chmod(script_path, 0o755)
        print(f"✅ Commands saved to: {script_path}")
        print(f"   Run with: bash {script_path}")
        print()

    print("🎉 You're all set! After updating GCP secrets, proceed to update the code.")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
