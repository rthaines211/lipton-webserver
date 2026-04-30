# Fix `applyYellowHighlight` Run-Boundary Bug — Design Spec

**Date:** 2026-04-30
**Component:** Complaint Creator (`services/complaint-document-generator.js`)
**Status:** Approved (pending implementation plan)

---

## 1. Problem

In multi-plaintiff complaints the `<Move In Date>` placeholder renders as literal text in the DOCX but is **not** highlighted yellow. Reproduces every time on `complaints.liptonlegal.com`.

### Root cause

`applyYellowHighlight()` uses this regex:

```javascript
new RegExp(
  `(<w:r[^>]*>)\\s*(?:<w:rPr>([\\s\\S]*?)</w:rPr>)?\\s*(<w:t[^>]*>${escaped}</w:t>)`,
  'g'
)
```

The non-greedy `[\s\S]*?` inside the `<w:rPr>` capture allows the regex to **span across unrelated `<w:r>` runs**. When the regex starts at an earlier `<w:r>` (e.g., one containing "Kevin Lipton, Esq..."), it can match a `</w:rPr>` from that run, then `\s*` matches zero chars, then the engine searches for `<w:t...>placeholder</w:t>` — which exists much later in the document. The match succeeds and the highlight gets injected into the **wrong** `<w:rPr>`, leaving the actual placeholder run un-highlighted.

Verified by tracing: regex on the real DOCX returns one match starting at "Kevin L..." run, not the placeholder run.

This bug exists in single-plaintiff cases too but happens to work there because the document structure makes the wrong-match equal to the right-match (or no `<Move In Date>` placeholder is generated at all).

## 2. Goals

- `<Move In Date>` and `<Pronoun *>` placeholders are reliably highlighted yellow when unresolved.
- No regression in single-plaintiff cases.
- Fix is a focused replacement of `applyYellowHighlight()` body; no caller changes.

## 3. Non-Goals

- Replacing regex-based DOCX manipulation across the file (`applyPluralization`, `applyPronounPluralization`, etc.). Scope limited to `applyYellowHighlight`.
- Adding new placeholders.

## 4. Architecture

Replace the regex-based approach with an **index-based locator**:

1. Find the placeholder text by string search (`indexOf`).
2. Walk backwards to the enclosing `<w:r ...>` opening tag (bounded by `</w:r>` going further back, so we never cross run boundaries).
3. Walk forwards to the next `</w:r>`.
4. Inject highlight into that run's `<w:rPr>` (creating one if absent).
5. Repeat for next occurrence.

This approach cannot match across runs because we explicitly scope to the run containing the placeholder text.

## 5. Algorithm (per placeholder string)

```
encoded = placeholder.replace('<', '&lt;').replace('>', '&gt;')
pos = 0
while (pos = xml.indexOf(encoded, pos)) !== -1:
    runStart = lastIndexOfRunOpening(xml, pos)
    runEnd   = xml.indexOf('</w:r>', pos) + len('</w:r>')
    if runStart === -1 or runEnd === -1: break
    run = xml.slice(runStart, runEnd)
    if run already contains 'w:highlight':
        pos = runEnd
        continue
    newRun = injectHighlight(run)
    xml = xml.slice(0, runStart) + newRun + xml.slice(runEnd)
    pos = runStart + len(newRun)
```

### `lastIndexOfRunOpening(xml, pos)`

Find the most recent `<w:r ` or `<w:r>` before `pos` that is NOT preceded (within the same `pos` window) by an unmatched `</w:r>` — i.e., the actual containing run. Implement as:

```
i1 = xml.lastIndexOf('<w:r ', pos)
i2 = xml.lastIndexOf('<w:r>', pos)
candidate = max(i1, i2)
if candidate === -1: return -1
// guard: ensure no </w:r> sits between candidate and pos
gap = xml.slice(candidate, pos)
if gap.includes('</w:r>'): return -1   // placeholder isn't in this run
return candidate
```

If the guard fails, the placeholder text isn't inside a `<w:r>` (shouldn't happen, but bail safely without modifying XML).

Skip variants like `<w:rPr>` — we already filter those because we look for `<w:r ` (with trailing space) or `<w:r>`. `<w:rPr>` starts with `<w:rP` so it never matches `<w:r ` or `<w:r>`.

### `injectHighlight(run)`

```
highlightTag = '<w:highlight w:val="yellow"/>'
if run contains '<w:rPr>':
    return run.replace('</w:rPr>', highlightTag + '</w:rPr>')   // first occurrence in this run
else:
    // insert <w:rPr> immediately after the <w:r ...> opening tag
    openMatch = run.match(/^<w:r[^>]*>/)
    return run.slice(0, openMatch[0].length) +
           '<w:rPr>' + highlightTag + '</w:rPr>' +
           run.slice(openMatch[0].length)
```

## 6. Fallback for Run-Split Placeholders

The existing fallback code (paragraph-level sliding window over consecutive `<w:r>` runs whose combined text contains the placeholder) handles the case where the placeholder text spans multiple runs.

**Decision:** Keep the fallback unchanged. Run the new index-based pass first; if it modified the XML for at least one occurrence of a given placeholder, skip the fallback for that placeholder. If zero occurrences were located in single runs, fall through to the existing fallback for split-run support.

## 7. Testing

### New unit tests (in existing `tests/services/complaint-document-pronoun-pluralization.test.js` or new file)

| Scenario | Expected |
|---|---|
| Two runs in same paragraph, placeholder in second run, first run has its own `<w:rPr>` | Highlight injects into second run only; first run untouched. |
| Single run, no `<w:rPr>` | New `<w:rPr>` with highlight inserted after `<w:r>` open tag. |
| Single run, has `<w:rPr>` | Highlight added to existing `<w:rPr>`. |
| Run already has `w:highlight` | No double-injection. |
| Placeholder appears 3 times | All 3 runs get highlighted. |
| Placeholder text not present | XML unchanged. |
| Run-split placeholder (across `<w:r>` boundaries) | Existing fallback handles it. |

### Regression

- Existing 33 complaint tests still pass.
- Manual: regenerate a 2-plaintiff complaint, verify `<Move In Date>` text appears with yellow background in MS Word / Google Docs.

## 8. Rollout

- Standard PR + CI + Cloud Run deploy via `deploy-complaint-creator.yml`.
- No data migration, no env changes.

## 9. Risks

| Risk | Mitigation |
|---|---|
| `lastIndexOf` walk picks up a `<w:r>` from a prior paragraph | Guard rejects when `</w:r>` is in the gap. |
| Placeholder embedded inside a non-text element (unlikely) | Guard returns `-1`, XML left unchanged for that occurrence. |
| Performance on large docs (many placeholders, many runs) | `indexOf` and `lastIndexOf` are O(n); total O(n × placeholders) — same as current regex. |

## 10. References

- Bug discovered in: `Complaint_asidea_2026-04-30.docx` (multi-plaintiff complaint, post-merge of PR #12).
- Related: `applyPluralization` and `applyPronounPluralization` use different regex patterns and don't share this bug.
