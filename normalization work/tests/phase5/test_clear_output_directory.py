"""Tests for clear_output_directory — the regeneration 'replace' primitive."""

from pathlib import Path

import pytest

from src.phase5.webhook_sender import clear_output_directory


class TestClearOutputDirectory:
    def test_removes_all_files_including_non_docx(self, tmp_path):
        base = tmp_path / "webhook_documents"
        leaf = base / "addr" / "hoh" / "Discovery Propounded" / "SROGS"
        leaf.mkdir(parents=True)
        (leaf / "Set 4 of 4.docx").write_bytes(b"old")
        (leaf / "leftover.pdf").write_bytes(b"old")           # non-docx orphan
        (leaf / "Set 4 of 4.docx_6.docx").write_bytes(b"mangled")

        deleted = clear_output_directory(leaf, base)

        assert deleted == 3
        assert list(leaf.iterdir()) == []

    def test_missing_dir_is_noop(self, tmp_path):
        base = tmp_path / "webhook_documents"
        leaf = base / "does" / "not" / "exist"
        assert clear_output_directory(leaf, base) == 0

    def test_refuses_to_clear_outside_base(self, tmp_path):
        base = tmp_path / "webhook_documents"
        base.mkdir()
        outside = tmp_path / "elsewhere"
        outside.mkdir()
        (outside / "important.docx").write_bytes(b"keep")

        deleted = clear_output_directory(outside, base)

        assert deleted == 0                                    # guard tripped
        assert (outside / "important.docx").exists()           # nothing deleted

    def test_does_not_recurse(self, tmp_path):
        base = tmp_path / "webhook_documents"
        leaf = base / "addr" / "hoh" / "Discovery Propounded" / "SROGS"
        sub = leaf / "sub"
        sub.mkdir(parents=True)
        (leaf / "top.docx").write_bytes(b"x")
        (sub / "nested.docx").write_bytes(b"keep")

        deleted = clear_output_directory(leaf, base)

        assert deleted == 1
        assert (sub / "nested.docx").exists()                  # subdir untouched
