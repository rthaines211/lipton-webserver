# Implementation Questions - Follow-Up Clarifications
**Date:** 2025-01-21
**Related:** [IMPLEMENTATION_QUESTIONS.md](./IMPLEMENTATION_QUESTIONS.md)

---

## Summary of Your Answers

✅ **Clear Decisions:**
- **Q3:** Option B - Restrict deletions with `ON DELETE RESTRICT`
- **Q5:** Option B - Generate TypeScript config from database
- **Q7:** Combination - Unit tests + E2E tests
- **Q11:** Identical styling between intake and doc gen forms
- **Q12:** Firm-wide access (no per-attorney restrictions)
- **Q13:** Warn before overwriting changes on reload

⚠️ **Need Clarification:**
- **Q1:** Taxonomy governance (see below)
- **Q4:** Non-silent failures (see below)
- **Q15:** Photo storage timeline (see below)
- **Q10:** Pagination assumption (see below)
- **Q14:** Feature flag (can proceed with env var for now)

---

## 🔴 Critical Clarifications Needed

### Question 1 Follow-Up: Taxonomy Governance

**Your Answer:**
> "The intake form will not need updating after submission, it will be single use. The updates made to the entry will be done by the doc generation form. Does that clarify?"

**What This Tells Me:**
- ✅ Intake submissions are **immutable** (client submits once, never edits)
- ✅ Attorneys make all edits via **doc gen form**
- ✅ Workflow is: Client intake → Attorney review in doc gen → Attorney edits → Generate docs

**What I Still Need to Know:**

**Scenario:** We're in Phase 2 building the intake form UI. We realize we need to add a new category "Water Damage Issues" with options like "Flooding", "Leaks", "Water Intrusion".

**Question:** What's the workflow for adding this?

**Option A: You Decide During Planning**
- You (Ryan) specify all 20+ categories upfront in Phase 1
- Any additions during development require your approval
- Most controlled, ensures consistency

**Option B: I Add Directly**
- I identify need for new category
- I add to database migration script
- I add to config files
- I update both intake and doc gen forms
- Most flexible for development

**Option C: Check with You First**
- I identify need, propose it to you
- You verify it doesn't conflict with existing doc gen
- You approve, I implement
- Balance of control and speed

**My Recommendation:**
**Option B during local development** (you can review in git commits), then **Option A/C for production** (requires approval).

**YOUR CLARIFICATION:**
```
Option C
```

---

### Question 4 Follow-Up: Non-Silent Failures

**Your Answer:**
> "Option C seems best, but can we make the failures non-silent"

**Clarification:**
Option C (triggers) **already has non-silent failures**. Here's what happens:

```sql
-- Attempt to insert invalid category code
INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'vermim', 'Typo in category');

-- Result: LOUD FAILURE ❌
ERROR:  Invalid category_code: vermim
CONTEXT:  PL/pgSQL function validate_category_code() line 5 at RAISE
```

**What You See:**
- **Database:** Error message with exact problem
- **API:** 500 error with "Invalid category_code: vermim"
- **Frontend:** Error toast or console error
- **Logs:** Full stack trace with the bad value

**This is different from silent failure**, which would be:
```sql
-- Silent failure (no validation)
INSERT INTO intake_issue_metadata (..., 'vermim', ...);
-- Succeeds! ✅ But data is wrong, won't appear in queries
```

**Confirmation Needed:**

Does Option C with the trigger (loud errors as shown above) meet your needs? Or did you want something else?

**YOUR CLARIFICATION:**
```
yes
```

---

### Question 15 Follow-Up: Photo Storage Timeline

**Your Answer:**
```
- Storage method: A (local filesystem)
- JSONB structure: rich metadata
- Size limits: Max per intake
- Timeline: defer?
```

**Conflicting Signals:**
- You specified **how** to implement (method A, rich metadata)
- But then said "**defer?**" for timeline

**Clarification Needed:**

**Option 1: Implement Photos in Phase 1**
- Create `photos` JSONB field in Phase 1.4
- Implement upload endpoint
- Store files in `/uploads/intakes/` directory
- Include in Phase 4.3 view windows
- **Timeline:** Phase 1-4 (next few weeks)

**Option 2: Placeholder for Now**
- Create `photos` JSONB field in Phase 1.4 (schema only)
- Default to empty array: `'[]'::jsonb`
- Skip upload implementation
- Skip view window display
- Implement later (Phase 6 or post-launch)
- **Timeline:** TBD

**Option 3: Skip Entirely**
- Don't create `photos` field at all
- Add it later if needed
- **Timeline:** Not planned

**For Option 1, also need:**
- **Max file size per photo?** (e.g., 5MB, 10MB)
- **Max photos per intake?** (e.g., 20 photos, 50 photos)
- **Max total size per intake?** (e.g., 50MB, 100MB)
- **Allowed formats?** (e.g., JPG, PNG, HEIC only)

**My Recommendation:**
Option 2 (placeholder). Create the field now for schema completeness, but skip upload/display implementation until after core intake/doc-gen unification is working.

**YOUR CLARIFICATION:**
```
Option 2
```

---

### Question 10 Follow-Up: Existing Pagination?

**Your Answer:**
> "Think this is already handleded no?"

**I Checked:** [routes/intakes-jsonb.js:575-639](../../../routes/intakes-jsonb.js#L575-L639)

**Finding:** ❌ **Pagination does NOT exist**

The current `GET /api/intakes` endpoint returns ALL intakes with no pagination:
```javascript
SELECT id, intake_number, first_name, ...
FROM client_intakes
WHERE deleted_at IS NULL
ORDER BY created_at DESC  -- No LIMIT or OFFSET
```

**What This Means:**
- Need to implement pagination in Phase 4.3
- For now (local dev), this is fine (few test records)
- For production, we'll add `LIMIT` and `OFFSET` parameters

**Recommended Implementation (Phase 4.3):**
```javascript
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const query = `
        SELECT ... FROM client_intakes
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);
    // ... return with pagination metadata
});
```

**No blocker for now** - we can add this in Phase 4.3 when building the "Load from Intake" modal.

---

## 🟢 Lower Priority Items

### Question 14: Feature Flag Storage

**Your Answer:**
> "idk"

**My Decision (If You're Okay With It):**

For now, use **environment variable** (`USE_NEW_INTAKE_SCHEMA=true`):
- Simple for local development
- Good enough until production deployment
- Can revisit later if we need runtime toggle

In Phase 6 (production deployment), we can reassess if database config table is needed.

**If you disagree, let me know. Otherwise I'll proceed with env var.**

---

## Action Items

**For You to Provide:**

1. **Q1 Clarification:** How to handle adding new categories during development (Option A, B, or C)
2. **Q4 Confirmation:** Option C trigger with loud errors is acceptable (yes/no)
3. **Q15 Decision:** Photo implementation timeline (Option 1, 2, or 3 + size limits if Option 1)

**For Me to Do:**

1. ✅ Check if pagination already exists (Q10)
2. ✅ Proceed with env var for feature flag (Q14)

---

## Decisions Summary (Once You Clarify)

Once you provide the 3 clarifications above, I will:

1. **Update INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md** with all decisions
2. **Create Phase 1 detailed implementation specs:**
   - Migration scripts with ON DELETE RESTRICT (Q3)
   - Trigger for category code validation (Q4)
   - Script to generate TypeScript config from DB (Q5)
   - Photo field schema (Q15)
3. **Create Phase 4/5 test specs:**
   - Unit + E2E test structure (Q7)
   - FormTransformer compatibility tests
4. **Begin Phase 1.1: Audit & Verification**
   - Extract all categories from form-transformer.js
   - Compare with existing database
   - Document gaps

**Ready to move forward once you provide the 3 clarifications above!**

---

## 📊 Comprehensive Decisions Summary

Based on your answers, here's what we're implementing:

### ✅ Confirmed Decisions

| Question | Your Decision | Implementation Impact |
|----------|---------------|----------------------|
| **Q3: Delete Protection** | Option B - `ON DELETE RESTRICT` | Phase 1.4 - Add FK constraints to prevent accidental deletions |
| **Q5: Mapping Sync** | Option B - Generate TypeScript from DB | Phase 1-2 - Create build script that generates `issue-categories-config.ts` from database |
| **Q7: Testing Strategy** | Combination (Unit + E2E) | Phase 5 - Build fast unit tests + comprehensive E2E test suite |
| **Q11: Visual Styling** | Identical | Phase 2 - Forms must have same CSS, colors, fonts (not just checkbox positions) |
| **Q12: Access Control** | Firm-wide | Schema - No `assigned_attorney_id` column needed |
| **Q13: Reload Behavior** | Warn before overwrite | Phase 4.3 - Show confirmation dialog when reloading |
| **Q14: Feature Flag** | Environment variable (default) | Use `USE_NEW_INTAKE_SCHEMA` env var for now |

### ⚠️ Needs Clarification (3 Items)

1. **Q1 (Taxonomy Governance):** You clarified the workflow (intake immutable, doc gen edits), but I need to know: **Who approves adding new categories during development?** (Option A/B/C from follow-up)

2. **Q4 (Typo Prevention):** You want Option C (triggers) but asked for "non-silent failures". **Confirm:** Option C already has loud errors via `RAISE EXCEPTION`. Is this acceptable?

3. **Q15 (Photo Storage):** You said "Storage method: A, JSONB: rich metadata, defer?" - conflicting signals. **Clarify:** Implement photos now (Option 1) or just create placeholder field (Option 2)?

---

## 🎯 My Interpretation of Q1 (Needs Your Confirmation)

**Your Answer Analysis:**
You said: "The intake form will not need updating after submission, it will be single use. The updates made to the entry will be done by the doc generation form."

**What I Understand:**
- Client submits intake → immutable record created
- Attorney loads intake into doc gen form → can edit/add issues
- **Doc gen is the "master editor"** for issues

**My Proposed Approach:**
Since doc gen controls the editing, **doc gen should control the taxonomy**. Here's my recommendation:

**Phase 1.1-1.3: Define ALL 20 Categories Upfront**
- I extract all categories from `form-transformer.js` (doc gen's source of truth)
- Create comprehensive seed data with all categories doc gen uses
- Add to database in Phase 1.3
- **This is Option D ("Schema-First Approach") from the original question**

**Future Additions:**
- If we need new category later, you approve it
- We add to database migration
- Run generator script (from Q5 decision) to update TypeScript config
- Both systems automatically get the new category
- **This would be Option C ("Check with you first") for post-Phase 1**

**Does this align with your intent? Or did you want something different?**

**YOUR CONFIRMATION:**
```
[Yes, extract from doc gen and lock it down / No, I want {different approach}]
```

---

## 🔍 Technical Findings from Codebase Review

### Pagination (Q10)
- **Status:** ❌ Not implemented
- **Current:** Returns all intakes unbounded
- **Impact:** Not a blocker for local dev (few records)
- **Plan:** Add pagination in Phase 4.3

### Existing Intake Schema
I noticed the current intake schema ([routes/intakes-jsonb.js:126-432](../../../routes/intakes-jsonb.js#L126-L432)) stores building issues in a **flattened structure**:
```javascript
buildingIssues = {
    hasPestIssues: boolean,
    pestRats: boolean,
    pestMice: boolean,
    pestDetails: text,
    pestFirstNoticed: date,
    // ... 200+ individual boolean fields
}
```

This confirms the problem statement in the plan - we need to migrate to the normalized taxonomy structure using `intake_issue_selections` and `intake_issue_metadata` tables.

---

## 🚀 Ready to Proceed (Pending 3 Clarifications)

Once you provide clarifications for **Q1, Q4, and Q15**, I will:

### 1. Update Implementation Plan
- Add all confirmed decisions to `INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md`
- Document taxonomy governance approach (Q1)
- Specify photo implementation timeline (Q15)
- Add trigger validation details (Q4)

### 2. Create Phase 1 Implementation Specs
```
database/migrations/002_add_missing_issue_taxonomy.sql
database/migrations/003_create_intake_issue_tables.sql
database/migrations/004_add_delete_protection.sql
scripts/generate-issue-categories-config.js
scripts/audit-existing-taxonomy.js
```

### 3. Begin Phase 1.1 Execution
- Extract all issue categories from `services/form-transformer.js`
- Compare with existing `issue_categories` table
- Generate gap analysis report
- Create seed data CSV files

**Estimated Time to Start Phase 1.1:** < 30 minutes after receiving your 3 clarifications
