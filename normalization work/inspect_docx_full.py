#!/usr/bin/env python3
"""
Extract all text to find interrogatory numbering.
"""
import sys
import re
from docx import Document

def find_interrogatory_numbers(docx_path: str) -> None:
    """Find all interrogatory numbers in the document."""
    doc = Document(docx_path)

    # Look for patterns like "REQUEST NO. 1:", "INTERROGATORY NO. 1:", etc.
    patterns = [
        r'REQUEST\s+NO\.\s+(\d+)',
        r'INTERROGATORY\s+NO\.\s+(\d+)',
        r'ADMISSION\s+NO\.\s+(\d+)',
        r'SPECIAL\s+INTERROGATORY\s+NO\.\s+(\d+)',
        r'FORM\s+INTERROGATORY\s+NO\.\s+(\d+)',
    ]

    found_numbers = []

    for para in doc.paragraphs:
        text = para.text
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                found_numbers.append(int(match))

    if found_numbers:
        found_numbers.sort()
        print(f"Found {len(found_numbers)} interrogatories/requests")
        print(f"First: {found_numbers[0]}")
        print(f"Last: {found_numbers[-1]}")
        print(f"All numbers: {found_numbers[:20]}{'...' if len(found_numbers) > 20 else ''}")
    else:
        print("No interrogatory numbers found")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_docx_full.py <path_to_docx>")
        sys.exit(1)

    docx_path = sys.argv[1]
    print(f"=== Analyzing {docx_path} ===\n")
    find_interrogatory_numbers(docx_path)
