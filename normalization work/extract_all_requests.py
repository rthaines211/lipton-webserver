#!/usr/bin/env python3
"""
Extract all REQUEST lines from the document to understand the pattern.
"""
from docx import Document
import re

def extract_requests(docx_path: str):
    """Extract all request lines."""
    doc = Document(docx_path)

    requests = []
    for para in doc.paragraphs:
        text = para.text.strip()
        # Look for lines that start with a number followed by a period
        if re.match(r'^\d+\.', text):
            requests.append(text[:150])  # First 150 chars

    print(f"Found {len(requests)} numbered items")
    print("\nFirst 20 requests:")
    for i, req in enumerate(requests[:20], 1):
        print(f"{i}. {req}")

    print("\n\nLast 10 requests:")
    for req in requests[-10:]:
        print(f"  {req}")

if __name__ == "__main__":
    docx_path = "webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS/Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx.docx"
    extract_requests(docx_path)
