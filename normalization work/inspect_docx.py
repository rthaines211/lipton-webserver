#!/usr/bin/env python3
"""
Quick script to extract text from .docx files to diagnose set counting issues.
"""
import sys
from docx import Document

def extract_first_page_text(docx_path: str, lines: int = 30) -> str:
    """Extract first N lines of text from a .docx file."""
    try:
        doc = Document(docx_path)
        text_lines = []

        for para in doc.paragraphs[:lines]:
            if para.text.strip():
                text_lines.append(para.text.strip())

        return '\n'.join(text_lines)
    except Exception as e:
        return f"Error reading {docx_path}: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_docx.py <path_to_docx>")
        sys.exit(1)

    docx_path = sys.argv[1]
    print(f"=== First 30 lines of {docx_path} ===\n")
    print(extract_first_page_text(docx_path))
