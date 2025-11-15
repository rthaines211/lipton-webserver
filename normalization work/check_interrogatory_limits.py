#!/usr/bin/env python3
"""
Diagnostic script to check interrogatory limits in Phase 5 output or webhook payloads.

Usage:
    python3 check_interrogatory_limits.py <json_file>
    python3 check_interrogatory_limits.py  # Uses latest output_phase5_*.json
"""

import json
import sys
import glob
from pathlib import Path

def check_limits(data, max_limit=120, source="Unknown"):
    """Check all sets for interrogatory limit violations."""

    print('=' * 80)
    print(f'INTERROGATORY LIMIT CHECK: {source}')
    print(f'Maximum allowed per set: {max_limit}')
    print('=' * 80)

    violations = []
    all_sets = []

    # Handle different data structures
    datasets = data.get('datasets', [])
    if not datasets and 'sets' in data:
        # Single dataset structure
        datasets = [data]

    for i, dataset in enumerate(datasets, 1):
        doc_type = dataset.get('doc_type', 'Unknown')
        dataset_id = dataset.get('dataset_id', 'unknown')
        plaintiff = dataset.get('plaintiff', {})
        defendant = dataset.get('defendant', {})

        plaintiff_name = plaintiff.get('full_name', 'Unknown') if isinstance(plaintiff, dict) else str(plaintiff)
        defendant_name = defendant.get('full_name', 'Unknown') if isinstance(defendant, dict) else str(defendant)

        sets = dataset.get('sets', [])

        for set_data in sets:
            count = set_data.get('InterrogatoryCount', 0)
            set_num = set_data.get('SetNumber', '?')

            all_sets.append({
                'dataset': i,
                'doc_type': doc_type,
                'plaintiff': plaintiff_name,
                'defendant': defendant_name,
                'set_num': set_num,
                'count': count
            })

            if count > max_limit:
                violations.append({
                    'dataset': i,
                    'doc_type': doc_type,
                    'plaintiff': plaintiff_name,
                    'defendant': defendant_name,
                    'set_num': set_num,
                    'count': count,
                    'excess': count - max_limit,
                    'flags': [k for k, v in set_data.items()
                             if k not in ['SetNumber', 'SetNoWrite', 'SetLabel', 'SetStart',
                                         'SetEnd', 'InterrogatoryStart', 'InterrogatoryCount',
                                         'HeadOfHousehold', 'TargetDefendant', 'Template',
                                         'OutputName', 'Case', 'AllPlaintiffsUpperWithTypes',
                                         'AllDefendantsUpperWithTypes', 'Plaintiffs']
                             and v is True]
                })

    # Report results
    if violations:
        print(f'\n❌ FOUND {len(violations)} VIOLATION(S)!\n')

        for v in violations:
            print(f'Dataset {v["dataset"]}: {v["plaintiff"]} vs {v["defendant"]}')
            print(f'  Doc Type: {v["doc_type"]}')
            print(f'  Set {v["set_num"]}: {v["count"]} interrogatories')
            print(f'  EXCEEDS LIMIT BY: {v["excess"]} interrogatories')
            print(f'  Flags in this set: {len(v["flags"])}')

            if len(v["flags"]) <= 20:
                print(f'  All flags: {", ".join(v["flags"])}')
            else:
                print(f'  First 20 flags: {", ".join(v["flags"][:20])}...')
            print()
    else:
        print(f'\n✅ ALL {len(all_sets)} SETS ARE WITHIN {max_limit} INTERROGATORY LIMIT!\n')

    # Statistics
    if all_sets:
        max_count = max(s['count'] for s in all_sets)
        avg_count = sum(s['count'] for s in all_sets) / len(all_sets)

        max_set = next(s for s in all_sets if s['count'] == max_count)

        print('📊 STATISTICS:')
        print(f'  Total sets checked: {len(all_sets)}')
        print(f'  Maximum count found: {max_count} interrogatories')
        print(f'  Average count: {avg_count:.1f} interrogatories')
        print(f'  Largest set: {max_set["plaintiff"]} vs {max_set["defendant"]}')
        print(f'               {max_set["doc_type"]} Set {max_set["set_num"]}')

        # Show top 5 largest sets
        top_sets = sorted(all_sets, key=lambda s: s['count'], reverse=True)[:5]
        print(f'\n  Top 5 largest sets:')
        for rank, s in enumerate(top_sets, 1):
            status = '❌' if s['count'] > max_limit else '✅'
            print(f'    {rank}. {s["count"]} interrogatories {status} - {s["doc_type"]} Set {s["set_num"]} '
                  f'({s["plaintiff"]} vs {s["defendant"]})')

    print('\n' + '=' * 80)

    return len(violations) == 0


def main():
    if len(sys.argv) > 1:
        # Use specified file
        file_path = sys.argv[1]
    else:
        # Find latest output_phase5_*.json
        phase5_files = sorted(glob.glob('output_phase5_*.json'), reverse=True)
        if not phase5_files:
            print('❌ No output_phase5_*.json files found!')
            print('Usage: python3 check_interrogatory_limits.py <json_file>')
            sys.exit(1)
        file_path = phase5_files[0]

    if not Path(file_path).exists():
        print(f'❌ File not found: {file_path}')
        sys.exit(1)

    print(f'\n📂 Loading: {file_path}\n')

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f'❌ Invalid JSON: {e}')
        sys.exit(1)

    is_valid = check_limits(data, max_limit=120, source=file_path)

    sys.exit(0 if is_valid else 1)


if __name__ == '__main__':
    main()
