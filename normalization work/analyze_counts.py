#!/usr/bin/env python3
"""
Analyze the discrepancy between expected counts and actual document counts.
"""
import json
from pathlib import Path

def analyze_payload(payload_path: str):
    """Analyze a payload file to count expected interrogatories."""
    with open(payload_path, 'r') as f:
        payload = json.load(f)

    data = payload.get('data', {})

    # These are the metadata fields
    set_number = data.get('SetNumber', 'N/A')
    set_start = data.get('SetStart', 'N/A')
    set_end = data.get('SetEnd', 'N/A')
    interrogatory_count = data.get('InterrogatoryCount', 'N/A')

    # Count the TRUE flags (excluding metadata fields)
    metadata_fields = {
        'SetNumber', 'SetNoWrite', 'SetLabel', 'SetStart', 'SetEnd',
        'InterrogatoryStart', 'InterrogatoryCount', 'HeadOfHousehold',
        'TargetDefendant', 'Template', 'OutputName', 'Case',
        'AllPlaintiffsUpperWithTypes', 'AllDefendantsUpperWithTypes', 'Plaintiffs'
    }

    true_flags = {k: v for k, v in data.items()
                  if k not in metadata_fields and v is True}

    print(f"\n=== Set {set_number} Analysis ===")
    print(f"Expected Range: {set_start}-{set_end}")
    print(f"Expected Count: {interrogatory_count}")
    print(f"Number of TRUE flags: {len(true_flags)}")
    print(f"\nFLAGS in this set:")
    for flag in sorted(true_flags.keys()):
        print(f"  - {flag}")

if __name__ == "__main__":
    base_path = Path("webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS")

    payloads = [
        "Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx_payload.json",
        "Clark Kent vs Tony Stark - Discovery Request for Admissions Set 2 of 3.docx_payload.json",
        "Clark Kent vs Tony Stark - Discovery Request for Admissions Set 3 of 3.docx_payload.json",
    ]

    for payload_file in payloads:
        analyze_payload(base_path / payload_file)

    print("\n" + "="*60)
    print("KEY INSIGHT:")
    print("The Python code sends ALL flags for a set to Docmosis,")
    print("but the template generates interrogatories for EACH flag,")
    print("not respecting the InterrogatoryCount limit!")
    print("="*60)
