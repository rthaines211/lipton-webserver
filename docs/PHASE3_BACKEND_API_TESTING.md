# Phase 3 Backend API - Testing Guide

## ✅ Backend Implementation Complete

The contingency agreement backend API has been implemented with full CRUD operations and database integration.

---

## What Was Implemented

### 1. Database Schema ✅
**File**: `migrations/003_create_contingency_agreements_table.sql`

**Tables Created**:
- `contingency_agreements` - Main case table
- `contingency_plaintiffs` - Plaintiff information
- `contingency_defendants` - Defendant information

**Key Features**:
- Cascading deletes (delete case → delete all plaintiffs/defendants)
- JSONB storage for raw form data
- Document generation status tracking
- Notification settings
- Performance indexes

### 2. API Routes ✅
**File**: `routes/contingency.js`

**Endpoints Available**:
- `POST /api/contingency-entries` - Create new agreement
- `GET /api/contingency-entries` - List all agreements
- `GET /api/contingency-entries/:caseId` - Get specific agreement
- `PUT /api/contingency-entries/:caseId` - Update agreement
- `DELETE /api/contingency-entries/:caseId` - Delete agreement

### 3. Data Transformer ✅
**File**: `services/contingency-transformer.js`

**Features**:
- Extracts plaintiffs and defendants from form data
- Formats addresses with unit numbers
- Handles minor/guardian relationships
- Prepares data for docxtemplater templates
- Generates file-safe names for documents

---

## Testing the API Endpoints

### Test 1: Create Contingency Agreement

**Endpoint**: `POST /api/contingency-entries`

**Sample Request**:
```bash
curl -X POST http://localhost:3000/api/contingency-entries \
  -H "Content-Type: application/json" \
  -d '{
    "property-address": "123 Main Street, Los Angeles, CA 90001",
    "plaintiffCount": 2,
    "plaintiff-1-first-name": "John",
    "plaintiff-1-last-name": "Doe",
    "plaintiff-1-address": "123 Main St",
    "plaintiff-1-unit": "Apt 5",
    "plaintiff-1-email": "john.doe@example.com",
    "plaintiff-1-phone": "(555) 123-4567",
    "plaintiff-1-is-minor": false,
    "plaintiff-2-first-name": "Jane",
    "plaintiff-2-last-name": "Doe",
    "plaintiff-2-address": "123 Main St",
    "plaintiff-2-unit": "Apt 5",
    "plaintiff-2-email": "jane.doe@example.com",
    "plaintiff-2-phone": "(555) 987-6543",
    "plaintiff-2-is-minor": true,
    "plaintiff-2-guardian": "1",
    "defendantCount": 1,
    "defendant-1-first-name": "Bob",
    "defendant-1-last-name": "Smith",
    "notificationEmail": "lawyer@example.com",
    "notificationName": "Legal Team"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "id": "CA-1768353580408-s57ez1jaq",
  "dbCaseId": "CA-1768353580408-s57ez1jaq",
  "message": "Contingency agreement submitted successfully"
}
```

### Test 2: Get Specific Agreement

**Endpoint**: `GET /api/contingency-entries/:caseId`

**Sample Request**:
```bash
curl http://localhost:3000/api/contingency-entries/CA-1768353580408-s57ez1jaq
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "agreement": {
      "id": 1,
      "case_id": "CA-1768353580408-s57ez1jaq",
      "property_address": "123 Main Street, Los Angeles, CA 90001",
      "submitted_at": "2026-01-14T01:19:40.408Z",
      "document_status": "pending",
      "notification_email": "lawyer@example.com",
      "notification_name": "Legal Team"
    },
    "plaintiffs": [
      {
        "id": 1,
        "plaintiff_index": 1,
        "first_name": "John",
        "last_name": "Doe",
        "address": "123 Main St",
        "unit_number": "Apt 5",
        "email": "john.doe@example.com",
        "phone": "(555) 123-4567",
        "is_minor": false,
        "guardian_plaintiff_id": null
      },
      {
        "id": 2,
        "plaintiff_index": 2,
        "first_name": "Jane",
        "last_name": "Doe",
        "is_minor": true,
        "guardian_plaintiff_id": 1
      }
    ],
    "defendants": [
      {
        "id": 1,
        "defendant_index": 1,
        "first_name": "Bob",
        "last_name": "Smith"
      }
    ]
  }
}
```

### Test 3: List All Agreements

**Endpoint**: `GET /api/contingency-entries`

**Sample Request**:
```bash
curl http://localhost:3000/api/contingency-entries
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "case_id": "CA-1768353580408-s57ez1jaq",
      "property_address": "123 Main Street, Los Angeles, CA 90001",
      "submitted_at": "2026-01-14T01:19:40.408Z",
      "document_status": "pending",
      "plaintiff_count": "2",
      "defendant_count": "1"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Test 4: Update Agreement

**Endpoint**: `PUT /api/contingency-entries/:caseId`

**Sample Request**:
```bash
curl -X PUT http://localhost:3000/api/contingency-entries/CA-1768353580408-s57ez1jaq \
  -H "Content-Type: application/json" \
  -d '{
    "property-address": "456 Oak Avenue, Los Angeles, CA 90002",
    "plaintiffCount": 1,
    "plaintiff-1-first-name": "John",
    "plaintiff-1-last-name": "Doe",
    "plaintiff-1-address": "456 Oak Ave",
    "plaintiff-1-email": "john.updated@example.com",
    "plaintiff-1-phone": "(555) 111-2222",
    "defendantCount": 1,
    "defendant-1-first-name": "Bob",
    "defendant-1-last-name": "Smith"
  }'
```

### Test 5: Delete Agreement

**Endpoint**: `DELETE /api/contingency-entries/:caseId`

**Sample Request**:
```bash
curl -X DELETE http://localhost:3000/api/contingency-entries/CA-1768353580408-s57ez1jaq
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Contingency agreement deleted successfully"
}
```

---

## Testing the Data Transformer

**Test Script**:
```javascript
const ContingencyTransformer = require('./services/contingency-transformer');

const rawData = {
  "property-address": "123 Main Street",
  "plaintiffCount": 1,
  "plaintiff-1-first-name": "John",
  "plaintiff-1-last-name": "Doe",
  "plaintiff-1-address": "123 Main St",
  "plaintiff-1-unit": "Apt 5",
  "plaintiff-1-email": "john@example.com",
  "plaintiff-1-phone": "(555) 123-4567",
  "defendantCount": 1,
  "defendant-1-first-name": "Bob",
  "defendant-1-last-name": "Smith"
};

const transformed = ContingencyTransformer.transform(rawData);
console.log(JSON.stringify(transformed, null, 2));

// Get template data for document generation
const templateData = ContingencyTransformer.prepareTemplateData(transformed.plaintiffs[0]);
console.log(JSON.stringify(templateData, null, 2));
```

**Expected Output**:
```json
{
  "Plaintiff Full Name": "John Doe",
  "Plaintiff Full Address": "123 Main St Unit Apt 5",
  "Plaintiff Email Address": "john@example.com",
  "Plaintiff Phone Number": "(555) 123-4567"
}
```

---

## Database Verification

### Check Tables Created:
```sql
\dt contingency*
```

**Expected Output**:
```
                          List of relations
 Schema |           Name            | Type  |    Owner
--------+---------------------------+-------+-------------
 public | contingency_agreements    | table | ryanhaines
 public | contingency_defendants    | table | ryanhaines
 public | contingency_plaintiffs    | table | ryanhaines
```

### Query Data:
```sql
SELECT ca.case_id, ca.property_address, COUNT(cp.id) as plaintiff_count
FROM contingency_agreements ca
LEFT JOIN contingency_plaintiffs cp ON ca.case_id = cp.case_id
GROUP BY ca.case_id, ca.property_address;
```

---

## Integration with Server

**Updated Files**:
1. `server.js` - Added contingency routes import and mounting
2. `routes/contingency.js` - Complete CRUD API
3. `services/contingency-transformer.js` - Data transformation
4. `migrations/003_create_contingency_agreements_table.sql` - Database schema

**Server Logs to Check**:
```bash
tail -f /tmp/server-phase3-test.log | grep -i contingency
```

---

## Test Results ✅

### ✅ Test 1: Create Agreement
- POST endpoint working
- Data stored in database
- Plaintiffs and defendants extracted correctly
- Case ID generated properly

### ✅ Test 2: Retrieve Agreement
- GET specific endpoint working
- Returns agreement with plaintiffs and defendants
- Data integrity maintained

### ✅ Test 3: List Agreements
- GET list endpoint working
- Pagination working
- Aggregate counts (plaintiff_count, defendant_count) working

### ✅ Test 4: Data Transformer
- Extracts plaintiffs correctly
- Formats addresses with unit numbers
- Handles minor/guardian relationships
- Prepares template data for docxtemplater

---

## Next Steps

**Phase 4**: Frontend Implementation
- Create contingency agreement form HTML
- Implement form JavaScript for dynamic plaintiff/defendant addition
- Add form submission logic
- Style form with Lipton Legal branding

**Status**: ✅ Phase 3 Complete - Ready for Phase 4
**Last Updated**: 2026-01-13
