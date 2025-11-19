# Week 2 Action Plan - Intake Submission API

**Branch:** `dev/intake-system`
**Duration:** 5 days (estimated)
**Goal:** Build complete intake form submission API with file uploads

---

## Overview

Week 2 focuses on creating the HTTP API layer for the intake system. We'll build REST endpoints, implement CRUD operations, add file upload support, and generate unique intake numbers.

**By End of Week 2:**
- ✅ REST API for intake submissions
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ File upload endpoint with validation
- ✅ Automatic intake number generation (INT-YYYY-#####)
- ✅ Comprehensive API tests
- ✅ Postman collection for testing

---

## Day 1: Intake Routes & Create Operation

### Morning: Route Setup (2-3 hours)

**Create File:** `routes/intake.js`

**Endpoints to Implement:**
```javascript
POST   /api/intake/submit      - Create new intake submission
GET    /api/intake/:id         - Get specific intake by ID
GET    /api/intake             - List all intakes (with pagination)
PUT    /api/intake/:id         - Update intake submission
DELETE /api/intake/:id         - Soft delete intake
```

**Initial Focus:** POST endpoint only

**Middleware Stack:**
```javascript
router.post('/submit',
  validation.validateRequired([
    'first_name',
    'last_name',
    'client_email',
    'client_phone',
    'current_street_address'
  ]),
  validation.validateEmailField('client_email'),
  validation.sanitizeInput(),
  asyncHandler(async (req, res) => {
    // Call IntakeService
  })
);
```

### Afternoon: Create Operation Implementation (3-4 hours)

**Enhance File:** `services/intake-service.js`

**Implement Method:**
```javascript
static async createIntake(intakeData) {
  // 1. Validate data completeness
  // 2. Generate intake number (INT-2025-00001)
  // 3. Insert into intake_submissions table
  // 4. Insert related data (client, property, case parties)
  // 5. Create Dropbox folder
  // 6. Send confirmation email
  // 7. Return intake object with ID and intake number
}
```

**Database Transaction:**
```javascript
const client = await databaseService.getClient();
try {
  await client.query('BEGIN');

  // Insert intake_submissions
  const intakeResult = await client.query(
    'INSERT INTO intake_submissions (...) VALUES (...) RETURNING id',
    [...]
  );

  // Insert intake_clients
  await client.query(
    'INSERT INTO intake_clients (...) VALUES (...)',
    [...]
  );

  // Insert intake_properties
  // ...

  await client.query('COMMIT');
  return intakeResult.rows[0];
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Testing:**
```bash
# Test with curl
curl -X POST http://localhost:3000/api/intake/submit \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "client_email": "john@example.com",
    "client_phone": "(555) 123-4567",
    "current_street_address": "123 Main Street"
  }'
```

**Success Criteria:**
- ✅ POST endpoint creates intake in database
- ✅ Intake number generated correctly
- ✅ Related tables populated
- ✅ Dropbox folder created
- ✅ Confirmation email sent
- ✅ Returns 201 with intake object

**Deliverables:**
- `routes/intake.js` (initial version)
- `IntakeService.createIntake()` implementation
- Manual test results documented

**Commit Message:**
```
feat: Implement intake submission endpoint and create operation

- Add POST /api/intake/submit route with validation
- Implement IntakeService.createIntake() with transactions
- Generate unique intake numbers (INT-YYYY-#####)
- Create Dropbox folder and send confirmation email
- Add comprehensive error handling
```

---

## Day 2: Read Operations & Pagination

### Morning: Get Single Intake (2 hours)

**Implement GET Endpoint:**
```javascript
router.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const intake = await IntakeService.getIntakeById(id);

    if (!intake) {
      throw createNotFoundError('Intake', id);
    }

    res.json(intake);
  })
);
```

**Implement Service Method:**
```javascript
static async getIntakeById(id) {
  // Join with related tables to get complete data
  const result = await databaseService.query(`
    SELECT
      i.*,
      c.first_name, c.last_name, c.email, c.phone,
      p.street_address, p.city, p.state, p.zip_code,
      json_agg(cp.*) as case_parties
    FROM intake_submissions i
    LEFT JOIN intake_clients c ON i.id = c.intake_id
    LEFT JOIN intake_properties p ON i.id = p.intake_id
    LEFT JOIN intake_case_parties cp ON i.id = cp.intake_id
    WHERE i.id = $1 AND i.is_active = true
    GROUP BY i.id, c.id, p.id
  `, [id]);

  return result.rows[0] || null;
}
```

### Afternoon: List with Pagination (3 hours)

**Implement List Endpoint:**
```javascript
router.get('/',
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      search
    } = req.query;

    const result = await IntakeService.listIntakes({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search
    });

    res.json(result);
  })
);
```

**Implement Service Method:**
```javascript
static async listIntakes({ page = 1, limit = 20, status, search }) {
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE i.is_active = true';
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND i.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (
      c.first_name ILIKE $${paramIndex} OR
      c.last_name ILIKE $${paramIndex} OR
      p.street_address ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await databaseService.query(`
    SELECT COUNT(*) as total
    FROM intake_submissions i
    LEFT JOIN intake_clients c ON i.id = c.intake_id
    LEFT JOIN intake_properties p ON i.id = p.intake_id
    ${whereClause}
  `, params);

  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const dataResult = await databaseService.query(`
    SELECT
      i.id, i.intake_number, i.status, i.created_at,
      c.first_name, c.last_name,
      p.street_address
    FROM intake_submissions i
    LEFT JOIN intake_clients c ON i.id = c.intake_id
    LEFT JOIN intake_properties p ON i.id = p.intake_id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

**Testing:**
```bash
# Get single intake
curl http://localhost:3000/api/intake/1

# List all intakes
curl http://localhost:3000/api/intake

# List with pagination
curl http://localhost:3000/api/intake?page=2&limit=10

# Search
curl http://localhost:3000/api/intake?search=Main%20Street

# Filter by status
curl http://localhost:3000/api/intake?status=pending
```

**Success Criteria:**
- ✅ GET /:id returns full intake data with related tables
- ✅ GET / returns paginated list
- ✅ Search works across name and address
- ✅ Status filtering works
- ✅ Pagination includes total count and pages
- ✅ 404 returned for non-existent intake

**Deliverables:**
- `IntakeService.getIntakeById()` implementation
- `IntakeService.listIntakes()` implementation with pagination
- GET endpoints tested

**Commit Message:**
```
feat: Add read operations with pagination and search

- Implement GET /api/intake/:id with full data joins
- Implement GET /api/intake with pagination
- Add search functionality (name, address)
- Add status filtering
- Return proper 404 for missing intakes
```

---

## Day 3: Update & Delete Operations

### Morning: Update Operation (3 hours)

**Implement PUT Endpoint:**
```javascript
router.put('/:id',
  validation.sanitizeInput(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const updatedIntake = await IntakeService.updateIntake(id, updates);

    if (!updatedIntake) {
      throw createNotFoundError('Intake', id);
    }

    res.json(updatedIntake);
  })
);
```

**Implement Service Method:**
```javascript
static async updateIntake(id, updates) {
  const client = await databaseService.getClient();

  try {
    await client.query('BEGIN');

    // Check if intake exists
    const checkResult = await client.query(
      'SELECT id FROM intake_submissions WHERE id = $1 AND is_active = true',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return null;
    }

    // Update intake_submissions if main fields changed
    if (updates.status || updates.attorney_notes) {
      await client.query(
        'UPDATE intake_submissions SET status = COALESCE($1, status), updated_at = NOW() WHERE id = $2',
        [updates.status, id]
      );
    }

    // Update intake_clients if client fields changed
    if (updates.first_name || updates.last_name || updates.client_email || updates.client_phone) {
      await client.query(
        `UPDATE intake_clients
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             email = COALESCE($3, email),
             phone = COALESCE($4, phone),
             updated_at = NOW()
         WHERE intake_id = $5`,
        [updates.first_name, updates.last_name, updates.client_email, updates.client_phone, id]
      );
    }

    // Update other related tables as needed...

    await client.query('COMMIT');

    // Return updated intake
    return await this.getIntakeById(id);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Afternoon: Delete Operation (2 hours)

**Implement DELETE Endpoint:**
```javascript
router.delete('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deleted = await IntakeService.deleteIntake(id);

    if (!deleted) {
      throw createNotFoundError('Intake', id);
    }

    res.status(204).send();
  })
);
```

**Implement Service Method (Soft Delete):**
```javascript
static async deleteIntake(id) {
  // Soft delete - mark as inactive instead of removing from database
  const result = await databaseService.query(
    `UPDATE intake_submissions
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND is_active = true
     RETURNING id`,
    [id]
  );

  return result.rows.length > 0;
}
```

**Testing:**
```bash
# Update intake
curl -X PUT http://localhost:3000/api/intake/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review", "first_name": "Jane"}'

# Delete intake (soft delete)
curl -X DELETE http://localhost:3000/api/intake/1

# Verify soft delete (should return 404)
curl http://localhost:3000/api/intake/1
```

**Success Criteria:**
- ✅ PUT /:id updates intake and related tables
- ✅ Partial updates work (only provided fields updated)
- ✅ Transactions ensure data consistency
- ✅ Returns updated intake object
- ✅ DELETE /:id performs soft delete
- ✅ Returns 204 No Content on success
- ✅ Deleted intakes don't appear in GET requests

**Deliverables:**
- `IntakeService.updateIntake()` implementation
- `IntakeService.deleteIntake()` implementation
- PUT and DELETE endpoints tested

**Commit Message:**
```
feat: Add update and delete operations for intakes

- Implement PUT /api/intake/:id with partial updates
- Implement DELETE /api/intake/:id with soft delete
- Use transactions for data consistency
- Handle related table updates
- Return proper status codes (200, 204, 404)
```

---

## Day 4: File Upload Endpoint

### Morning: File Upload Route (3 hours)

**Install Multer for File Uploads:**
```bash
npm install multer
```

**Create Upload Configuration:**
```javascript
// In routes/intake.js
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});
```

**Implement Upload Endpoint:**
```javascript
router.post('/:id/documents',
  upload.array('files', 10), // Accept up to 10 files
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { document_type = 'additional-files' } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      throw createValidationError('No files provided', 'files');
    }

    const result = await IntakeService.uploadDocuments(id, files, document_type);

    res.status(201).json(result);
  })
);
```

### Afternoon: Document Upload Service (2-3 hours)

**Implement Service Method:**
```javascript
static async uploadDocuments(intakeId, files, documentType) {
  // 1. Get intake to get client folder path
  const intake = await this.getIntakeById(intakeId);

  if (!intake) {
    throw new Error(`Intake ${intakeId} not found`);
  }

  const streetAddress = intake.current_street_address;
  const fullName = `${intake.first_name} ${intake.last_name}`;

  // 2. Upload files to Dropbox
  const uploadResults = [];
  const dbRecords = [];

  for (const file of files) {
    // Validate file
    const validation = storageService.validateFileUpload(file, documentType);

    if (!validation.valid) {
      uploadResults.push({
        filename: file.originalname,
        success: false,
        error: validation.error
      });
      continue;
    }

    // Upload to Dropbox
    try {
      const dropboxResult = await storageService.uploadIntakeDocument(
        streetAddress,
        fullName,
        file,
        documentType
      );

      // Record in database
      const dbResult = await databaseService.query(
        `INSERT INTO intake_documents
         (intake_id, document_type, file_name, file_size, file_path, dropbox_path, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [
          intakeId,
          documentType,
          file.originalname,
          file.size,
          dropboxResult.path,
          dropboxResult.dropboxPath,
          'system' // TODO: Replace with actual user ID when auth is implemented
        ]
      );

      uploadResults.push({
        filename: file.originalname,
        success: true,
        documentId: dbResult.rows[0].id,
        dropboxPath: dropboxResult.dropboxPath
      });

    } catch (error) {
      uploadResults.push({
        filename: file.originalname,
        success: false,
        error: error.message
      });
    }
  }

  return {
    intakeId,
    uploaded: uploadResults.filter(r => r.success).length,
    failed: uploadResults.filter(r => !r.success).length,
    results: uploadResults
  };
}
```

**Testing:**
```bash
# Upload single file
curl -X POST http://localhost:3000/api/intake/1/documents \
  -F "files=@/path/to/document.pdf" \
  -F "document_type=identification"

# Upload multiple files
curl -X POST http://localhost:3000/api/intake/1/documents \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/doc2.jpg" \
  -F "document_type=supporting-docs"
```

**Success Criteria:**
- ✅ Accepts multiple file uploads (up to 10)
- ✅ Validates file types and sizes
- ✅ Uploads to correct Dropbox folder
- ✅ Records uploads in intake_documents table
- ✅ Returns detailed results (success/failure per file)
- ✅ Handles errors gracefully (some files fail, others succeed)

**Deliverables:**
- File upload endpoint with multer
- `IntakeService.uploadDocuments()` implementation
- File upload tested with various file types

**Commit Message:**
```
feat: Add file upload endpoint for intake documents

- Install and configure multer for file uploads
- Add POST /api/intake/:id/documents endpoint
- Implement IntakeService.uploadDocuments()
- Validate file types and sizes
- Upload to Dropbox and record in database
- Support batch uploads (up to 10 files)
- Return detailed success/failure per file
```

---

## Day 5: Testing, Documentation & Polish

### Morning: API Testing (3 hours)

**Create API Test File:** `tests/api/intake-routes.test.js`

**Test Structure:**
```javascript
const request = require('supertest');
const app = require('../../server'); // Export app from server.js

describe('Intake API', () => {
  let createdIntakeId;

  describe('POST /api/intake/submit', () => {
    it('should create new intake submission', async () => {
      const response = await request(app)
        .post('/api/intake/submit')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          client_email: 'john@example.com',
          client_phone: '(555) 123-4567',
          current_street_address: '123 Main Street'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('intake_number');
      expect(response.body.intake_number).toMatch(/^INT-\d{4}-\d{5}$/);

      createdIntakeId = response.body.id;
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/intake/submit')
        .send({ first_name: 'John' })
        .expect(400);
    });

    it('should reject invalid email', async () => {
      await request(app)
        .post('/api/intake/submit')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          client_email: 'not-an-email',
          client_phone: '(555) 123-4567',
          current_street_address: '123 Main Street'
        })
        .expect(400);
    });
  });

  describe('GET /api/intake/:id', () => {
    it('should return intake by ID', async () => {
      const response = await request(app)
        .get(`/api/intake/${createdIntakeId}`)
        .expect(200);

      expect(response.body.id).toBe(createdIntakeId);
      expect(response.body).toHaveProperty('first_name');
    });

    it('should return 404 for non-existent intake', async () => {
      await request(app)
        .get('/api/intake/99999')
        .expect(404);
    });
  });

  describe('GET /api/intake', () => {
    it('should return paginated list', async () => {
      const response = await request(app)
        .get('/api/intake?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('PUT /api/intake/:id', () => {
    it('should update intake', async () => {
      const response = await request(app)
        .put(`/api/intake/${createdIntakeId}`)
        .send({ status: 'in_review' })
        .expect(200);

      expect(response.body.status).toBe('in_review');
    });
  });

  describe('DELETE /api/intake/:id', () => {
    it('should soft delete intake', async () => {
      await request(app)
        .delete(`/api/intake/${createdIntakeId}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/intake/${createdIntakeId}`)
        .expect(404);
    });
  });
});
```

**Run Tests:**
```bash
npm test -- tests/api/intake-routes.test.js
```

### Afternoon: Documentation & Postman Collection (2-3 hours)

**Create API Documentation:** `docs/INTAKE_API.md`

**Contents:**
- Endpoint list with descriptions
- Request/response examples for each endpoint
- Error codes and meanings
- Authentication requirements (for future)
- Rate limiting (for future)

**Create Postman Collection:** `postman/intake-api.postman_collection.json`

**Include:**
- Environment variables (base URL, sample IDs)
- All endpoints with sample requests
- Pre-request scripts (if needed)
- Tests (validate responses)

**Export from Postman:**
1. Create collection in Postman
2. Add all requests with examples
3. Export as JSON
4. Commit to repo

**Update Main Documentation:**
- Update `WEEK_2_PROGRESS.md`
- Create `WEEK_2_SUMMARY.md`
- Update `README.md` with API section

**Success Criteria:**
- ✅ API tests written and passing
- ✅ Test coverage > 80% for routes
- ✅ API documentation complete
- ✅ Postman collection ready to import
- ✅ All code reviewed and polished

**Deliverables:**
- API test suite
- API documentation
- Postman collection
- Week 2 summary document

**Commit Message:**
```
test: Add comprehensive API tests and documentation

- Create intake routes test suite with supertest
- Add tests for all CRUD operations
- Add tests for file uploads
- Create API documentation (docs/INTAKE_API.md)
- Create Postman collection for manual testing
- Update week progress documentation
```

---

## Week 2 Success Criteria

### Functional Requirements
- ✅ Create intake via POST /api/intake/submit
- ✅ Read single intake via GET /api/intake/:id
- ✅ List intakes with pagination via GET /api/intake
- ✅ Update intake via PUT /api/intake/:id
- ✅ Delete intake (soft) via DELETE /api/intake/:id
- ✅ Upload files via POST /api/intake/:id/documents
- ✅ Automatic intake number generation (INT-YYYY-#####)

### Technical Requirements
- ✅ Database transactions for data consistency
- ✅ Input validation on all endpoints
- ✅ Proper HTTP status codes (200, 201, 204, 400, 404, 500)
- ✅ Error handling with detailed messages
- ✅ File upload with type/size validation
- ✅ Pagination for list endpoint
- ✅ Search and filtering capabilities

### Quality Requirements
- ✅ API test coverage > 80%
- ✅ All endpoints tested manually
- ✅ API documentation complete
- ✅ Postman collection ready
- ✅ Zero breaking changes from Week 1
- ✅ Code review completed

---

## File Structure (End of Week 2)

```
routes/
  ├── health.js          (Week 1)
  └── intake.js          (NEW - Week 2)

services/
  ├── database.js        (Week 1)
  ├── storage-service.js (Week 1)
  └── intake-service.js  (Enhanced - Week 2)

tests/
  ├── integration/
  │   └── week1-integration-tests.js (Week 1)
  └── api/
      └── intake-routes.test.js      (NEW - Week 2)

docs/
  └── INTAKE_API.md      (NEW - Week 2)

postman/
  └── intake-api.postman_collection.json (NEW - Week 2)
```

---

## Risk Mitigation

### Potential Risks

**Risk 1: Transaction Deadlocks**
- **Mitigation:** Keep transactions short, acquire locks in consistent order
- **Fallback:** Implement retry logic with exponential backoff

**Risk 2: File Upload Failures**
- **Mitigation:** Validate before upload, handle Dropbox API errors
- **Fallback:** Return partial success (some files uploaded, some failed)

**Risk 3: Intake Number Collisions**
- **Mitigation:** Use database constraints, check before insert
- **Fallback:** Retry with timestamp-based number

**Risk 4: Breaking Changes**
- **Mitigation:** Comprehensive testing, backward compatibility checks
- **Fallback:** Rollback capability via git

---

## Key Metrics to Track

### Development Metrics
- Lines of code added (target: ~1,000-1,500)
- Functions created (target: 10-15)
- API endpoints implemented (target: 6)
- Test coverage (target: > 80%)

### Performance Metrics
- API response time (target: < 200ms for most endpoints)
- File upload time (acceptable: < 5s for 10MB file)
- Database query time (target: < 50ms)

### Quality Metrics
- Test pass rate (target: 100%)
- Code review issues (target: < 5 minor issues)
- Breaking changes (target: 0)
- Regressions (target: 0)

---

## Dependencies

### From Week 1 (Required)
- ✅ Database service
- ✅ Intake service (skeleton)
- ✅ Storage service
- ✅ Email service
- ✅ Validation middleware
- ✅ Error handler middleware

### New Dependencies
- `multer` - File upload handling
- `supertest` (dev) - API testing

---

## Next Steps After Week 2

### Week 3: Frontend Integration
- Create intake form UI
- Client-side validation
- File upload UI
- Success/error messaging
- Mobile responsiveness

### Week 4: Attorney Portal (Phase 1)
- Authentication/authorization
- Intake list view for attorneys
- Intake detail view
- Status management
- Note-taking interface

---

## Quick Reference

### Common Commands

```bash
# Start development server
npm start

# Run API tests
npm test tests/api/

# Run all tests
npm test

# Manual API testing with curl
curl -X POST http://localhost:3000/api/intake/submit \
  -H "Content-Type: application/json" \
  -d @test-data/sample-intake.json

# Check logs
tail -f logs/app.log
```

### Useful Database Queries

```sql
-- Check recent intakes
SELECT id, intake_number, status, created_at
FROM intake_submissions
ORDER BY created_at DESC
LIMIT 10;

-- Check intake number sequence
SELECT intake_number
FROM intake_submissions
WHERE intake_number LIKE 'INT-2025-%'
ORDER BY intake_number DESC
LIMIT 1;

-- Check soft deleted intakes
SELECT id, intake_number, is_active
FROM intake_submissions
WHERE is_active = false;
```

---

**Status:** ✅ Ready to Start
**Confidence Level:** 🟢 HIGH (solid Week 1 foundation)
**Estimated Completion:** 5 days
**Next Action:** Begin Day 1 - Intake Routes & Create Operation

---

*Created: November 17, 2025*
*Week 1 Complete - Week 2 Ready to Start*
