"""Regeneration replaces prior output; clear happens once per dir, not per set."""

from pathlib import Path

from src.phase5 import webhook_sender
from src.phase5.webhook_sender import compute_output_directory, clear_output_directory


def test_clear_once_per_dir_removes_stale_and_preserves_same_run(tmp_path):
    base = tmp_path / "webhook_documents"
    dataset = {
        "case_metadata": {"property_address": "5807 Laurel Canyon Blvd"},
        "metadata": {"head_of_household": "Balasanova"},
        "doc_type": "SROGs",
        "sets": [{"OutputName": "Set 1 of 2"}, {"OutputName": "Set 2 of 2"}],
    }
    set0, set1 = dataset["sets"]
    leaf = compute_output_directory(base, dataset, set0)
    leaf.mkdir(parents=True)
    (leaf / "Set 1 of 2.docx").write_bytes(b"STALE")          # prior run's file

    # Simulate the orchestrator's clear-once bookkeeping:
    cleared = set()
    def clear_for(set_data):
        d = compute_output_directory(base, dataset, set_data)
        if d not in cleared:
            clear_output_directory(d, base)
            cleared.add(d)
        # then the run writes its fresh file
        (d / f"{set_data['OutputName']}.docx").write_bytes(b"FRESH")

    clear_for(set0)   # clears dir (removes STALE), writes fresh Set 1
    clear_for(set1)   # dir already cleared -> must NOT remove Set 1, writes Set 2

    names = sorted(p.name for p in leaf.iterdir())
    assert names == ["Set 1 of 2.docx", "Set 2 of 2.docx"]     # both present
    assert (leaf / "Set 1 of 2.docx").read_bytes() == b"FRESH"  # replaced, not _N
