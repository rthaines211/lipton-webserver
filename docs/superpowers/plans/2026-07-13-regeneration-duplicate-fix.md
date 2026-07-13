# Regeneration Duplicate-File Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make discovery regeneration replace the prior run's documents instead of accumulating `_N`-suffixed duplicates, and codify the python-pipeline Cloud Run deploy so its timeout/scaling config is reproducible.

**Architecture:** Extract the per-case output-directory path computation from a nested closure to a module-level function so the phase-5 orchestrator can clear each target directory once before writing. Remove the collision-avoidance loop that created `_N` names. Separately, uncomment/complete the commented-out CI deploy step.

**Tech Stack:** Python 3.9 (FastAPI normalization pipeline in `normalization work/`), pytest, GitHub Actions, Google Cloud Run.

## Global Constraints

- Python service lives in `normalization work/` — all Python paths below are relative to that directory unless noted.
- Tests run with `pytest` from inside `normalization work/`.
- Delete scope is destructive on client legal documents: only ever unlink files **directly inside** a resolved leaf `{doc_type}/` directory, and only when that directory resolves **under** the configured `output_directory` base. Never `rmtree`, never recurse, never touch a parent.
- The pipeline can emit `.pdf`, `.doc`, `.docx`, `.pptx`, `.xlsx`, `.txt`, `.bin` — clear ALL files in the target dir, not just `.docx`.
- Follow existing phase5 test style: `import pytest`, `from src.phase5.<module> import <fn>`, class-grouped tests.

---

### Task 1: Extract `compute_output_directory` to module level

Currently `resolve_output_directory` is nested inside `send_set_to_webhook` (closure over `dataset`/`set_data`), so the orchestrator can't reuse it. Extract it — plus the two helpers it needs (`strip_unit`, `document_type_folder`) and the shared `sanitize_path_text` — to module-level functions.

**Files:**
- Modify: `src/phase5/webhook_sender.py`
- Test: `tests/phase5/test_output_directory.py` (create)

**Interfaces:**
- Produces:
  - `sanitize_path_text(text: str, default: str = "document") -> str`
  - `strip_unit(address: Optional[str]) -> Optional[str]`
  - `document_type_folder(raw_type: Optional[str]) -> str`
  - `compute_output_directory(base_dir: Path, dataset: Optional[Dict[str, Any]], set_data: Dict[str, Any]) -> Path` — returns the leaf dir `base_dir/{address}/{hoh}/Discovery Propounded/{doc_type}`, or `base_dir` if `dataset` is falsy.

- [ ] **Step 1: Write the failing test**

Create `tests/phase5/test_output_directory.py`:

```python
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
```

These assertions reflect the existing behavior verified in the source: `document_type_folder` maps `"srogs"` → `"SROGs"` (also `admissions`→`ADMISSIONS`, `pods`/`pod`→`PODS`), and `strip_unit` strips a trailing `#4`/`Unit N`/`Apt N`/`Suite N`. The extraction is behavior-preserving, so these must pass unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_output_directory.py -v`
Expected: FAIL with `ImportError: cannot import name 'compute_output_directory'`

- [ ] **Step 3: Extract the functions to module level**

In `src/phase5/webhook_sender.py`, move these four functions OUT of `send_set_to_webhook` to module scope (top level, after imports). They currently exist as nested defs around lines 132-212. Convert `resolve_output_directory(base_dir)` (which closed over `dataset` and `set_data`) into `compute_output_directory(base_dir, dataset, set_data)` taking them as explicit parameters. Keep the bodies identical otherwise.

```python
def sanitize_path_text(text: str, default: str = "document") -> str:
    # ... exact body copied from the current nested version ...

def strip_unit(address):
    # ... exact body copied from the current nested version ...

def document_type_folder(raw_type):
    # ... exact body copied from the current nested version ...

def compute_output_directory(base_dir, dataset, set_data):
    """Build nested output directory from dataset/set metadata.

    Module-level (was nested resolve_output_directory) so the orchestrator
    can reuse it to clear directories before writing.
    """
    if not dataset:
        return base_dir
    case_meta = dataset.get('case_metadata', {}) if dataset else {}
    address = (
        case_meta.get('property_address')
        or case_meta.get('property_address_with_unit')
        or set_data.get('Case', {}).get('FullAddress', '')
    )
    address = strip_unit(address)
    hoh = set_data.get('HeadOfHousehold') or dataset.get('metadata', {}).get('head_of_household', '')
    doc_folder = document_type_folder(dataset.get('doc_type'))
    address_segment = sanitize_path_text(address, "Unknown Address")
    hoh_segment = sanitize_path_text(hoh, "Unknown HoH")
    doc_segment = sanitize_path_text(doc_folder, "discovery")
    output_path = base_dir
    for segment in (Path(address_segment), Path(hoh_segment), Path("Discovery Propounded"), Path(doc_segment)):
        output_path = output_path / segment
    return output_path
```

Then, inside `send_set_to_webhook`, delete the now-removed nested defs and replace the call `resolve_output_directory(base_dir)` with `compute_output_directory(base_dir, dataset, set_data)`. Also delete the nested `determine_extension` ONLY if it is unused elsewhere — check first; if `send_set_to_webhook` still uses it locally, leave `determine_extension` nested (it is not needed by the orchestrator).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_output_directory.py -v`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full phase5 suite to confirm no regression**

Run: `cd "normalization work" && python -m pytest tests/phase5/ -v`
Expected: PASS (all pre-existing phase5 tests still green — the extraction is behavior-preserving)

- [ ] **Step 6: Commit**

```bash
git add "normalization work/src/phase5/webhook_sender.py" "normalization work/tests/phase5/test_output_directory.py"
git commit -m "refactor(phase5): extract compute_output_directory to module level

Was a nested closure in send_set_to_webhook; module-level so the orchestrator
can reuse it to clear directories before writing. Behavior-preserving.

Claude-Session: https://claude.ai/code/session_01RG2xxeCvJGvTchY4vBauRo"
```

---

### Task 2: Add `clear_output_directory` with safety guard

A single function that deletes the generated files in one leaf directory, with the safety guard from Global Constraints.

**Files:**
- Modify: `src/phase5/webhook_sender.py`
- Test: `tests/phase5/test_clear_output_directory.py` (create)

**Interfaces:**
- Consumes: nothing (self-contained).
- Produces: `clear_output_directory(output_dir: Path, base_dir: Path) -> int` — unlinks each file directly inside `output_dir`; returns count deleted. Skips (returns 0, logs) if `output_dir` is not relative to `base_dir` or does not exist. Never recurses, never removes directories.

- [ ] **Step 1: Write the failing test**

Create `tests/phase5/test_clear_output_directory.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_clear_output_directory.py -v`
Expected: FAIL with `ImportError: cannot import name 'clear_output_directory'`

- [ ] **Step 3: Implement `clear_output_directory`**

Add at module level in `src/phase5/webhook_sender.py`:

```python
def clear_output_directory(output_dir: Path, base_dir: Path) -> int:
    """Delete generated files directly inside output_dir (regeneration = replace).

    Safety: only clears a directory that resolves under base_dir. Top-level files
    only — never recurses, never removes directories. Returns count deleted.
    """
    output_dir = Path(output_dir)
    base_dir = Path(base_dir)
    try:
        # Python 3.9: is_relative_to not available; use relative_to + try/except.
        output_dir.resolve().relative_to(base_dir.resolve())
    except ValueError:
        print(f"⚠️  Refusing to clear directory outside base: {output_dir}")
        return 0
    if not output_dir.exists():
        return 0
    deleted = 0
    for entry in output_dir.iterdir():
        if entry.is_file():
            entry.unlink()
            deleted += 1
    return deleted
```

Note: `base_dir.resolve()` — in tests `base_dir` is a real `tmp_path`, so resolve works. In production `output_directory` is a relative path (`webhook_documents`); both sides resolve against the same cwd, so `relative_to` still holds. Keep both `.resolve()` calls symmetric.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_clear_output_directory.py -v`
Expected: PASS (all four tests)

- [ ] **Step 5: Commit**

```bash
git add "normalization work/src/phase5/webhook_sender.py" "normalization work/tests/phase5/test_clear_output_directory.py"
git commit -m "feat(phase5): add clear_output_directory with under-base safety guard

Claude-Session: https://claude.ai/code/session_01RG2xxeCvJGvTchY4vBauRo"
```

---

### Task 3: Clear-once in the orchestrator + remove the dedup loop

Wire `clear_output_directory` into `send_all_sets_with_progress` so each unique target dir is cleared once before writing, and remove the `_N` collision loop in `send_set_to_webhook`.

**Files:**
- Modify: `src/phase5/webhook_sender.py` (`send_all_sets_with_progress` ~line 394; `send_set_to_webhook` dedup block ~lines 257-262)
- Test: `tests/phase5/test_regeneration_replace.py` (create)

**Interfaces:**
- Consumes: `compute_output_directory` (Task 1), `clear_output_directory` (Task 2).
- Produces: no new public symbols; behavior change only.

- [ ] **Step 1: Write the failing test**

Create `tests/phase5/test_regeneration_replace.py`. This test drives the clear-once logic directly by simulating the orchestrator's per-dataset loop over a small phase5-shaped structure, asserting a stale file in a target dir is removed exactly once (not per-set).

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_regeneration_replace.py -v`
Expected: FAIL — the test imports resolve, but if `compute_output_directory`/`clear_output_directory` are correct it may pass immediately since it exercises them directly. If it PASSES here, that is acceptable: it locks in the contract the orchestrator must follow. Proceed to wire the orchestrator (Step 3) regardless.

- [ ] **Step 3: Wire clear-once into `send_all_sets_with_progress`**

In `send_all_sets_with_progress`, add a cleared-dirs set before the dataset loop and clear each target dir the first time it is seen. Insert immediately after `results = []` (before the counting loop is fine; must be before the send loop):

```python
    results = []
    succeeded = 0
    failed = 0
    total_sets = 0

    # Regeneration = replace: clear each target output dir once before writing,
    # so a rerun overwrites the prior run's files instead of accumulating _N copies.
    base_dir = Path(config.get('output_directory', 'webhook_documents'))
    cleared_dirs = set()
```

Then, inside the send loop, right before `result = send_set_to_webhook(...)`:

```python
            target_dir = compute_output_directory(base_dir, dataset, set_data)
            if target_dir not in cleared_dirs:
                removed = clear_output_directory(target_dir, base_dir)
                if verbose and removed:
                    print(f"🧹 Cleared {removed} stale file(s) from {target_dir}")
                cleared_dirs.add(target_dir)

            result = send_set_to_webhook(set_data, config, dataset=dataset)
```

Ensure `Path` is imported at module top (it is — `from pathlib import Path`).

- [ ] **Step 4: Remove the `_N` dedup loop in `send_set_to_webhook`**

Replace the collision loop (currently ~lines 257-262) so it writes the clean name directly. Change:

```python
                    candidate = output_dir / f"{base_name}{extension}"

                    counter = 1
                    while candidate.exists():
                        candidate = output_dir / f"{base_name}_{counter}{extension}"
                        counter += 1

                    with open(candidate, 'wb') as f:
                        f.write(response.content)
```

to:

```python
                    candidate = output_dir / f"{base_name}{extension}"
                    # No dedup suffix: the orchestrator clears the dir once per run,
                    # so writing the clean name replaces any prior file of the same name.
                    with open(candidate, 'wb') as f:
                        f.write(response.content)
```

(`output_dir` here is now `compute_output_directory(base_dir, dataset, set_data)` from Task 1.)

- [ ] **Step 5: Run the new test + full phase5 suite**

Run: `cd "normalization work" && python -m pytest tests/phase5/test_regeneration_replace.py tests/phase5/ -v`
Expected: PASS (new test green, all pre-existing phase5 tests green)

- [ ] **Step 6: Commit**

```bash
git add "normalization work/src/phase5/webhook_sender.py" "normalization work/tests/phase5/test_regeneration_replace.py"
git commit -m "fix(phase5): clear output dir once per run, drop _N dedup loop

Regeneration now replaces the prior run's documents instead of accumulating
mangled _N-suffixed copies. Clear-once keyed by resolved output dir so sets in
the same dir don't wipe each other. Dropbox (overwrite mode) then replaces the
correctly-named file. Fixes ...Set 4 of 4.docx_6.docx accumulation.

Claude-Session: https://claude.ai/code/session_01RG2xxeCvJGvTchY4vBauRo"
```

---

### Task 4: Codify the python-pipeline CI deploy

Uncomment and complete the deploy step so the timeout/scaling config is reproducible and the Task 1-3 change deploys automatically.

**Files:**
- Modify: `.github/workflows/python-pipeline-ci.yml` (deploy step ~lines 230-237)

**Interfaces:** none (CI config).

- [ ] **Step 1: Replace the commented-out deploy command**

In `.github/workflows/python-pipeline-ci.yml`, the `🚀 Deploy Python Pipeline` step currently reads:

```yaml
      - name: 🚀 Deploy Python Pipeline
        run: |
          echo "Deploying Python pipeline to Cloud Run..."
          # gcloud run deploy python-pipeline \
          #   --image=${{ env.REGISTRY }}/${{ env.GCP_PROJECT_ID }}/python-pipeline:${{ github.sha }} \
          #   --region=${{ env.GCP_REGION }} \
          #   --platform=managed
          echo "✅ Python pipeline deployed"
```

Replace with:

```yaml
      - name: 🚀 Deploy Python Pipeline
        run: |
          echo "Deploying Python pipeline to Cloud Run..."
          gcloud run deploy python-pipeline \
            --image=${{ env.REGISTRY }}/${{ env.GCP_PROJECT_ID }}/python-pipeline:${{ github.sha }} \
            --region=${{ env.GCP_REGION }} \
            --project=${{ env.GCP_PROJECT_ID }} \
            --platform=managed \
            --timeout=3600 \
            --min-instances=1
          echo "✅ Python pipeline deployed"
```

Rationale: `--timeout=3600` and `--min-instances=1` match the config hand-applied this session. A plain `gcloud run deploy` (no `--tag`, no revision pin) routes 100% traffic to the new revision by default — this is what prevents the traffic-pin regression that caused the 504s (traffic was stuck on an old 300s revision by name).

- [ ] **Step 2: Verify the workflow still parses**

Run: `cd "/Users/ryanhaines/Projects/Lipton Webserver" && python -c "import yaml; yaml.safe_load(open('.github/workflows/python-pipeline-ci.yml')); print('YAML OK')"`
Expected: `YAML OK`

- [ ] **Step 3: Confirm trigger already covers the Python change**

Run: `grep -n "normalization work" .github/workflows/python-pipeline-ci.yml`
Expected: shows `- 'normalization work/**'` under `on.push.paths` (already present — no edit needed). This confirms the Task 1-3 change will trigger this deploy.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/python-pipeline-ci.yml
git commit -m "ci(python-pipeline): codify Cloud Run deploy with timeout=3600, min-instances=1

Uncomments the deploy step so the timeout/scaling config is reproducible instead
of living only on a hand-patched live revision. Plain deploy-to-latest (no revision
pin) prevents the traffic-pin regression that stranded traffic on an old 300s
revision. Trigger already includes 'normalization work/**'.

Claude-Session: https://claude.ai/code/session_01RG2xxeCvJGvTchY4vBauRo"
```

---

## Post-implementation (manual, not a task)

- One-time: delete the stale `auth-fix`-tagged revision `python-pipeline-00021-caz` (0% traffic) by hand to avoid future confusion. Not automated.
- Verify on next deploy: serving revision has `timeoutSeconds=3600`, `minScale=1`, traffic on latest.
- End-to-end: regenerate a case twice; confirm each Dropbox `Discovery Propounded/{type}/` folder has exactly one clean-named copy of each doc and no orphans from a larger prior run.
