# Exhibit Collector - Progressive UI & Gap Detection Design

**Date:** 2026-02-26
**Status:** Approved
**Author:** Ryan Haines

---

## Overview

Refactor the Exhibit Collector form to show exhibits progressively (starting with Exhibit A, adding more on demand) instead of rendering all 26 at once. Add required field validation for Case Name/Number and Description, and implement gap detection with both real-time warnings and submit-time resolution including an auto-collapse feature.

## Goals

- Show only Exhibit A on load; user adds B, C, etc. via an "Add Exhibit" button
- Make Case Name/Number and top-level Description required fields with inline validation
- Detect gaps (empty exhibits between non-empty ones) in real-time and on submit
- Offer "Collapse Gaps" to auto-shift exhibits up, and "Continue Anyway" to proceed as-is

## Non-Goals

- Per-exhibit description is NOT required (stays optional)
- No exhibits beyond Z (26 max)
- No backend changes (gap detection is purely client-side)

---

## Section 1: Progressive Exhibit Rendering

**Current:** `renderGrid()` loops A-Z and creates all 26 cards on init.

**New behavior:**
- On init, render only Exhibit A (auto-expanded)
- Track a `renderedLetters` array (starts as `['A']`)
- Extract card-creation logic from the loop into `addExhibitCard(letter)` — creates one card and appends it to `#exhibit-grid`
- "Add Exhibit" button sits below the grid inside `#exhibit-grid-section`
- Button label shows next letter: "Add Exhibit B", "Add Exhibit C", etc.
- Clicking adds the next card, auto-expands it, and scrolls it into view
- Button disables/hides after Z is reached
- The `exhibits` object still pre-initializes all 26 keys (empty arrays) so the rest of the codebase doesn't break

**Exposed methods:**
- `ExhibitManager.addNextExhibit()` — adds the next letter card
- `ExhibitManager.getRenderedLetters()` — returns current rendered letters array
- `ExhibitManager.removeTrailingEmptyCards()` — removes empty cards from the end after gap collapse

---

## Section 2: Required Fields Validation

**Case Name/Number:**
- Add red asterisk (`*`) to the label
- On submit: if empty, show inline error below the input, prevent generation
- On blur: show/clear error as user fills it in
- Red border styling when invalid

**Top-level Description:**
- Remove "(optional)" from label
- Add red asterisk
- Same inline validation as Case Name

**Generate button behavior:**
- Stays enabled based on file presence (as now)
- Clicking it runs field validation first — if fields invalid, show errors and abort

---

## Section 3: Gap Detection & Resolution

### Real-time detection

- Fires on every file add/remove event
- Scans all rendered exhibits in order
- A "gap" is any exhibit with 0 files that sits between two exhibits that have files
- Example: A(3 files), B(0 files), C(2 files) — B is a gap
- Adds a warning banner on the empty exhibit card: amber border, warning icon, text like "Exhibit B is empty — exhibits before and after it have files"
- Warning clears automatically when the gap condition no longer holds

### Submit-time validation

- Runs the same gap scan
- If gaps exist, shows a modal listing all gaps: "Exhibits B and E are empty but have exhibits with files after them"
- Two action buttons:
  1. **"Collapse Gaps"** — auto-shifts exhibits to close gaps (C→B, D→C, etc.), moving both files and descriptions. Trailing empty cards removed from DOM. "Add Exhibit" button letter updated.
  2. **"Continue Anyway"** — proceeds with generation as-is

### Collapse Gaps mechanics

1. Iterate from first gap forward
2. Shift each non-empty exhibit into the first available empty slot
3. Update `exhibits` data, exhibit labels/descriptions, card UI, and badge counts
4. Remove now-empty trailing cards from the DOM
5. Update the "Add Exhibit" button to show the correct next letter
6. Re-run gap detection (should find none) and proceed with generation

---

## Section 4: File & Component Changes

### Files modified

- **`forms/exhibits/index.html`** — Add "Add Exhibit" button below grid, add required asterisks to Case Info labels, remove "(optional)" from Description
- **`forms/exhibits/js/exhibit-manager.js`** — Refactor `renderGrid()` into `init()` + `addExhibitCard()`, add `renderedLetters` tracking, expose `addNextExhibit`, `getRenderedLetters`, `removeTrailingEmptyCards`, `collapseGaps`
- **`forms/exhibits/styles.css`** — Styles for "Add Exhibit" button, gap warning banners, required field error states, gap resolution modal

### New file

- **`forms/exhibits/js/gap-detector.js`** — Separate module for gap detection logic, real-time warning rendering, submit-time modal, and collapse-gaps functionality. Keeps `ExhibitManager` focused on card/file management.

### No backend changes needed

The server already accepts whatever exhibits are present in the session. Gap detection and resolution are purely client-side.
