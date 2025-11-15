#!/usr/bin/env python3
"""
Form Validation Runner - Wrapper around run_pipeline.py

This script allows you to validate any form submission JSON file through
the complete 5-phase pipeline, generating output files for manual inspection.

Usage:
    cd "normalization work"

    # Run with default formtest.json
    venv/bin/python3 validate_form.py

    # Run with a specific form submission
    venv/bin/python3 validate_form.py ../data/form-entry-1762795845839-a71rqbo8i.json

    # Run with webhooks enabled
    venv/bin/python3 validate_form.py ../data/form-entry-*.json --send-webhooks

    # List recent form submissions
    venv/bin/python3 validate_form.py --list

Output:
    Creates timestamped files for each phase:
    - output_phase1_[timestamp].json
    - output_phase2_[timestamp].json
    - output_phase3_[timestamp].json
    - output_phase4_[timestamp].json
    - output_phase5_[timestamp].json
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
import shutil

def list_recent_forms(data_dir: Path, limit: int = 10):
    """List recent form submissions."""
    forms = sorted(data_dir.glob("form-entry-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)

    print(f"\n📋 Recent form submissions (showing {min(limit, len(forms))} of {len(forms)}):\n")
    print(f"{'#':<4} {'Filename':<45} {'Size':<10} {'Modified':<20}")
    print("-" * 85)

    for i, form_path in enumerate(forms[:limit], 1):
        stat = form_path.stat()
        size = f"{stat.st_size / 1024:.1f}KB"
        modified = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{i:<4} {form_path.name:<45} {size:<10} {modified:<20}")

    print()

def get_form_summary(form_path: Path) -> dict:
    """Extract summary information from a form submission."""
    try:
        with open(form_path) as f:
            data = json.load(f)

        # Extract key information
        plaintiffs = data.get("PlaintiffDetails", [])
        defendants = data.get("DefendantDetails2", [])
        address = data.get("Full_Address", {}).get("StreetAddress", "Unknown")

        hoh_plaintiffs = [p for p in plaintiffs if p.get("HeadOfHousehold")]

        return {
            "address": address,
            "plaintiffs": len(plaintiffs),
            "hoh_plaintiffs": len(hoh_plaintiffs),
            "defendants": len(defendants),
            "timestamp": data.get("serverTimestamp", "Unknown")
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(
        description="Validate form submissions through the 5-phase pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate the default formtest.json
  venv/bin/python3 validate_form.py

  # Validate a specific form submission
  venv/bin/python3 validate_form.py ../data/form-entry-1762795845839-a71rqbo8i.json

  # List recent form submissions
  venv/bin/python3 validate_form.py --list

  # Validate with webhooks enabled
  venv/bin/python3 validate_form.py ../data/form-entry-*.json --send-webhooks
        """
    )

    parser.add_argument(
        "input_file",
        nargs="?",
        default="formtest.json",
        help="Path to form submission JSON file (default: formtest.json)"
    )

    parser.add_argument(
        "--send-webhooks",
        action="store_true",
        help="Send webhooks after pipeline completion"
    )

    parser.add_argument(
        "--list",
        action="store_true",
        help="List recent form submissions in ../data/ directory"
    )

    parser.add_argument(
        "--webhook-config",
        default=".env",
        help="Path to webhook configuration file (default: .env)"
    )

    args = parser.parse_args()

    # Handle --list command
    if args.list:
        data_dir = Path(__file__).parent.parent / "data"
        if data_dir.exists():
            list_recent_forms(data_dir)
            return 0
        else:
            print(f"❌ Data directory not found: {data_dir}")
            return 1

    # Resolve input file path
    input_path = Path(args.input_file)

    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        print("\nTip: Use --list to see available form submissions")
        return 1

    # Get form summary
    print("\n" + "=" * 70)
    print("  FORM VALIDATION RUNNER")
    print("=" * 70)
    print(f"\n📄 Input file: {input_path}")

    summary = get_form_summary(input_path)
    if "error" not in summary:
        print(f"   Address: {summary['address']}")
        print(f"   Plaintiffs: {summary['plaintiffs']} (HoH: {summary['hoh_plaintiffs']})")
        print(f"   Defendants: {summary['defendants']}")
        print(f"   Timestamp: {summary['timestamp']}")
        print(f"\n   Expected datasets: {summary['hoh_plaintiffs']} × {summary['defendants']} = {summary['hoh_plaintiffs'] * summary['defendants']}")

    # If input file is not formtest.json, copy it
    formtest_path = Path("formtest.json")

    if input_path.resolve() != formtest_path.resolve():
        print(f"\n📋 Copying {input_path.name} to formtest.json...")
        shutil.copy(input_path, formtest_path)
        print("✅ Copy complete")

    # Build command to run pipeline
    cmd_parts = ["venv/bin/python3", "run_pipeline.py"]

    if args.send_webhooks:
        cmd_parts.append("--send-webhooks")

    if args.webhook_config != ".env":
        cmd_parts.extend(["--webhook-config", args.webhook_config])

    print(f"\n🚀 Running pipeline: {' '.join(cmd_parts)}\n")

    # Import and run the pipeline
    try:
        # Add the current directory to path so we can import run_pipeline
        sys.path.insert(0, str(Path(__file__).parent))

        # Import the main function from run_pipeline
        from run_pipeline import main as run_pipeline_main

        # Temporarily modify sys.argv to pass arguments to run_pipeline
        original_argv = sys.argv
        sys.argv = cmd_parts

        try:
            result = run_pipeline_main()
        finally:
            sys.argv = original_argv

        if result == 0:
            print("\n✅ VALIDATION COMPLETE - Check output_phase*.json files")
            print("\nNext steps:")
            print("  1. Review output_phase1_*.json to verify discovery extraction")
            print("  2. Review output_phase3_*.json to verify flag generation")
            print("  3. Review output_phase4_*.json to verify profile filtering")
            print("  4. Review output_phase5_*.json to verify set splitting")
            print("\nRefer to MANUAL_VALIDATION_PLAN.md for detailed validation steps.")
        else:
            print("\n❌ VALIDATION FAILED - Check errors above")

        return result

    except Exception as e:
        print(f"\n❌ Error running pipeline: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
