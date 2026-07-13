# Discovery Docs: Case Number, Filing Date & Party Label Pluralization

**Date:** 2026-07-13
**Status:** Approved (design)

## Problem

The discovery document pipeline (SROGs, PODs, Admissions) is missing two case-level
fields and mishandles party pluralization:

1. **No case number** — templates have no case-number field; the intake form has no
   input for it.
2. **No filing date** — no "Date Complaint Filed" field exists in form or templates.
3. **Party labels are hardcoded singular** — the caption block always reads
   `Plaintiff,` / `Defendant.` regardless of party count. A case with 3 plaintiffs
   still renders "Plaintiff," (singular).

Caption block today (all three templates):

```
<<AllPlaintiffsUpperWithTypes>>
        Plaintiff,
    vs.
<<AllDefendantsUpperWithTypes>> and DOES 1 to 25, inclusive
        Defendant.
```

## Requirements

| Field | Input | Optional? | Rendering |
|-------|-------|-----------|-----------|
| Case Number | Manual text field | Yes | Blank when empty |
| Filing Date | Native date picker (`<input type="date">`) | Yes | Long form "January 15, 2026"; blank when empty |
| Plaintiff label | Auto (party count) | — | "Plaintiff" if ≤1, else "Plaintiffs" |
| Defendant label | Auto (party count) | — | "Defendant" if ≤1, else "Defendants" |

## Data Flow

```
Form (forms/docs/index.html; FormData auto-collects named inputs)
  → raw keys { case-number, filing-date, ... }
  → services/form-transformer.js
       transformFormData()        (case-number → CaseNumber, filing-date → FilingDate)
       revertToOriginalFormat()   (CaseNumber → "Case number", FilingDate → "Filing date")
  → phase1/input_parser.py       (case_info gains case_number, filing_date)
  → phase1/normalizer.py         (_build_case_context: labels + case fields + formatted date)
  → phase5/set_splitter.py       (surfaces values into enriched set / Case dict)
  → webhook payload
  → Docmosis templates (.docx)
```

**Note:** The Node `FormTransformer` (`services/form-transformer.js`) sits between the
form and the Python pipeline. It runs on `node-server`, not the Python pipeline, so this
layer deploys via `node-server` (ci-cd-main), separate from the pipeline deploy. Raw form
keys are mapped twice (transform → revert to original human-readable keys), and the Python
parser reads the human-readable keys. The form itself needs no JS change — `FormData`
auto-collects any named input.

`case_context` is built **once** in `normalizer.py::_build_case_context()` (which has the
raw `plaintiffs`/`defendants` lists) and flows into `set_splitter.py`. These two pipeline
files are the only ones that change.

## Changes

### A. Form — `forms/docs/index.html` + `forms/docs/js/form-submission.js`

- Add to the existing **Filing** area (near `filing-city` / `filing-county`, ~line 2163):
  - `Case Number` — `<input type="text">`, optional (no `required`).
  - `Filing Date` — `<input type="date">`, optional (no `required`).
- Submission JS includes them in the payload as:
  - `CaseNumber` — string as typed
  - `FilingDate` — raw ISO `YYYY-MM-DD` from the date picker (formatting happens server-side)

### B. Parser — `phase1/input_parser.py`

Read into `case_info` following the existing `filing_county` pattern with `.get()` fallbacks:

- `case_number` ← `CaseNumber` (default `""`)
- `filing_date` ← `FilingDate` (default `""`, raw ISO)

### C. Case context — `phase1/normalizer.py::_build_case_context()`

Add four keys to the returned dict:

- `plaintiff_label`: `"Plaintiff"` if `len(plaintiffs) <= 1` else `"Plaintiffs"`
- `defendant_label`: `"Defendant"` if `len(defendants) <= 1` else `"Defendants"`
- `case_number`: `case_info.get('case_number', '')`
- `filing_date`: `format_filing_date(case_info.get('filing_date', ''))`

### D. Date formatter — new helper (in `normalizer.py` or a phase1 util)

`format_filing_date(iso_str) -> str`:
- `"2026-01-15"` → `"January 15, 2026"`
- `""` / `None` → `""`
- malformed input → `""` (never raises)

Implementation: `datetime.strptime(s, "%Y-%m-%d").strftime("%B %-d, %Y")` guarded by
try/except returning `""`. (Use `%d` + strip leading zero if `%-d` is unavailable on the
target platform.)

### E. SetSplitter — `phase5/set_splitter.py`

In the enriched-set build (~line 315-324):

- Into the `Case` dict:
  - `'CaseNumber': case_context.get('case_number', '')`
  - `'FilingDate': case_context.get('filing_date', '')`
- Top-level:
  - `'PlaintiffLabel': case_context.get('plaintiff_label', 'Plaintiff')`
  - `'DefendantLabel': case_context.get('defendant_label', 'Defendant')`

### F. Templates — the 3 `.docx` (edited by user)

Variable names (final):

- `<<Case.CaseNumber>>` — case number
- `<<Case.FilingDate>>` — formatted filing date
- `<<PlaintiffLabel>>` — replaces hardcoded `Plaintiff,` → `<<PlaintiffLabel>>,`
- `<<DefendantLabel>>` — replaces hardcoded `Defendant.` → `<<DefendantLabel>>.`

Case number / filing date placed in the caption where the user wants them.

## Error Handling / Edge Cases

- **Empty case number / filing date** → empty string; template renders blank (no "N/A").
- **Invalid date** → formatter returns `""`; pipeline never crashes.
- **Zero plaintiffs/defendants** → label defaults to singular.
- **Backward compatibility** — old submissions without the new fields: `.get()` fallbacks
  to `""` / singular. Nothing breaks.

## Testing

Pytest, matching `normalization work/tests/` style:

- `_build_case_context`: 1 plaintiff → "Plaintiff", 2+ → "Plaintiffs"; same for defendants.
- `format_filing_date`: `"2026-01-15"` → `"January 15, 2026"`; `""` → `""`; garbage → `""`.
- `input_parser`: `CaseNumber` / `FilingDate` present and absent.
- One end-to-end: run a sample submission through the pipeline, assert the payload `Case`
  dict contains `CaseNumber`, `FilingDate`, and correct `PlaintiffLabel` / `DefendantLabel`.

## Out of Scope (YAGNI)

- Complaint creator (`forms/complaint/`) — separate app.
- `phase4_5/consolidator.py` — its `Case`/plaintiff strings are hardcoded sample/docstring
  data, not the runtime path. Untouched.
- Template-deploy automation — user edits the 3 `.docx`; deploy via the Docmosis VM path
  (`docker cp` into `tornado:/home/docmosis/templates/`).

## Deployment

- **Pipeline code** → rides the `python-pipeline` deploy (`normalization work/**` triggers
  a build; deploy command run manually, as its CI deploy step is commented out).
- **Templates** → copied to the Docmosis Tornado VM container
  (`docmosis-tornado-vm`, container `tornado`, path `/home/docmosis/templates/`).
