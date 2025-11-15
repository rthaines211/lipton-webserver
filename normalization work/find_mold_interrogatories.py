#!/usr/bin/env python3
"""
Find all interrogatories related to "Mold" in Set 1 to understand
how the template is generating more interrogatories than expected.
"""
import re
from docx import Document

def find_mold_interrogatories(docx_path: str):
    """Find all mold-related interrogatories."""
    doc = Document(docx_path)

    # Combine all paragraphs into text
    full_text = '\n'.join([p.text for p in doc.paragraphs])

    # Find all REQUEST NO. patterns
    pattern = r'REQUEST\s+NO\.\s+(\d+):\s*([^\n]+(?:\n(?!REQUEST\s+NO\.)[^\n]+)*)'
    matches = re.findall(pattern, full_text, re.IGNORECASE)

    mold_interrogatories = []
    for num, text in matches:
        # Check if this interrogatory mentions mold
        if 'mold' in text.lower():
            mold_interrogatories.append((int(num), text[:100]))  # First 100 chars

    print(f"Found {len(mold_interrogatories)} mold-related interrogatories:")
    for num, text in mold_interrogatories[:10]:  # Show first 10
        print(f"  {num}: {text.strip()}...")

    print(f"\nProfile says 'HasMold' should generate: 6 interrogatories")
    print(f"Document actually has: {len(mold_interrogatories)} mold interrogatories")

if __name__ == "__main__":
    import sys
    docx_path = "webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS/Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx.docx"
    find_mold_interrogatories(docx_path)
