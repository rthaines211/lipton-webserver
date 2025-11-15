#!/usr/bin/env python3
"""
Master Profile Summary Viewer

Displays a human-readable summary of the Phase 4.5 master profile files.

Usage:
    cd "normalization work"
    venv/bin/python3 view_master_summary.py
    venv/bin/python3 view_master_summary.py master_srogs_20251110_141253.json
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any


def format_summary(profile_data: Dict[str, Any]) -> str:
    """Format a profile data summary as human-readable text."""
    lines = []

    doc_type = profile_data.get('doc_type', 'Unknown')
    summary = profile_data.get('summary', {})

    lines.append(f"\n{'=' * 70}")
    lines.append(f"  {doc_type} MASTER PROFILE SUMMARY")
    lines.append(f"{'=' * 70}\n")

    # Summary Statistics
    lines.append("📊 Summary Statistics")
    lines.append(f"   Total Datasets: {summary.get('total_datasets', 0)}")
    lines.append(f"   Total Interrogatories: {summary.get('total_interrogatories', 0):,}")
    lines.append(f"   Average per Dataset: {summary.get('average_interrogatories_per_dataset', 0):.1f}")
    lines.append(f"   Total Unique Flags: {summary.get('total_unique_flags', 0)}")
    lines.append(f"   Flags Used by All: {summary.get('flags_used_by_all_datasets', 0)}")
    lines.append(f"   Flags Used by Some: {summary.get('flags_used_by_some_datasets', 0)}")

    # Plaintiff-Defendant Pairs
    pairs = summary.get('plaintiff_defendant_pairs', [])
    lines.append(f"\n👥 Plaintiff-Defendant Pairs ({len(pairs)})")
    for i, pair in enumerate(pairs, 1):
        lines.append(f"   {i}. {pair}")

    # Per-Dataset Breakdown
    datasets = profile_data.get('datasets', [])
    lines.append(f"\n📋 Per-Dataset Breakdown")
    for dataset in datasets:
        pair_name = dataset.get('pair_name', 'Unknown')
        interrogatory_count = dataset.get('interrogatory_count', 0)
        flag_count = dataset.get('flag_count', 0)
        lines.append(f"   • {pair_name}")
        lines.append(f"     - Interrogatories: {interrogatory_count:,}")
        lines.append(f"     - Flags: {flag_count}")

    # Top 20 Flags
    top_flags = profile_data.get('top_20_flags', [])
    lines.append(f"\n🏆 Top 20 Flags by Interrogatory Count")
    lines.append(f"{'#':<4} {'Flag':<50} {'Count':<10}")
    lines.append("-" * 70)
    for i, flag_data in enumerate(top_flags, 1):
        flag = flag_data.get('flag', 'Unknown')
        count = flag_data.get('count', 0)
        lines.append(f"{i:<4} {flag:<50} {count:<10}")

    # Cross-Dataset Flag Usage (if multiple datasets)
    if summary.get('total_datasets', 0) > 1:
        consolidated_flags = profile_data.get('consolidated_flags', {})

        # Flags used by all
        all_flags = [
            (flag, info)
            for flag, info in consolidated_flags.items()
            if info['datasets_present'] == summary.get('total_datasets', 0)
        ]
        lines.append(f"\n✅ Flags Used by All Datasets ({len(all_flags)})")
        for flag, info in sorted(all_flags, key=lambda x: x[1]['count'], reverse=True)[:10]:
            lines.append(f"   • {flag}: {info['count']} interrogatories")

        # Flags used by some
        some_flags = [
            (flag, info)
            for flag, info in consolidated_flags.items()
            if info['datasets_present'] < summary.get('total_datasets', 0)
        ]
        lines.append(f"\n⚠️  Flags Used by Some Datasets ({len(some_flags)})")
        for flag, info in sorted(some_flags, key=lambda x: x[1]['datasets_present'], reverse=True)[:10]:
            present = info['datasets_present']
            total = summary.get('total_datasets', 0)
            lines.append(f"   • {flag}: {present}/{total} datasets ({info['count']} interrogatories)")

    lines.append(f"\n{'=' * 70}\n")

    return '\n'.join(lines)


def find_latest_master_files() -> Dict[str, Path]:
    """Find the latest master files for each profile type."""
    master_files = {}

    cwd = Path.cwd()

    for profile_key in ['srogs', 'pods', 'admissions']:
        pattern = f"master_{profile_key}_*.json"
        files = sorted(cwd.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)

        if files:
            master_files[profile_key] = files[0]

    return master_files


def main():
    if len(sys.argv) > 1:
        # Specific file provided
        file_path = Path(sys.argv[1])

        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            return 1

        with open(file_path) as f:
            data = json.load(f)

        print(format_summary(data))

    else:
        # Find and display all latest master files
        master_files = find_latest_master_files()

        if not master_files:
            print("❌ No master files found. Run the pipeline first:")
            print("   venv/bin/python3 run_pipeline.py")
            return 1

        print(f"\n🔍 Found {len(master_files)} master file(s):\n")

        for profile_key, file_path in sorted(master_files.items()):
            print(f"📄 {file_path.name}")

        print(f"\n{'=' * 70}")
        print("  MASTER PROFILE SUMMARIES")
        print(f"{'=' * 70}")

        for profile_key, file_path in sorted(master_files.items()):
            with open(file_path) as f:
                data = json.load(f)

            print(format_summary(data))

    return 0


if __name__ == "__main__":
    sys.exit(main())
