"""Tests for module-level compute_output_directory extraction."""

from pathlib import Path

from src.phase5.webhook_sender import compute_output_directory


class TestComputeOutputDirectory:
    def test_builds_nested_leaf_path(self):
        dataset = {
            "case_metadata": {"property_address": "5807 Laurel Canyon Blvd #4"},
            "metadata": {"head_of_household": "Victoriya Balasanova"},
            "doc_type": "SROGs",
        }
        set_data = {"HeadOfHousehold": "Victoriya Balasanova"}
        result = compute_output_directory(Path("webhook_documents"), dataset, set_data)
        # strip_unit removes " #4"; document_type_folder maps "SROGs" -> "SROGs"
        assert result == Path(
            "webhook_documents/5807 Laurel Canyon Blvd/Victoriya Balasanova/Discovery Propounded/SROGs"
        )

    def test_no_dataset_returns_base(self):
        assert compute_output_directory(Path("webhook_documents"), None, {}) == Path("webhook_documents")
