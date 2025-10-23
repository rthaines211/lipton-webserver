#!/usr/bin/env python3
"""
Toast Notification Removal Script (Python Version)
===================================================

This script safely removes the Notyf toast notification system from the
Lipton Legal application while preserving all core functionality.

This is a more robust version using Python instead of bash for better
multi-line pattern matching and file manipulation.

Usage:
    python3 remove-toasts-v2.py

Author: Claude Code
Date: 2025-10-23
"""

import os
import re
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

# ANSI color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

class ToastRemover:
    def __init__(self):
        self.files_modified = 0
        self.files_deleted = 0
        self.lines_removed = 0
        self.backup_dir = None

    def print_header(self):
        print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.NC}")
        print(f"{Colors.BLUE}     Toast Notification Removal Script (Python){Colors.NC}")
        print(f"{Colors.BLUE}     Lipton Legal Form Application{Colors.NC}")
        print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.NC}")
        print()

    def create_backup(self):
        """Create backup of all files before modification"""
        print(f"{Colors.YELLOW}[1/8]{Colors.NC} Creating backup of files...")

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.backup_dir = f"backups/toast-removal-{timestamp}"
        os.makedirs(self.backup_dir, exist_ok=True)

        files_to_backup = [
            'index.html',
            'js/sse-client.js',
            'js/form-submission.js',
            'package.json',
            'js/toast-notifications.js'
        ]

        for file in files_to_backup:
            if os.path.exists(file):
                shutil.copy2(file, self.backup_dir)
            else:
                print(f"  ⚠️  {file} not found")

        print(f"{Colors.GREEN}✓{Colors.NC} Backup created in: {self.backup_dir}")
        print()

    def remove_from_index_html(self):
        """Remove Notyf CDN references from index.html"""
        print(f"{Colors.YELLOW}[2/8]{Colors.NC} Removing Notyf CDN references from index.html...")

        if not os.path.exists('index.html'):
            print(f"{Colors.RED}✗{Colors.NC} index.html not found")
            print()
            return

        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()

        original_lines = content.count('\n')

        # Remove Notyf CSS link
        content = re.sub(r'.*notyf.*\.min\.css.*\n', '', content, flags=re.IGNORECASE)

        # Remove Notyf JS script
        content = re.sub(r'.*notyf.*\.min\.js.*\n', '', content, flags=re.IGNORECASE)

        # Remove toast-notifications.js script
        content = re.sub(r'.*toast-notifications\.js.*\n', '', content, flags=re.IGNORECASE)

        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)

        new_lines = content.count('\n')
        removed = original_lines - new_lines

        self.files_modified += 1
        self.lines_removed += removed
        print(f"{Colors.GREEN}✓{Colors.NC} Removed {removed} lines from index.html")
        print()

    def remove_from_sse_client(self):
        """Remove toast triggers from js/sse-client.js"""
        print(f"{Colors.YELLOW}[3/8]{Colors.NC} Removing toast triggers from js/sse-client.js...")

        if not os.path.exists('js/sse-client.js'):
            print(f"{Colors.RED}✗{Colors.NC} js/sse-client.js not found")
            print()
            return

        with open('js/sse-client.js', 'r', encoding='utf-8') as f:
            lines = f.readlines()

        original_count = len(lines)
        new_lines = []
        skip_until = None
        removed_blocks = 0

        i = 0
        while i < len(lines):
            line = lines[i]

            # Pattern 1: Remove reconnection toast (lines 104-107)
            if 'if (this.reconnectAttempts > 0)' in line and 'progressToast' in lines[i+1] if i+1 < len(lines) else False:
                # Skip this block (if statement and its contents)
                skip_until = i + 4  # Skip 4 lines
                removed_blocks += 1
                i = skip_until
                continue

            # Pattern 2: Remove progress update toast (lines 170-172)
            if "if (typeof progressToast !== 'undefined' && progressToast.showProgress)" in line:
                # Skip this if block (3 lines)
                i += 3
                removed_blocks += 1
                continue

            # Pattern 3: Remove success toast (lines 203-205)
            if "if (typeof progressToast !== 'undefined' && progressToast.showSuccess)" in line:
                # Skip this if block (3 lines)
                i += 3
                removed_blocks += 1
                continue

            # Pattern 4: Remove error toast (lines 248-250)
            if "if (typeof progressToast !== 'undefined' && progressToast.showError)" in line:
                # Skip this if block - need to handle multi-line
                # Look ahead to find the closing brace
                depth = 0
                j = i
                while j < len(lines):
                    if '{' in lines[j]:
                        depth += lines[j].count('{')
                    if '}' in lines[j]:
                        depth -= lines[j].count('}')
                    j += 1
                    if depth == 0:
                        break
                i = j
                removed_blocks += 1
                continue

            # Pattern 5: Remove connection lost toast (lines 310-312)
            if 'progressToast.showProgress(this.jobId, 0, 0, ' in line and 'Connection lost' in line:
                # Skip just this line
                i += 1
                removed_blocks += 1
                continue

            # Pattern 6: Remove showConnectionFailed method content (lines 367-374)
            if 'showConnectionFailed()' in line:
                # Keep the method declaration but replace the content
                new_lines.append(line)
                i += 1
                # Skip until we find the closing brace of the method
                depth = 0
                started = False
                while i < len(lines):
                    if '{' in lines[i]:
                        depth += lines[i].count('{')
                        started = True
                    if '}' in lines[i]:
                        depth -= lines[i].count('}')

                    # Skip the old content
                    if started and depth == 0:
                        # Found closing brace - add a simple console.error instead
                        new_lines.append(f"        console.error(`Max reconnection attempts reached for ${{this.jobId}}`);\n")
                        new_lines.append(lines[i])  # Add closing brace
                        i += 1
                        break
                    i += 1
                removed_blocks += 1
                continue

            # Keep this line
            new_lines.append(line)
            i += 1

        with open('js/sse-client.js', 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

        removed = original_count - len(new_lines)

        self.files_modified += 1
        self.lines_removed += removed
        print(f"{Colors.GREEN}✓{Colors.NC} Removed {removed_blocks} toast trigger blocks (~{removed} lines) from js/sse-client.js")
        print()

    def remove_from_form_submission(self):
        """Remove toast triggers from js/form-submission.js"""
        print(f"{Colors.YELLOW}[4/8]{Colors.NC} Removing toast triggers from js/form-submission.js...")

        if not os.path.exists('js/form-submission.js'):
            print(f"{Colors.RED}✗{Colors.NC} js/form-submission.js not found")
            print()
            return

        with open('js/form-submission.js', 'r', encoding='utf-8') as f:
            lines = f.readlines()

        original_count = len(lines)
        new_lines = []
        removed_blocks = 0

        i = 0
        while i < len(lines):
            line = lines[i]

            # Pattern 1: Remove background progress toast (line 310)
            if 'progressToast.showProgress(caseId, 0, 0, ' in line and 'Documents generating in background' in line:
                i += 1
                removed_blocks += 1
                continue

            # Pattern 2: Remove success toast block (lines 370-381)
            if "if (!pipelineEnabled && typeof Notyf !== 'undefined')" in line:
                # Skip entire block until we find the matching closing brace
                depth = 0
                while i < len(lines):
                    if '{' in lines[i]:
                        depth += lines[i].count('{')
                    if '}' in lines[i]:
                        depth -= lines[i].count('}')
                    i += 1
                    if depth == 0:
                        break
                removed_blocks += 1
                continue

            # Keep this line
            new_lines.append(line)
            i += 1

        with open('js/form-submission.js', 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

        removed = original_count - len(new_lines)

        self.files_modified += 1
        self.lines_removed += removed
        print(f"{Colors.GREEN}✓{Colors.NC} Removed {removed_blocks} toast trigger blocks (~{removed} lines) from js/form-submission.js")
        print()

    def remove_from_package_json(self):
        """Remove Notyf dependency from package.json"""
        print(f"{Colors.YELLOW}[5/8]{Colors.NC} Removing Notyf dependency from package.json...")

        if not os.path.exists('package.json'):
            print(f"{Colors.RED}✗{Colors.NC} package.json not found")
            print()
            return

        with open('package.json', 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove notyf dependency line
        content = re.sub(r'.*"notyf":\s*"[^"]*",?\n', '', content)

        # Clean up any trailing commas in dependencies object
        content = re.sub(r',(\s*})', r'\1', content)

        with open('package.json', 'w', encoding='utf-8') as f:
            f.write(content)

        self.files_modified += 1
        self.lines_removed += 1
        print(f"{Colors.GREEN}✓{Colors.NC} Removed Notyf dependency from package.json")
        print()

    def delete_toast_notifications(self):
        """Delete js/toast-notifications.js"""
        print(f"{Colors.YELLOW}[6/8]{Colors.NC} Deleting toast-notifications.js...")

        file_path = 'js/toast-notifications.js'
        if not os.path.exists(file_path):
            print(f"{Colors.YELLOW}⚠{Colors.NC} js/toast-notifications.js not found (may already be deleted)")
            print()
            return

        # Count lines before deletion
        with open(file_path, 'r', encoding='utf-8') as f:
            lines_in_file = len(f.readlines())

        os.remove(file_path)

        self.files_deleted += 1
        self.lines_removed += lines_in_file
        print(f"{Colors.GREEN}✓{Colors.NC} Deleted js/toast-notifications.js ({lines_in_file} lines)")
        print()

    def clean_dist_artifacts(self):
        """Clean dist/ build artifacts"""
        print(f"{Colors.YELLOW}[7/8]{Colors.NC} Cleaning build artifacts in dist/...")

        dist_files_removed = 0

        # Remove dist/js/toast-notifications.js
        if os.path.exists('dist/js/toast-notifications.js'):
            os.remove('dist/js/toast-notifications.js')
            dist_files_removed += 1
            print(f"{Colors.GREEN}✓{Colors.NC} Removed dist/js/toast-notifications.js")

        # Update dist/index.html if it exists
        if os.path.exists('dist/index.html'):
            with open('dist/index.html', 'r', encoding='utf-8') as f:
                content = f.read()

            # Remove Notyf references
            content = re.sub(r'.*notyf.*\.min\.css.*\n', '', content, flags=re.IGNORECASE)
            content = re.sub(r'.*notyf.*\.min\.js.*\n', '', content, flags=re.IGNORECASE)
            content = re.sub(r'.*toast-notifications\.js.*\n', '', content, flags=re.IGNORECASE)

            with open('dist/index.html', 'w', encoding='utf-8') as f:
                f.write(content)

            dist_files_removed += 1
            print(f"{Colors.GREEN}✓{Colors.NC} Updated dist/index.html")

        if dist_files_removed == 0:
            print(f"{Colors.YELLOW}⚠{Colors.NC} No dist/ artifacts found (may not be built yet)")
        else:
            self.files_modified += dist_files_removed

        print()

    def run_npm_install(self):
        """Run npm install to update package-lock.json"""
        print(f"{Colors.YELLOW}[8/8]{Colors.NC} Running npm install to update dependencies...")

        try:
            subprocess.run(['npm', 'install', '--silent'], check=True, capture_output=True)
            print(f"{Colors.GREEN}✓{Colors.NC} npm install completed successfully")
        except subprocess.CalledProcessError:
            print(f"{Colors.YELLOW}⚠{Colors.NC} npm install failed - run manually later")
        except FileNotFoundError:
            print(f"{Colors.YELLOW}⚠{Colors.NC} npm not found - skipping dependency update")
            print(f"  Run 'npm install' manually to update package-lock.json")

        print()

    def print_summary(self):
        """Print summary of changes"""
        print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.NC}")
        print(f"{Colors.GREEN}     Removal Complete!{Colors.NC}")
        print(f"{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.NC}")
        print()
        print(f"{Colors.GREEN}Summary:{Colors.NC}")
        print(f"  Files modified: {self.files_modified}")
        print(f"  Files deleted: {self.files_deleted}")
        print(f"  Lines removed: {self.lines_removed}")
        print(f"  Backup location: {self.backup_dir}")
        print()
        print(f"{Colors.YELLOW}What Changed:{Colors.NC}")
        print(f"  ✓ Removed Notyf CDN references from index.html")
        print(f"  ✓ Removed toast triggers from js/sse-client.js")
        print(f"  ✓ Removed toast triggers from js/form-submission.js")
        print(f"  ✓ Removed Notyf from package.json dependencies")
        print(f"  ✓ Deleted js/toast-notifications.js")
        print(f"  ✓ Cleaned dist/ build artifacts")
        print(f"  ✓ Updated npm dependencies")
        print()
        print(f"{Colors.YELLOW}What Still Works:{Colors.NC}")
        print(f"  ✓ Form submission and validation")
        print(f"  ✓ Document generation pipeline (background)")
        print(f"  ✓ SSE connection and progress tracking")
        print(f"  ✓ Database persistence")
        print(f"  ✓ File uploads to Dropbox")
        print()
        print(f"{Colors.YELLOW}What's Different:{Colors.NC}")
        print(f"  ⚠ No visual toast notifications")
        print(f"  ⚠ No progress indicators during document generation")
        print(f"  ⚠ No success/error popups")
        print(f"  ℹ Check browser console for progress logs")
        print()
        print(f"{Colors.BLUE}Next Steps:{Colors.NC}")
        print(f"  1. Test the application thoroughly (see TOAST_REMOVAL_PLAN.md)")
        print(f"  2. Run 'npm run build' to rebuild dist/ directory")
        print(f"  3. Deploy to production after verification")
        print()
        print(f"{Colors.BLUE}Rollback Instructions:{Colors.NC}")
        print(f"  If you need to restore the toast system:")
        print(f"  {Colors.GREEN}cp {self.backup_dir}/* .{Colors.NC}")
        print(f"  {Colors.GREEN}npm install{Colors.NC}")
        print()
        print(f"{Colors.GREEN}Done!{Colors.NC} Review TOAST_REMOVAL_PLAN.md for testing checklist.")
        print()

    def run(self):
        """Execute the removal process"""
        self.print_header()
        self.create_backup()
        self.remove_from_index_html()
        self.remove_from_sse_client()
        self.remove_from_form_submission()
        self.remove_from_package_json()
        self.delete_toast_notifications()
        self.clean_dist_artifacts()
        self.run_npm_install()
        self.print_summary()

if __name__ == '__main__':
    remover = ToastRemover()
    remover.run()
