#!/usr/bin/env python3
"""
Count actual interrogatories related to fire hazard in the generated document.
"""
import re
from docx import Document

def find_fire_hazard_interrogatories(docx_path: str):
    """Find all fire hazard related interrogatories."""
    doc = Document(docx_path)

    all_text = '\n'.join([p.text for p in doc.paragraphs])

    # Find all REQUEST FOR ADMISSION NO. patterns with their text
    pattern = r'REQUEST FOR ADMISSION NO\.\s+(\d+)\s+(.*?)(?=REQUEST FOR ADMISSION NO\.|$)'
    matches = re.findall(pattern, all_text, re.DOTALL | re.IGNORECASE)

    fire_related = []
    fire_keywords = [
        'fire', 'smoke alarm', 'fire extinguisher',
        'non-compliant electric', 'non gfi', 'electrical outlet',
        'fire hazard', 'fire department'
    ]

    for num, text in matches:
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in fire_keywords):
            # Get first 150 chars of the text
            preview = text.strip()[:150].replace('\n', ' ')
            fire_related.append((int(num), preview))

    print(f"Found {len(fire_related)} fire/safety related interrogatories:\n")
    for num, preview in fire_related:
        print(f"  {num}: {preview}...")

    # Check which flags are present in Set 1
    print("\n" + "="*70)
    print("Flags that should trigger fire hazard interrogatories in Set 1:")
    print("  - HasFireHazard (aggregate)")
    print("  - HasSmokeAlarms")
    print("  - HasFireExtinguisher")
    print("  - HasNonCompliantElectricity")
    print("  - HasNonGfiElectricalOutlets")
    print("  - (HasCarbonmonoxideDetectors - not in this case)")
    print("="*70)

if __name__ == "__main__":
    docx_path = "webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS/Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx.docx"
    find_fire_hazard_interrogatories(docx_path)
