# Design: Regeneration Duplicate-File Fix + Codified Pipeline Deploy

**Date:** 2026-07-13
**Status:** Approved (brainstorming)

## Background

Discovery regeneration for large cases (312 docs across multiple plaintiffs) was
producing mangled, accumulating filenames in the client Dropbox folders:
`...Discovery Propounded SROGs Set 4 of 4.docx_6.docx`. Each regeneration added
more `_N`-suffixed copies instead of replacing the prior run's files.

This session already fixed the timeout chain that was causing 504s (async
`node-server`, raised axios `PIPELINE_TIMEOUT`, raised `python-pipeline` Cloud Run
timeout to 3600s + `min-instances=1`). Those changes are live but partly
hand-patched. This design covers the two remaining problems:

1. **Duplicate/mangled files** on regeneration.
2. **The python-pipeline deploy is not codified**, so the timeout/scaling config
   (and this fix) live only on a hand-patched live revision and will regress.

The progress-bar-jumping issue observed mid-session is **out of scope** — it is no
longer reproducing.

## Root cause (duplicate files)

`normalization work/src/phase5/webhook_sender.py`, `send_set_to_webhook` (~line 250):

```python
candidate = output_dir / f"{base_name}{extension}"
counter = 1
while candidate.exists():                                 # stale file from prior run
    candidate = output_dir / f"{base_name}_{counter}{extension}"
    counter += 1
with open(candidate, 'wb') as f: ...
```

`output_dir` is the per-case/plaintiff/doc-type path from `resolve_output_directory`
(`webhook_documents/{address}/{plaintiff}/Discovery Propounded/{type}/`). On
regeneration the local `webhook_documents/` still holds the previous run's files, so
`candidate.exists()` is true and the loop appends `_1.._N`.

**`min-instances=1` (set this session for the timeout fix) makes this deterministic**
— the same container is reused, so `webhook_documents/` now reliably persists between
runs. Previously scale-to-zero sometimes gave a fresh container.

The Dropbox upload path is **derived from the local filename**
(`dropbox_service.upload_file(saved_file, ...)` → `relative_to(local_output_path)` →
mirrored under `/Current Clients`). Dropbox already uses `WriteMode('overwrite')`,
`autorename=False` (`dropbox_service.py:306`). So the accumulation in Dropbox is a
*symptom*: mangled local names produce unique Dropbox paths, so overwrite never has a
same-name target. **Clean the local names → clean Dropbox paths → overwrite replaces
the right file.** No Dropbox-side deletes are needed.

## Fix 1 — Clear the local output dir before writing (chosen: "replace")

Regeneration semantics = **replace**: the folder should match the current run exactly,
with no stale files and no orphans if this run produces fewer sets than the last.

**Approach:** clear each unique target `output_dir` of existing `.docx` **once per run,
before the per-set write loop**, then drop the dedup loop and write the clean name
directly.

- **Location:** `send_all_sets_with_progress` in `webhook_sender.py` (the run-level
  orchestrator, per-set loop at ~line 432) — NOT inside `send_set_to_webhook`. This
  keeps `send_set_to_webhook` a pure per-set sender and avoids doc #2 wiping doc #1
  from the same run.
- **Mechanism:** as sets are processed, track the set of `output_dir`s already cleared
  this run. The first time a given `output_dir` is seen, delete the generated
  document files in that exact directory, then proceed. Subsequent sets writing to the
  same dir skip the clear.
- **What to delete:** all files (not just `.docx`) directly inside the resolved
  `output_dir`. `determine_extension` can produce `.pdf`, `.doc`, `.docx`, `.pptx`,
  `.xlsx`, `.txt`, or `.bin`, so clearing only `*.docx` would leave orphans of other
  types and break the "replace" guarantee. Delete top-level files only — do NOT recurse
  into subdirectories (each `output_dir` is a leaf `{type}/` folder; recursion is
  unnecessary and raises blast radius).
- **Safety:** iterate files directly in the specific resolved `output_dir` and unlink
  each; NEVER `rmtree` `output_dir`, `webhook_documents/`, or any parent. Guard: only
  clear a dir whose resolved path is under the configured `output_directory` base
  (assert/`is_relative_to` check before any unlink). If the guard fails, skip the clear
  and log — never delete outside the base.
- **Remove** the `while candidate.exists()` counter loop in `send_set_to_webhook`;
  write `output_dir / f"{base_name}{extension}"` directly (it's now guaranteed clear).

Because the clear happens per-`output_dir` and dirs are keyed by plaintiff + doc-type,
each plaintiff's SROGs/PODs/Admissions folder is independently reset — correct for the
multi-plaintiff case.

**Test:** unit test in `normalization work/tests/phase5/` — seed an `output_dir` with a
stale `...Set 4 of 4.docx` AND a stale non-docx orphan (e.g. a leftover `.pdf`), run the
clear-once path, assert both stale files are gone and the fresh write has the clean name
(no `_N`). Also assert the guard: a computed dir outside the `output_directory` base is
never cleared. One runnable check; no new framework.

## Fix 2 — Codify the python-pipeline CI deploy

`.github/workflows/python-pipeline-ci.yml` builds and pushes
`python-pipeline:${{ github.sha }}`, but the deploy step (~lines 231-237) is commented
out and only echoes success. The live service is therefore hand-configured.

**Approach:** uncomment/complete the deploy step with the config validated this session:

```yaml
gcloud run deploy python-pipeline \
  --image=${REGISTRY}/${PROJECT}/python-pipeline:${{ github.sha }} \
  --region=${REGION} --project=${PROJECT} --platform=managed \
  --timeout=3600 \
  --min-instances=1
```

- **No revision pin, no tag.** A plain `gcloud run deploy` routes 100% traffic to the
  new revision by default. The root cause of the mid-session 504s was traffic
  hard-pinned by name to an old 300s revision (`00021-caz`, `auth-fix` tag); every
  timeout update created a correct revision that got 0% traffic until
  `update-traffic --to-latest` broke the pin. Codifying a plain deploy prevents
  recurrence.
- **Trigger:** `on.push.paths` already includes `'normalization work/**'` (verified,
  line 24), so the Fix 1 Python change will trigger this deploy. No trigger change
  needed.
- **Match existing deploy conventions** (auth, region, project env vars) already
  present elsewhere in the file / other workflows.

**One-time manual cleanup (noted, not automated):** the stale `auth-fix`-tagged
revision `00021-caz` still exists at 0% traffic. Harmless while traffic is on latest,
but delete the tag/revision once by hand to avoid future confusion. Not part of the
automated workflow.

## Out of scope

- **Progress-bar aggregation** — not reproducing; skip.
- **Dropbox-side deletion** — unnecessary; clean local names + existing overwrite mode
  resolve the Dropbox accumulation.
- The already-merged/live timeout + async fixes — done; this only *codifies* the
  python-pipeline piece.

## Verification

- **Fix 1:** regenerate a case twice; confirm each Dropbox `Discovery Propounded/{type}/`
  folder has exactly one copy of each doc (no `_N`), and the set count matches the
  current run (no orphans from a larger prior run). Unit test passes.
- **Fix 2:** push a `normalization work/**` change; confirm CI deploys and the resulting
  serving revision has `timeoutSeconds=3600`, `minScale=1`, and traffic on latest (not
  pinned).
