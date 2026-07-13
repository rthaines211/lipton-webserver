# Discovery Case Fields & Party Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Case Number and Filing Date fields plus auto-pluralized Plaintiff/Defendant labels to the discovery document pipeline (SROGs, PODs, Admissions).

**Architecture:** Thread two new case fields and two computed party labels through the existing form → Node FormTransformer → Python pipeline → Docmosis payload chain. Case fields are optional (blank when empty); labels are count-based (singular ≤1, plural ≥2). Templates (edited separately by the user) reference new merge fields.

**Tech Stack:** Node.js (form-transformer), Python 3.9 (pipeline, pytest), HTML form, Docmosis `.docx` templates.

## Global Constraints

- Case Number: optional, renders blank when empty. No "N/A" placeholder.
- Filing Date: optional, native `<input type="date">`, formatted long-form "January 15, 2026", blank when empty.
- Plaintiff/Defendant labels: "Plaintiff"/"Defendant" if ≤1 party, "Plaintiffs"/"Defendants" if ≥2.
- Backward compatible: missing fields fall back to `""` / singular via `.get()`.
- Template variable names (exact): `<<Case.CaseNumber>>`, `<<Case.FilingDate>>`, `<<PlaintiffLabel>>`, `<<DefendantLabel>>`.
- Python pipeline lives in `normalization work/`; run pytest from there.

---

### Task 1: Form HTML — add Case Number & Filing Date inputs

**Files:**
- Modify: `forms/docs/index.html` (after the `filing-county` form-group, ~line 2168)

No test (static HTML; `FormData` auto-collects named inputs — verified in `form-submission.js:293`).

- [ ] **Step 1: Add the two inputs**

After the `filing-county` `</div>` form-group (line ~2169), insert:

```html
                            <div class="form-group">
                                <label for="case-number">Case Number:</label>
                                <input type="text" id="case-number" name="case-number" placeholder="Enter case number (optional)">
                            </div>
                            <div class="form-group">
                                <label for="filing-date">Date Complaint Filed:</label>
                                <input type="date" id="filing-date" name="filing-date">
                            </div>
```

Note: no `required` attribute on either (both optional).

- [ ] **Step 2: Commit**

```bash
git add forms/docs/index.html
git commit -m "feat(docs-form): add optional Case Number and Filing Date fields"
```

---

### Task 2: FormTransformer — map new fields (Node)

**Files:**
- Modify: `services/form-transformer.js` (transformFormData ~line 143, revertToOriginalFormat keyMappings ~line 601)
- Test: `tests/services/form-transformer.test.js` (create if absent; else append)

**Interfaces:**
- Produces: transformed JSON with `CaseNumber` / `FilingDate` keys, reverted to `"Case number"` / `"Filing date"` human-readable keys that the Python parser reads.

- [ ] **Step 1: Write failing test**

Append to `tests/services/form-transformer.test.js` (create with this header if new):

```javascript
const { transformFormData, revertToOriginalFormat } = require('../../services/form-transformer');

describe('form-transformer case number & filing date', () => {
  test('transformFormData maps case-number and filing-date', () => {
    const out = transformFormData({ 'case-number': 'BC123456', 'filing-date': '2026-01-15' });
    expect(out.CaseNumber).toBe('BC123456');
    expect(out.FilingDate).toBe('2026-01-15');
  });

  test('transformFormData defaults missing case fields to null', () => {
    const out = transformFormData({});
    expect(out.CaseNumber).toBeNull();
    expect(out.FilingDate).toBeNull();
  });

  test('revertToOriginalFormat maps CaseNumber/FilingDate to human-readable keys', () => {
    const out = revertToOriginalFormat({ CaseNumber: 'BC123456', FilingDate: '2026-01-15' });
    expect(out['Case number']).toBe('BC123456');
    expect(out['Filing date']).toBe('2026-01-15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/services/form-transformer.test.js -t "case number" -v`
Expected: FAIL (`CaseNumber` is undefined).

- [ ] **Step 3: Add to transformFormData**

In `services/form-transformer.js`, in the returned object (after the `FilingCounty:` line ~143), add:

```javascript
        CaseNumber: rawData['Case number'] || rawData['case-number'] || null,
        FilingDate: rawData['Filing date'] || rawData['filing-date'] || null,
```

- [ ] **Step 4: Add to revertToOriginalFormat keyMappings**

In the `keyMappings` object (after `'FilingCounty': 'Filing county',` ~line 601), add:

```javascript
        'CaseNumber': 'Case number',
        'FilingDate': 'Filing date',
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx jest tests/services/form-transformer.test.js -t "case number" -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add services/form-transformer.js tests/services/form-transformer.test.js
git commit -m "feat(form-transformer): map case-number and filing-date fields"
```

---

### Task 3: Python — filing date formatter

**Files:**
- Modify: `normalization work/src/phase1/normalizer.py` (add module-level helper near top, after imports)
- Test: `normalization work/tests/phase1/test_normalizer.py` (append; create if absent)

**Interfaces:**
- Produces: `format_filing_date(iso_str: str) -> str` — `"2026-01-15"` → `"January 15, 2026"`; `""`/`None`/malformed → `""`.

- [ ] **Step 1: Write failing test**

Append to `normalization work/tests/phase1/test_normalizer.py`:

```python
from src.phase1.normalizer import format_filing_date

def test_format_filing_date_valid():
    assert format_filing_date("2026-01-15") == "January 15, 2026"

def test_format_filing_date_empty():
    assert format_filing_date("") == ""
    assert format_filing_date(None) == ""

def test_format_filing_date_malformed():
    assert format_filing_date("not-a-date") == ""
    assert format_filing_date("2026/01/15") == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `normalization work/`): `python -m pytest tests/phase1/test_normalizer.py -k format_filing_date -v`
Expected: FAIL (ImportError / not defined).

- [ ] **Step 3: Implement the helper**

In `normalization work/src/phase1/normalizer.py`, add after the imports block (top of file):

```python
from datetime import datetime


def format_filing_date(iso_str: str) -> str:
    """Format an ISO date (YYYY-MM-DD) as long form 'January 15, 2026'.

    Returns '' for empty, None, or malformed input (never raises).
    """
    if not iso_str:
        return ""
    try:
        dt = datetime.strptime(iso_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return ""
    # %-d is not portable (fails on Windows); strip leading zero manually.
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"
```

- [ ] **Step 4: Run test to verify pass**

Run: `python -m pytest tests/phase1/test_normalizer.py -k format_filing_date -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "normalization work/src/phase1/normalizer.py" "normalization work/tests/phase1/test_normalizer.py"
git commit -m "feat(pipeline): add format_filing_date helper"
```

---

### Task 4: Python — parse case number & filing date

**Files:**
- Modify: `normalization work/src/phase1/input_parser.py` (case_info return dict, ~lines 85-95)
- Test: `normalization work/tests/phase1/test_input_parser.py` (append; create if absent)

**Interfaces:**
- Consumes: raw form JSON with keys `"Case number"`/`"CaseNumber"`, `"Filing date"`/`"FilingDate"`.
- Produces: `case_info` dict gains `case_number` and `filing_date` (raw ISO string) keys.

- [ ] **Step 1: Write failing test**

Append to `normalization work/tests/phase1/test_input_parser.py`:

```python
from src.phase1.input_parser import extract_case_info

def test_extract_case_info_reads_case_number_and_filing_date():
    info = extract_case_info({"Case number": "BC123456", "Filing date": "2026-01-15"})
    assert info["case_number"] == "BC123456"
    assert info["filing_date"] == "2026-01-15"

def test_extract_case_info_defaults_case_fields_empty():
    info = extract_case_info({})
    assert info["case_number"] == ""
    assert info["filing_date"] == ""
```

Note: confirm the parser function name is `extract_case_info` (imported in `normalizer.py:11`). If the callable differs, match the import.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/phase1/test_input_parser.py -k "case_number or case_fields" -v`
Expected: FAIL (KeyError `case_number`).

- [ ] **Step 3: Read the raw keys**

In `normalization work/src/phase1/input_parser.py`, before the `return` (~line 85), add:

```python
    case_number = (
        json_data.get("Case number")
        or json_data.get("CaseNumber")
        or ""
    )

    filing_date = (
        json_data.get("Filing date")
        or json_data.get("FilingDate")
        or ""
    )
```

- [ ] **Step 4: Add to the return dict**

In the returned dict (after `"filing_county": filing_county,`), add:

```python
        "case_number": case_number,
        "filing_date": filing_date,
```

- [ ] **Step 5: Run test to verify pass**

Run: `python -m pytest tests/phase1/test_input_parser.py -k "case_number or case_fields" -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add "normalization work/src/phase1/input_parser.py" "normalization work/tests/phase1/test_input_parser.py"
git commit -m "feat(pipeline): parse case number and filing date from form data"
```

---

### Task 5: Python — case context labels & fields

**Files:**
- Modify: `normalization work/src/phase1/normalizer.py` (`_build_case_context` return dict, ~lines 128-152)
- Test: `normalization work/tests/phase1/test_normalizer.py` (append)

**Interfaces:**
- Consumes: `format_filing_date` (Task 3); `case_info` with `case_number`/`filing_date` (Task 4); `plaintiffs`/`defendants` lists (already args).
- Produces: `case_context` dict gains `plaintiff_label`, `defendant_label`, `case_number`, `filing_date` (formatted).

- [ ] **Step 1: Write failing test**

Append to `normalization work/tests/phase1/test_normalizer.py`:

```python
from src.phase1.normalizer import _build_case_context

def test_case_context_singular_labels_one_party():
    ctx = _build_case_context(
        {"case_number": "BC1", "filing_date": "2026-01-15"},
        [{"full_name": "Clark Kent"}],
        [{"full_name": "Tony Stark"}],
    )
    assert ctx["plaintiff_label"] == "Plaintiff"
    assert ctx["defendant_label"] == "Defendant"
    assert ctx["case_number"] == "BC1"
    assert ctx["filing_date"] == "January 15, 2026"

def test_case_context_plural_labels_multiple_parties():
    ctx = _build_case_context(
        {},
        [{"full_name": "A"}, {"full_name": "B"}],
        [{"full_name": "C"}, {"full_name": "D"}],
    )
    assert ctx["plaintiff_label"] == "Plaintiffs"
    assert ctx["defendant_label"] == "Defendants"
    assert ctx["case_number"] == ""
    assert ctx["filing_date"] == ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/phase1/test_normalizer.py -k case_context -v`
Expected: FAIL (KeyError `plaintiff_label`).

- [ ] **Step 3: Add keys to the return dict**

In `_build_case_context`, in the returned dict (after `'filing_county': case_info.get('filing_county', '')`), add:

```python
        'plaintiff_label': 'Plaintiff' if len(plaintiffs) <= 1 else 'Plaintiffs',
        'defendant_label': 'Defendant' if len(defendants) <= 1 else 'Defendants',
        'case_number': case_info.get('case_number', ''),
        'filing_date': format_filing_date(case_info.get('filing_date', '')),
```

- [ ] **Step 4: Run test to verify pass**

Run: `python -m pytest tests/phase1/test_normalizer.py -k case_context -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "normalization work/src/phase1/normalizer.py" "normalization work/tests/phase1/test_normalizer.py"
git commit -m "feat(pipeline): add party labels and case fields to case context"
```

---

### Task 6: Python — surface fields in SetSplitter payload

**Files:**
- Modify: `normalization work/src/phase5/set_splitter.py` (enriched-set build, `Case` dict ~lines 316-319; top-level ~lines 322-324)
- Test: `normalization work/tests/phase5/test_set_splitter.py` (append; create if absent)

**Interfaces:**
- Consumes: `case_context` with `case_number`, `filing_date`, `plaintiff_label`, `defendant_label` (Task 5).
- Produces: enriched set with `Case.CaseNumber`, `Case.FilingDate`, top-level `PlaintiffLabel`, `DefendantLabel`.

- [ ] **Step 1: Write failing test**

Append to `normalization work/tests/phase5/test_set_splitter.py`. This asserts the enriched-set structure; build a minimal `profiled_dataset` matching what `_build_enriched_sets` consumes (see `set_splitter.py:277-289`):

```python
from src.phase5.set_splitter import SetSplitter

def _minimal_profiled_dataset():
    return {
        'case_context': {
            'filing_county': 'Los Angeles',
            'all_plaintiffs_upper_with_types': 'CLARK KENT, AN INDIVIDUAL',
            'all_defendants_upper_with_types': 'TONY STARK, MANAGER',
            'plaintiffs_array': [],
            'case_number': 'BC123456',
            'filing_date': 'January 15, 2026',
            'plaintiff_label': 'Plaintiffs',
            'defendant_label': 'Defendant',
        },
        'plaintiff': {'full_name': 'Clark Kent'},
        'defendant': {'full_name': 'Tony Stark'},
        'case_metadata': {},
        'template': 'SROGsMaster.docx',
        'filename_suffix': '',
        'interrogatory_counts': {'SROGsGeneral': 5},
        'flags': {'SROGsGeneral': True},
    }

def test_enriched_set_carries_case_fields_and_labels():
    splitter = SetSplitter(max_interrogatories_per_set=35)
    result = splitter.split_into_sets(_minimal_profiled_dataset())
    first = result['sets'][0]
    assert first['Case']['CaseNumber'] == 'BC123456'
    assert first['Case']['FilingDate'] == 'January 15, 2026'
    assert first['PlaintiffLabel'] == 'Plaintiffs'
    assert first['DefendantLabel'] == 'Defendant'
```

Confirmed against source: `SetSplitter.split_into_sets(profiled_dataset)` returns a dict
whose enriched sets are under `result['sets']` (built by internal `_enrich_sets`, which
constructs `enriched_set` at `set_splitter.py:291`). The `Case` dict and top-level fields
are added there in Steps 3-4.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/phase5/test_set_splitter.py -k case_fields_and_labels -v`
Expected: FAIL (KeyError `CaseNumber`).

- [ ] **Step 3: Add to the Case dict**

In `set_splitter.py`, in the enriched-set `Case` dict (currently `FilingCounty` + `FullAddress`, ~line 316-319), add:

```python
                    'CaseNumber': case_context.get('case_number', ''),
                    'FilingDate': case_context.get('filing_date', ''),
```

- [ ] **Step 4: Add top-level labels**

In the same enriched-set dict, after `'AllDefendantsUpperWithTypes': ...` (~line 323), add:

```python
                'PlaintiffLabel': case_context.get('plaintiff_label', 'Plaintiff'),
                'DefendantLabel': case_context.get('defendant_label', 'Defendant'),
```

- [ ] **Step 5: Run test to verify pass**

Run: `python -m pytest tests/phase5/test_set_splitter.py -k case_fields_and_labels -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "normalization work/src/phase5/set_splitter.py" "normalization work/tests/phase5/test_set_splitter.py"
git commit -m "feat(pipeline): surface case fields and party labels in webhook payload"
```

---

### Task 7: End-to-end pipeline check

**Files:**
- Test: `normalization work/tests/test_case_fields_e2e.py` (create)

**Interfaces:**
- Consumes: `normalize_form_data` (`src/phase1/normalizer.py`) — the public entry point.

- [ ] **Step 1: Write the test**

Create `normalization work/tests/test_case_fields_e2e.py`. Run a realistic form JSON through `normalize_form_data` and assert `case_info` + `case_context` carry the new values. Use an existing sample from `tests/` fixtures as the base if available; otherwise minimal:

```python
from src.phase1.normalizer import normalize_form_data

def test_case_fields_flow_through_normalization():
    raw = {
        "Case number": "BC999",
        "Filing date": "2026-03-04",
        "Filing county": "Los Angeles",
        "Full_Address": {"StreetAddress": "1 Main St", "City": "LA", "State": "CA", "PostalCode": "90001"},
        "PlaintiffDetails": [
            {"PlaintiffItemNumberName": {"First": "Clark", "Last": "Kent", "FirstAndLast": "Clark Kent"}},
            {"PlaintiffItemNumberName": {"First": "Lois", "Last": "Lane", "FirstAndLast": "Lois Lane"}},
        ],
        "DefendantDetails2": [{"DefendantName": {"FirstAndLast": "Tony Stark"}}],
        "Form": {"Id": "test-1"},
    }
    normalized = normalize_form_data(raw)
    assert normalized["case_info"]["case_number"] == "BC999"
    assert normalized["case_info"]["filing_date"] == "2026-03-04"
    # Confirmed against source: case_context is nested under case_info
    # (normalizer.py:237 — case_info_with_context = {**case_info, 'case_context': ...}).
    ctx = normalized["case_info"]["case_context"]
    assert ctx["case_number"] == "BC999"
    assert ctx["filing_date"] == "March 4, 2026"
    assert ctx["plaintiff_label"] == "Plaintiffs"   # 2 plaintiffs
    assert ctx["defendant_label"] == "Defendant"    # 1 defendant
```

Note: the exact shape of `PlaintiffDetails` / `DefendantDetails2` in the fixture must match
what `extract_plaintiffs` / `extract_defendants` consume — inspect those parsers and adjust
the fixture keys if the assertion on party counts fails. The `case_context` path is
confirmed nested under `case_info` (do not change that assertion).

- [ ] **Step 2: Run the test**

Run: `python -m pytest tests/test_case_fields_e2e.py -v`
Expected: PASS. If the return structure differs, fix the assertions to match reality (not the pipeline).

- [ ] **Step 3: Commit**

```bash
git add "normalization work/tests/test_case_fields_e2e.py"
git commit -m "test(pipeline): end-to-end check for case fields and party labels"
```

---

### Task 8: Update templates & deploy

**Files:**
- Modify (user, in Word): `discovery-templates-live/SROGsMaster.docx`, `PODsMaster.docx`, `AdmissionsMaster.docx`

Not a code task — coordination + deploy. No automated test; verified by a live render.

- [ ] **Step 1: Edit the 3 templates**

In each `.docx` caption block, replace:
- `Plaintiff,` → `<<PlaintiffLabel>>,`
- `Defendant.` → `<<DefendantLabel>>.`

Add where desired in the caption:
- `<<Case.CaseNumber>>` — case number
- `<<Case.FilingDate>>` — filing date

Leave all other merge fields untouched.

- [ ] **Step 2: Deploy pipeline code**

Merge Tasks 1-7 to main. Deploy `node-server` (form-transformer) — rides ci-cd-main on push to main. Deploy the Python pipeline manually (its CI deploy step is commented out):

```bash
gcloud run deploy python-pipeline --source="normalization work" --project=docmosis-tornado --region=us-central1
```

- [ ] **Step 3: Deploy templates to Docmosis VM**

For each edited template:

```bash
gcloud compute scp --tunnel-through-iap --zone=us-central1-c --project=docmosis-tornado "discovery-templates-live/SROGsMaster.docx" docmosis-tornado-vm:/tmp/
gcloud compute ssh docmosis-tornado-vm --tunnel-through-iap --zone=us-central1-c --project=docmosis-tornado --command="sudo docker cp /tmp/SROGsMaster.docx tornado:/home/docmosis/templates/SROGsMaster.docx"
```

Repeat for PODsMaster.docx and AdmissionsMaster.docx.

- [ ] **Step 4: Verify with a live render**

Submit a test case (2 plaintiffs, 1 defendant, a case number + filing date) through the docs form. Confirm the generated SROGs/PODs/Admissions show: "Plaintiffs," / "Defendant.", the case number, and "Month D, YYYY" filing date.

---

## Self-Review

**Spec coverage:**
- Case Number field → Tasks 1, 2, 4, 5, 6, 8 ✓
- Filing Date field + long-form format → Tasks 1, 2, 3, 4, 5, 6, 8 ✓
- Party label pluralization → Tasks 5, 6, 8 ✓
- FormTransformer layer (spec note) → Task 2 ✓
- Backward compat (`.get()` fallbacks) → Tasks 2, 4, 5, 6 ✓
- Tests → Tasks 2-7 ✓
- Template edits + deploy → Task 8 ✓

**Placeholder scan:** No TBD/TODO. Two tasks (6, 7) carry explicit "inspect actual method name / return shape before writing" notes rather than guessed internals — these are verification instructions, not placeholders, because the exact public entry point of `SetSplitter` and the return shape of `normalize_form_data` must be confirmed against source at implementation time.

**Type consistency:** `format_filing_date` (Task 3) consumed in Task 5. `case_number`/`filing_date` keys flow parser (4) → context (5) → splitter (6). Labels `plaintiff_label`/`defendant_label` (5) → `PlaintiffLabel`/`DefendantLabel` (6). Template names match Global Constraints.
