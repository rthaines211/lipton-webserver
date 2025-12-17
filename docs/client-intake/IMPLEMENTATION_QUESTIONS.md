# Implementation Questions for Intake ↔ Doc Gen Unification
**Date:** 2025-01-21
**Status:** Awaiting Decisions
**Related:** [INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md](./INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md)

---

## Purpose
These questions need answers before starting Phase 1 implementation. Each question affects database schema design, safety mechanisms, or developer workflow.

**Priority Legend:**
- 🔴 **CRITICAL** - Must decide before Phase 1 (affects database design)
- 🟡 **IMPORTANT** - Should decide early (affects implementation approach)
- 🟢 **NICE TO HAVE** - Can defer to later phases

---

## 🔴 CRITICAL: Database Architecture Questions

### Question 1: Shared Taxonomy Governance

**The Question:**
Who decides when to add new categories or options to the shared `issue_categories` and `issue_options` tables?

**Context:**
Both intake and doc gen systems reference these tables. The plan states they are "additive only" - we can INSERT new rows but never UPDATE or DELETE existing ones. This prevents breaking either system.

However, this creates a governance question:

**Scenario 1 - Intake Team Wants New Category:**
```sql
-- Intake developer adds "Mold Issues" category
INSERT INTO issue_categories (category_code, category_name, display_order)
VALUES ('mold', 'Mold Issues', 21);
```
- Does this require approval from doc gen team?
- What if doc gen already uses a different category for mold?
- Who ensures naming consistency?

**Scenario 2 - Doc Gen Team Needs New Option:**
```sql
-- Doc gen team adds "Lead Paint" to HealthHazard category
INSERT INTO issue_options (category_id, option_code, option_name)
VALUES (..., 'LeadPaint', 'Lead Paint');
```
- Does intake automatically see this new option?
- Do we need to update intake form UI?
- Who coordinates the release?

**Options:**

**Option A: Developer Freedom**
- Any developer can add categories/options
- Trust developers to coordinate
- Risk: Duplicate concepts, naming inconsistencies

**Option B: Approval Required**
- All additions require review from both teams
- Ensures consistency
- Risk: Slows down development

**Option C: Single Owner**
- One person/team owns taxonomy
- All requests go through them
- Ensures consistency, potential bottleneck

**Option D: Schema-First Approach**
- Define ALL categories upfront (Phase 1.2)
- Future additions rare, always require discussion
- Most predictable, least flexible

**Why This Matters:**
- Affects Phase 1.1-1.3 workflow
- Determines if we need approval/review processes
- Impacts team coordination requirements

**YOUR ANSWER:**
```
[The intake form will not need updating after submission, it will be single use. The updates made to the entry will be done by the doc generation form. Does that clarify?]
```

---

### Question 3: Protecting Against Accidental Deletions

**The Question:**
Should we add database constraints to prevent accidental deletion of shared taxonomy data?

**Context:**
The current schema has NO foreign key constraints preventing deletion:

```sql
-- Current schema (simplified)
CREATE TABLE issue_options (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES issue_categories(id),
    option_code VARCHAR(50),
    option_name VARCHAR(255)
);

CREATE TABLE intake_issue_selections (
    id UUID PRIMARY KEY,
    intake_id UUID REFERENCES client_intakes(id),
    issue_option_id UUID REFERENCES issue_options(id)  -- What happens if option is deleted?
);
```

**Danger Scenario:**
```sql
-- Developer accidentally deletes an option
DELETE FROM issue_options WHERE option_code = 'RatsMice';
-- Result: Succeeds! ✅ (but breaks both systems)

-- Now both systems have orphaned references:
SELECT * FROM intake_issue_selections WHERE issue_option_id = '[deleted-uuid]';
-- Returns rows that reference a non-existent option

SELECT * FROM party_issue_selections WHERE issue_option_id = '[deleted-uuid]';
-- Returns rows that reference a non-existent option

-- Doc gen form shows: "Unknown Issue"
-- Intake form shows: Nothing (option disappeared)
-- Generated documents: Missing issues!
```

**Options:**

**Option A: No Protection (Current Plan)**
```sql
-- No change to foreign keys
-- Pros: Simplicity
-- Cons: Silent failures possible
```

**Option B: Restrict Deletions**
```sql
-- Add ON DELETE RESTRICT to existing FKs
ALTER TABLE intake_issue_selections
    DROP CONSTRAINT intake_issue_selections_issue_option_id_fkey,
    ADD CONSTRAINT intake_issue_selections_issue_option_id_fkey
        FOREIGN KEY (issue_option_id)
        REFERENCES issue_options(id)
        ON DELETE RESTRICT;

-- Now deletion fails with clear error:
DELETE FROM issue_options WHERE option_code = 'RatsMice';
-- ERROR: update or delete on table "issue_options" violates foreign key constraint
-- Pros: Explicit protection, clear error messages
-- Cons: Can't actually delete even if we want to
```

**Option C: Soft Deletes**
```sql
-- Add deleted_at column instead of real deletion
ALTER TABLE issue_options ADD COLUMN deleted_at TIMESTAMP;

-- "Delete" becomes an update:
UPDATE issue_options SET deleted_at = NOW() WHERE option_code = 'RatsMice';

-- Queries filter out deleted:
SELECT * FROM issue_options WHERE deleted_at IS NULL;

-- Pros: Can "undo" deletions, maintains referential integrity
-- Cons: More complex queries, deleted data still in DB
```

**Option D: Archive Table**
```sql
-- Move deleted items to archive table
CREATE TABLE issue_options_archived AS
    SELECT * FROM issue_options WHERE option_code = 'RatsMice';

DELETE FROM issue_options WHERE option_code = 'RatsMice';

-- Pros: Clean active table, preserves history
-- Cons: Most complex, requires migration scripts
```

**Recommendation:**
Option B (ON DELETE RESTRICT) is safest for shared taxonomy. We can always manually remove constraints if we truly need to delete something (rare).

**Why This Matters:**
- Prevents catastrophic data loss
- Affects Phase 1.4 migration scripts
- Determines error handling strategy

**YOUR ANSWER:**
```
[Option B]
```

---

### Question 4: Preventing Typos in Category Codes

**The Question:**
How do we prevent typos when inserting data into `intake_issue_metadata.category_code`?

**Context:**
The `intake_issue_metadata` table stores extra details per category:

```sql
CREATE TABLE intake_issue_metadata (
    id UUID PRIMARY KEY,
    intake_id UUID NOT NULL,
    category_code VARCHAR(50) NOT NULL,  -- ⚠️ Plain text, not a foreign key
    details TEXT,
    first_noticed DATE,
    -- ...
);
```

**The Problem:**
Because `category_code` is VARCHAR (not a foreign key), the database accepts ANY string:

```sql
-- Valid
INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'vermin', 'Saw rats in kitchen');

-- Typos - All accepted by database! ❌
INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'vermin ', 'Trailing space');  -- Won't match in queries

INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'Vermin', 'Wrong case');  -- Won't match 'vermin'

INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'vermim', 'Typo');  -- Won't match anything

INSERT INTO intake_issue_metadata (intake_id, category_code, details)
VALUES ('uuid-123', 'pests', 'Wrong term');  -- Doc gen uses 'vermin' not 'pests'
```

**Result:** Metadata exists but never appears in view because query does:
```sql
SELECT * FROM intake_issue_metadata WHERE category_code = 'vermin';
-- Doesn't find 'Vermin', 'vermin ', 'vermim', or 'pests'
```

**Why Not Use Foreign Key?**
Plan intentionally avoids FK to maintain independence between intake and doc gen. If we add FK:
```sql
category_code VARCHAR(50) REFERENCES issue_categories(category_code)
```
Then intake becomes tightly coupled to doc gen's category table.

**Options:**

**Option A: Application-Level Validation Only**
```javascript
// In routes/intakes-jsonb.js
const VALID_CATEGORIES = ['vermin', 'insects', 'hvac', ...];

if (!VALID_CATEGORIES.includes(categoryCode)) {
    throw new Error(`Invalid category: ${categoryCode}`);
}
```
- Pros: Maintains independence
- Cons: Database allows invalid data if API bypassed

**Option B: Database CHECK Constraint (Static List)**
```sql
ALTER TABLE intake_issue_metadata
ADD CONSTRAINT check_category_code
CHECK (category_code IN (
    'vermin', 'insects', 'hvac', 'electrical',
    'fireHazard', 'appliances', 'plumbing',
    -- ... all 20 categories
));
```
- Pros: Database enforces correctness
- Cons: Must alter constraint when adding new categories

**Option C: Trigger Validation (Dynamic Check)**
```sql
CREATE OR REPLACE FUNCTION validate_category_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM issue_categories
        WHERE category_code = NEW.category_code
    ) THEN
        RAISE EXCEPTION 'Invalid category_code: %', NEW.category_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_category_code_exists
    BEFORE INSERT OR UPDATE ON intake_issue_metadata
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_code();
```
- Pros: Dynamic validation, automatically updates when categories added
- Cons: Technically creates coupling (but only for validation)

**Option D: No Validation (Trust Developers)**
```sql
-- No constraint, rely on code review and testing
```
- Pros: Simplest, maximum flexibility
- Cons: Typos possible, silent failures

**Recommendation:**
Option C (Trigger) provides safety without breaking independence principle. Trigger validates against `issue_categories` but doesn't create formal FK relationship.

**Why This Matters:**
- Affects Phase 1.4 table creation
- Determines data quality guarantees
- Impacts debugging effort later

**YOUR ANSWER:**
```
[Option C seems best, but can we make the failures non-silent]
```

---

## 🟡 IMPORTANT: Implementation Approach Questions

### Question 5: Mapping Maintenance Strategy

**The Question:**
How do we keep three sources of truth synchronized for issue categories/options?

**Context:**
When adding a new issue option (e.g., "Lead Paint" under Health Hazards), THREE places must be updated:

**1. Database** (`database/migrations/002_add_missing_issue_taxonomy.sql`)
```sql
INSERT INTO issue_options (category_id, option_code, option_name)
VALUES (..., 'LeadPaint', 'Lead Paint');
```

**2. Frontend Config** (`shared/config/issue-categories-config.ts`)
```typescript
export const ISSUE_CATEGORIES = [
    {
        id: 'healthHazard',
        code: 'healthHazard',
        title: 'Health Hazards',
        options: [
            { id: 'healthHazard-LeadPaint', code: 'LeadPaint', label: 'Lead Paint' },
            // ... other options
        ]
    }
];
```

**3. API Mapper** (`routes/forms.js`)
```javascript
function mapOptionCodeToLabel(code) {
    const mapping = {
        'LeadPaint': 'Lead Paint',
        // ... all other mappings
    };
    return mapping[code] || code;
}
```

**The Problem:**
If we add "Lead Paint" to database but forget to update frontend config:
- Database: Has LeadPaint ✅
- Frontend: Doesn't show checkbox ❌
- API: Returns LeadPaint in data, frontend can't display it ❌

If we add to frontend but typo the code (`'LeadPait'` instead of `'LeadPaint'`):
- Database: Has LeadPaint ✅
- Frontend: Shows checkbox with code LeadPait ❌
- User checks box, saves as LeadPait ❌
- API query: `WHERE option_code = 'LeadPait'` returns nothing ❌

**Options:**

**Option A: Manual Synchronization + Tests**
```javascript
// Create test that verifies all three match
describe('Issue taxonomy sync', () => {
    it('should have all database options in frontend config', async () => {
        const dbOptions = await query('SELECT option_code FROM issue_options');
        const configOptions = ISSUE_CATEGORIES.flatMap(cat => cat.options.map(o => o.code));

        expect(dbOptions).toEqual(configOptions);
    });

    it('should have all frontend options in mapper', () => {
        const configOptions = ISSUE_CATEGORIES.flatMap(cat => cat.options.map(o => o.code));
        const mapperOptions = Object.keys(MAPPING);

        expect(configOptions).toEqual(mapperOptions);
    });
});
```
- Pros: Simple to implement, explicit control
- Cons: Test fails after adding to one place, must update other two manually

**Option B: Database as Source of Truth - Generate TypeScript**
```bash
# Build script generates config from database
npm run generate:issue-config

# Creates shared/config/issue-categories-config.ts from DB query
node scripts/generate-issue-categories-config.js
```

```javascript
// scripts/generate-issue-categories-config.js
const categories = await db.query(`
    SELECT
        ic.category_code,
        ic.category_name,
        json_agg(json_build_object(
            'code', io.option_code,
            'label', io.option_name,
            'order', io.display_order
        ) ORDER BY io.display_order) as options
    FROM issue_categories ic
    LEFT JOIN issue_options io ON io.category_id = ic.id
    GROUP BY ic.id
`);

const tsContent = `
export const ISSUE_CATEGORIES = ${JSON.stringify(categories, null, 2)};
`;

fs.writeFileSync('shared/config/issue-categories-config.ts', tsContent);
```

- Pros: Single source of truth, can't get out of sync
- Cons: Must run script after DB changes, adds build step

**Option C: API as Source of Truth - Fetch at Runtime**
```typescript
// Remove static config file entirely
// Frontend fetches from API on load

const IssueForm = () => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetch('/api/issue-categories')
            .then(res => res.json())
            .then(data => setCategories(data));
    }, []);

    return (
        <div>
            {categories.map(cat => (
                <IssueCategorySection key={cat.code} category={cat} />
            ))}
        </div>
    );
};
```

```javascript
// New API endpoint
router.get('/api/issue-categories', async (req, res) => {
    const result = await pool.query(`
        SELECT
            ic.category_code as code,
            ic.category_name as name,
            json_agg(json_build_object(
                'code', io.option_code,
                'label', io.option_name
            ) ORDER BY io.display_order) as options
        FROM issue_categories ic
        LEFT JOIN issue_options io ON io.category_id = ic.id
        WHERE ic.is_active = true
        GROUP BY ic.id
        ORDER BY ic.display_order
    `);

    res.json(result.rows);
});
```

- Pros: Truly single source of truth, always in sync, no build step
- Cons: Network request on page load, slightly slower initial render

**Option D: Hybrid - Static Config + Validation Test**
- Use static config for performance (Option A)
- Generate expected config from DB in test suite (Option B technique)
- Test fails if mismatch, developer updates static file
- Pros: Fast runtime, catches mismatches in CI
- Cons: Still requires manual updates

**Recommendation:**
Option B (Generate TypeScript) for development simplicity. Run generation script:
- After each migration during development
- As part of build process before deployment
- In CI/CD to verify nothing out of sync

**Why This Matters:**
- Affects developer workflow (Phase 2.1)
- Determines build process
- Impacts type safety and DX

**YOUR ANSWER:**
```
[Option B]
```

---

### Question 7: FormTransformer Integration Testing

**The Question:**
How do we ensure the new `transformIssueSelections()` function stays compatible with FormTransformer?

**Context:**
Phase 4.2 creates a new function that transforms intake data into doc gen format:

```javascript
// NEW function in routes/forms.js
function transformIssueSelections(selections, unitNumber) {
    return {
        VerminIssue: true,
        Vermin: ['Rats/Mice', 'Cockroaches'],
        InsectIssues: false,
        Insects: [],
        // ... must match EXACTLY what FormTransformer expects
    };
}
```

This MUST match the format that `FormTransformer.extractIssueData()` produces:

```javascript
// EXISTING function in services/form-transformer.js
FormTransformer.extractIssueData = function(rawData, plaintiffNum) {
    return {
        VerminIssue: rawData[`VerminIssue-${plaintiffNum}`] || false,
        Vermin: rawData[`vermin-${plaintiffNum}`] || [],
        // ... existing format
    };
};
```

**The Problem:**
If FormTransformer changes (e.g., field renamed from `VerminIssue` to `HasVerminIssue`), the new mapper breaks silently:

```javascript
// Someone updates FormTransformer
VerminIssue: rawData[...] || false,  // Changed to HasVerminIssue

// But transformIssueSelections still returns old format
return {
    VerminIssue: true,  // ❌ Doc gen now expects HasVerminIssue
};

// Result: Documents missing vermin issues
```

**Current State:**
Plan says transformer must match "EXACTLY" FormTransformer format, but there's no automated enforcement. Relying on:
- Code comments
- Developer awareness
- Manual testing

**Options:**

**Option A: Integration Test - Mock Document Generation**
```javascript
describe('transformIssueSelections compatibility', () => {
    it('should produce output accepted by FormTransformer', () => {
        // Create test intake data
        const intakeData = {
            issue_selections: {
                vermin: ['RatsMice', 'Cockroaches'],
                insects: ['Ants']
            },
            unit_number: '3A'
        };

        // Transform using new function
        const transformed = transformIssueSelections(
            intakeData.issue_selections,
            intakeData.unit_number
        );

        // Verify it matches FormTransformer expectations
        // This is the critical test:
        expect(transformed).toHaveProperty('VerminIssue');
        expect(transformed).toHaveProperty('Vermin');
        expect(transformed).toHaveProperty('InsectIssues');
        expect(transformed).toHaveProperty('Insects');

        // Verify structure matches exactly
        expect(typeof transformed.VerminIssue).toBe('boolean');
        expect(Array.isArray(transformed.Vermin)).toBe(true);
    });
});
```
- Pros: Catches structural mismatches
- Cons: Doesn't test actual FormTransformer code

**Option B: Full E2E Test - Actually Generate Document**
```javascript
describe('Intake to doc gen pipeline', () => {
    it('should generate valid document from loaded intake', async () => {
        // 1. Create test intake
        const intakeId = await createTestIntake({
            firstName: 'John',
            lastName: 'Doe',
            issues: {
                vermin: ['RatsMice'],
                electrical: ['NonFunctionalOutlets']
            }
        });

        // 2. Load intake into doc gen format
        const response = await request(app)
            .get(`/api/form-entries/load-from-intake/${intakeId}`);

        const docGenData = response.body.data;

        // 3. Submit to doc gen endpoint
        const formSubmission = await request(app)
            .post('/api/form-entries')
            .send(docGenData);

        expect(formSubmission.status).toBe(200);

        // 4. Verify document was generated
        const caseId = formSubmission.body.caseId;
        const documents = await getGeneratedDocuments(caseId);

        expect(documents).toHaveLength(4); // SROGs, PODs, Admissions, CM-110

        // 5. Verify document contains expected issues
        const srogsContent = await extractPDFText(documents[0]);
        expect(srogsContent).toContain('Rats/Mice');
        expect(srogsContent).toContain('Non-Functional Outlets');
    });
});
```
- Pros: Tests entire pipeline, catches any incompatibility
- Cons: Slow, requires actual Docmosis calls (or mocking)

**Option C: Contract Testing**
```javascript
// Define expected contract as JSON Schema
const DOC_GEN_CONTRACT = {
    type: 'object',
    required: [
        'Form', 'PlaintiffDetails', 'DefendantDetails2',
        'Full_Address', 'FilingCity', 'FilingCounty'
    ],
    properties: {
        PlaintiffDetails: {
            type: 'array',
            items: {
                type: 'object',
                required: ['PlaintiffItemNumberDiscovery'],
                properties: {
                    PlaintiffItemNumberDiscovery: {
                        type: 'object',
                        required: [
                            'VerminIssue', 'Vermin',
                            'InsectIssues', 'Insects',
                            // ... all required fields
                        ]
                    }
                }
            }
        }
    }
};

it('should match doc gen contract', () => {
    const output = transformIssueSelections(...);
    const valid = validateSchema(output, DOC_GEN_CONTRACT);
    expect(valid).toBe(true);
});
```
- Pros: Fast, explicit contract
- Cons: Must maintain schema definition

**Option D: TypeScript Shared Interfaces**
```typescript
// shared/types/doc-gen-format.ts
export interface PlaintiffDiscovery {
    VerminIssue: boolean;
    Vermin: string[];
    InsectIssues: boolean;
    Insects: string[];
    // ... complete interface
}

// Use in both places
// services/form-transformer.js
function extractIssueData(...): PlaintiffDiscovery { ... }

// routes/forms.js
function transformIssueSelections(...): PlaintiffDiscovery { ... }
```
- Pros: Type safety enforces compatibility
- Cons: Requires TypeScript in backend (or JSDoc)

**Recommendation:**
Combination of Option A (fast unit test) + Option B (one comprehensive E2E test that runs in CI). Unit test catches most issues quickly, E2E test catches edge cases.

**Why This Matters:**
- Prevents silent failures in Phase 4
- Determines testing strategy
- Affects refactoring safety

**YOUR ANSWER:**
```
[Combination]
```

---

### Question 15: Photo Storage Strategy

**The Question:**
Where should we store photo files uploaded with intakes, and what should the `photos` JSONB field contain?

**Context:**
The plan includes photo uploads for intake forms:

```sql
CREATE TABLE intake_issue_metadata (
    -- ...
    photos JSONB DEFAULT '[]'::jsonb,
    -- ...
);
```

Clients can upload photos showing issues (e.g., photo of rats, photo of broken outlet, etc.).

**Schema Question:**
What data structure goes in the `photos` JSONB field?

**Option 1: File Paths**
```json
{
    "photos": [
        "/uploads/intakes/2025/01/uuid-123-vermin-photo1.jpg",
        "/uploads/intakes/2025/01/uuid-123-vermin-photo2.jpg"
    ]
}
```

**Option 2: Rich Metadata**
```json
{
    "photos": [
        {
            "id": "photo-uuid-1",
            "filename": "kitchen_rats.jpg",
            "url": "/uploads/intakes/2025/01/uuid-123-vermin-photo1.jpg",
            "uploadedAt": "2025-01-21T10:30:00Z",
            "size": 2458624,
            "mimeType": "image/jpeg",
            "caption": "Rats seen behind stove"
        }
    ]
}
```

**Storage Options:**

**Option A: Local Filesystem**
```javascript
// routes/intakes-jsonb.js
const multer = require('multer');
const storage = multer.diskStorage({
    destination: './uploads/intakes/',
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

router.post('/upload-photo', upload.single('photo'), (req, res) => {
    res.json({
        url: `/uploads/intakes/${req.file.filename}`
    });
});
```

**Pros:**
- Simple to implement
- No external dependencies
- Fast for local dev

**Cons:**
- Not suitable for production at scale
- Lost if server restarts (unless using volumes)
- Can't easily share between multiple servers
- Backup complexity

**Option B: Cloud Storage (AWS S3, Google Cloud Storage, etc.)**
```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    const key = `intakes/${Date.now()}-${req.file.originalname}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: 'lipton-legal-uploads',
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    }));

    const url = `https://lipton-legal-uploads.s3.amazonaws.com/${key}`;
    res.json({ url });
});
```

**Pros:**
- Production-ready
- Scalable
- Built-in backup/redundancy
- CDN integration possible

**Cons:**
- Requires cloud account setup
- Costs money (usually cheap)
- More complex for local dev

**Option C: Database BYTEA (Not Recommended)**
```sql
ALTER TABLE intake_issue_metadata
ADD COLUMN photo_files BYTEA[];
```

**Pros:**
- Everything in one place
- Transactional with other data

**Cons:**
- Poor performance for large files
- Bloats database backups
- Makes DB migrations slow
- Generally considered an anti-pattern

**Option D: Placeholder for Later**
```sql
-- Keep photos JSONB field as placeholder
-- Set empty array for now: '[]'::jsonb
-- Implement actual storage in Phase 6 or later
```

**Pros:**
- Don't block current development
- Can choose storage after testing other parts

**Cons:**
- Feature incomplete
- May need schema changes later

**Recommendation for Local Dev:**
Option D (Placeholder) or Option A (Local filesystem) for now. Defer cloud storage (Option B) until production deployment.

**For View Windows:**
If storing photos, they should display in the "view window" metadata section when attorneys load an intake into doc gen:

```javascript
// In load-intake-modal.js
<div class="issue-photos">
    <h4>Photos</h4>
    {metadata.photos.map(photo => (
        <img src={photo.url} alt="Issue evidence" />
    ))}
</div>
```

**Size Limits:**
Need to decide:
- Max file size per photo? (e.g., 5MB)
- Max photos per category? (e.g., 10 photos)
- Total upload limit per intake? (e.g., 50MB)

**Why This Matters:**
- Affects Phase 1.4 schema design
- Determines infrastructure needs
- Impacts Phase 4.3 view window implementation

**YOUR ANSWER:**
```
[Your decision here:
- Storage method: A
- JSONB structure:rich metadata
- Size limits: Max per intake
- Timeline: defer?
]
```

---

## 🟢 NICE TO HAVE: UX & Future Considerations

These can be decided later, but documenting for completeness.

### Question 10: Intake List Pagination

**Brief Context:**
When attorneys open "Load from Intake" modal, they see a list of available intakes. With 1000+ intakes, this list needs pagination or filtering.

**Quick Decision:**
For Phase 4.3 implementation, should we:
- Show all intakes (if count is low during dev)
- Implement basic pagination (20 per page)
- Add search/filter by client name
- Add filter by date range

**YOUR ANSWER:**
```
[Think this is already handleded no?]
```

---

### Question 11: Visual Styling Consistency

**Brief Context:**
Do intake (client-facing) and doc gen (attorney-facing) forms need identical CSS styling, or just identical checkbox order?

**Quick Decision:**
- **Identical:** Same colors, fonts, spacing, branding
- **Consistent:** Same checkbox positions/order, but different page styling

**YOUR ANSWER:**
```
[identical]
```

---

### Question 12: Access Control

**Brief Context:**
Should attorneys see all intakes firm-wide, or only intakes assigned to them?

**Quick Decision (for schema design):**
```sql
-- If per-attorney:
ALTER TABLE client_intakes ADD COLUMN assigned_attorney_id UUID;

-- If firm-wide:
-- No additional column needed
```

**YOUR ANSWER:**
```
[Firm-wide for now]
```

---

### Question 13: Reload Behavior

**Brief Context:**
If attorney loads an intake, makes edits, then tries to reload the same intake again, should we:
- Warn before overwriting changes
- Silently overwrite
- Disable reload after first load

**YOUR ANSWER:**
```
[Warn before overwriting changes]
```

---

### Question 14: Feature Flag Storage

**Brief Context:**
`USE_NEW_INTAKE_SCHEMA` environment variable controls which schema to use. For production, should this be:
- Environment variable (requires redeploy to toggle)
- Database config table (can toggle without redeploy)
- Not worried about it yet (YAGNI)

**YOUR ANSWER:**
```
[idk]
```

---

## Summary of Decisions Needed

**Before starting Phase 1, we need answers to:**

| # | Question | Impact | Priority |
|---|----------|--------|----------|
| 1 | Taxonomy governance | Workflow coordination | 🔴 CRITICAL |
| 3 | Delete protection | Data safety | 🔴 CRITICAL |
| 4 | Typo prevention | Data integrity | 🔴 CRITICAL |
| 5 | Mapping sync strategy | Developer experience | 🟡 IMPORTANT |
| 7 | FormTransformer testing | Integration safety | 🟡 IMPORTANT |
| 15 | Photo storage | Schema design | 🔴 CRITICAL |

**Can defer to later phases:**
- Questions 10, 11, 12, 13, 14 (UX details)

---

## Next Steps

Once you provide answers to the critical questions (1, 3, 4, 15) and important questions (5, 7), I will:

1. Update [INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md](./INTAKE_DOCGEN_UNIFICATION_PLAN_V2.md) with your decisions
2. Create detailed implementation specs for Phase 1
3. Begin Phase 1.1 (Audit & Verification)

**Please fill in your answers in the `YOUR ANSWER:` sections above.**
