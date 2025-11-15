#!/usr/bin/env python3
"""
Dump document text to find the interrogatory pattern.
"""
from docx import Document
import re

def dump_text(docx_path: str, start_line: int = 100, num_lines: int = 50):
    """Dump lines from document."""
    doc = Document(docx_path)

    all_paras = [p.text for p in doc.paragraphs if p.text.strip()]

    print(f"Total paragraphs: {len(all_paras)}")
    print(f"\nShowing lines {start_line}-{start_line + num_lines}:\n")
    print("="*80)

    for i, text in enumerate(all_paras[start_line:start_line + num_lines], start_line):
        # Highlight lines that look like interrogatories
        if re.search(r'\b(admit|admissions|request)\b', text.lower()):
            print(f"{i:3d} *** {text[:200]}")
        else:
            print(f"{i:3d}     {text[:200]}")

if __name__ == "__main__":
    docx_path = "webhook_documents/NEW TEST/Clark Kent/Discovery Propounded/ADMISSIONS/Clark Kent vs Tony Stark - Discovery Request for Admissions Set 1 of 3.docx.docx"
    dump_text(docx_path, start_line=50, num_lines=100)
