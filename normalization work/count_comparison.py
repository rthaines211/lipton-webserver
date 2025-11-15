#!/usr/bin/env python3
"""
Compare expected vs actual interrogatory counts by analyzing both
the Python profile counts and the actual document output.
"""
import json
from pathlib import Path
from src.phase4.profiles.admissions_complete import AdmissionsProfile

def calculate_expected_for_flags(flags: list) -> int:
    """Calculate expected interrogatory count based on profile."""
    profile = AdmissionsProfile()
    counts = profile.interrogatory_counts

    total = 0
    for flag in flags:
        count = counts.get(flag, 0)
        total += count

    return total

def analyze_set(payload_path: str, actual_count: int):
    """Analyze a single set."""
    with open(payload_path, 'r') as f:
        payload = json.load(f)

    data = payload.get('data', {})

    # Get metadata
    set_number = data.get('SetNumber', 'N/A')
    expected_count = data.get('InterrogatoryCount', 'N/A')

    # Get all TRUE flags (excluding metadata)
    metadata_fields = {
        'SetNumber', 'SetNoWrite', 'SetLabel', 'SetStart', 'SetEnd',
        'InterrogatoryStart', 'InterrogatoryCount', 'HeadOfHousehold',
        'TargetDefendant', 'Template', 'OutputName', 'Case',
        'AllPlaintiffsUpperWithTypes', 'AllDefendantsUpperWithTypes', 'Plaintiffs'
    }

    true_flags = [k for k, v in data.items()
                  if k not in metadata_fields and v is True]

    # Calculate what the template SHOULD generate based on the flags
    template_expected = calculate_expected_for_flags(true_flags)

    print(f"\n{'='*70}")
    print(f"SET {set_number}")
    print(f"{'='*70}")
    print(f"Python says this set should have:    {expected_count} interrogatories")
    print(f"Flags in payload imply:               {template_expected} interrogatories")
    print(f"Document actually generated:          {actual_count} interrogatories")
    print(f"")
    print(f"Discrepancy (Python vs Template):     {template_expected - expected_count:+d}")
    print(f"Discrepancy (Template vs Actual):     {actual_count - template_expected:+d}")
    print(f"Discrepancy (Python vs Actual):       {actual_count - expected_count:+d}")

if __name__ == "__main__":
    base_path = Path("webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS")

    sets = [
        ("Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx_payload.json", 126),
        ("Clark Kent vs Tony Stark - Discovery Request for Admissions Set 2 of 3.docx_payload.json", 173),
        ("Clark Kent vs Tony Stark - Discovery Request for Admissions Set 3 of 3.docx_payload.json", 63),
    ]

    print("\n" + "="*70)
    print("INTERROGATORY COUNT ANALYSIS")
    print("="*70)

    for payload_file, actual_count in sets:
        analyze_set(base_path / payload_file, actual_count)

    print("\n" + "="*70)
    print("CONCLUSION:")
    print("="*70)
    print("The template is generating MORE interrogatories than the flags imply.")
    print("This means the template has hardcoded interrogatories that are being")
    print("rendered regardless of the flag values or counts.")
    print("="*70 + "\n")
