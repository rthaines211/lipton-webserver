from src.phase1.normalizer import normalize_form_data


def test_case_fields_flow_through_normalization():
    raw = {
        "Case number": "BC999",
        "Filing date": "2026-03-04",
        "Filing county": "Los Angeles",
        "Full_Address": {
            "StreetAddress": "1 Main St",
            "City": "LA",
            "State": "CA",
            "PostalCode": "90001",
        },
        "PlaintiffDetails": [
            {
                "Id": "p1",
                "ItemNumber": 1,
                "PlaintiffItemNumberName": {
                    "First": "Clark",
                    "Last": "Kent",
                    "FirstAndLast": "Clark Kent",
                },
            },
            {
                "Id": "p2",
                "ItemNumber": 2,
                "PlaintiffItemNumberName": {
                    "First": "Lois",
                    "Last": "Lane",
                    "FirstAndLast": "Lois Lane",
                },
            },
        ],
        # DefendantDetails2 uses DefendantItemNumberName (not DefendantName)
        "DefendantDetails2": [
            {
                "Id": "d1",
                "ItemNumber": 1,
                "DefendantItemNumberName": {
                    "First": "Tony",
                    "Last": "Stark",
                    "FirstAndLast": "Tony Stark",
                },
            }
        ],
        "Form": {"Id": "test-1"},
    }
    normalized = normalize_form_data(raw)
    assert normalized["case_info"]["case_number"] == "BC999"
    assert normalized["case_info"]["filing_date"] == "2026-03-04"
    # case_context is nested under case_info
    ctx = normalized["case_info"]["case_context"]
    assert ctx["case_number"] == "BC999"
    assert ctx["filing_date"] == "March 4, 2026"
    assert ctx["plaintiff_label"] == "Plaintiffs"   # 2 plaintiffs
    assert ctx["defendant_label"] == "Defendant"    # 1 defendant
