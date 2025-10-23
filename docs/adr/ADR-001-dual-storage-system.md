# ADR-001: Dual Storage System (JSON Files + PostgreSQL)

## Status

**Accepted**

Date: 2025-01-15

## Context

The legal form application needs to store submitted form data reliably while maintaining data integrity and enabling complex queries. Initial requirements included:

- Store complete form submissions with all plaintiff/defendant details
- Support complex relational queries (e.g., "find all cases with multiple plaintiffs")
- Maintain raw form data for audit purposes
- Enable easy backup and recovery
- Support future data migration needs
- Provide fast read access for document generation

### Constraints

- Forms can have 1-10 plaintiffs with 19 issue categories each
- Need to support both normalized and raw data formats
- Must handle concurrent submissions without data loss
- Budget constraints favor open-source solutions
- Team has experience with both file storage and SQL databases

## Decision

**We will implement a dual storage system that saves each form submission to both:**

1. **JSON files** in Cloud Storage (or local filesystem in development)
2. **PostgreSQL database** with normalized relational schema

Both storage mechanisms are written to atomically within the same request handler. If either write fails, the entire operation is rolled back.

## Rationale

### Why Both Storage Types?

**JSON Files provide:**
- **Immutable audit trail** - Exact snapshot of what user submitted
- **Easy backup/restore** - Simple file copy operations
- **Schema flexibility** - Can store any form structure without migrations
- **Human-readable format** - Can inspect with any text editor
- **Simple archival** - Move old files to cold storage easily

**PostgreSQL provides:**
- **Efficient queries** - Find cases by any field combination
- **Data integrity** - Foreign key constraints prevent orphaned records
- **Transactions** - ACID guarantees for related records
- **Aggregations** - Count plaintiffs per case, issues per plaintiff, etc.
- **Normalization** - Reduce data duplication and ensure consistency

### Why PostgreSQL over NoSQL?

- **Relational data model** - Cases → Plaintiffs → Issues is naturally relational
- **ACID transactions** - Need strong consistency guarantees
- **Complex queries** - SQL is ideal for multi-table joins
- **Data integrity** - Foreign keys prevent invalid references
- **Team expertise** - Developers familiar with PostgreSQL

## Alternatives Considered

### Alternative 1: PostgreSQL Only

**Pros:**
- Single source of truth
- No synchronization complexity
- Simpler codebase
- Lower storage costs

**Cons:**
- Lose raw form data if schema changes
- Harder to audit exact user submissions
- Difficult to recover from database corruption
- Complex migrations when adding fields

**Why rejected:**
Legal applications require immutable audit trails. Schema changes shouldn't affect historical data integrity.

### Alternative 2: JSON Files Only

**Pros:**
- Extremely simple implementation
- No database setup required
- Easy backup (just copy files)
- Schema-less flexibility

**Cons:**
- Poor query performance (must scan all files)
- No data integrity enforcement
- Difficult to find relationships between records
- No transaction support
- Scales poorly with thousands of submissions

**Why rejected:**
Can't efficiently answer queries like "How many cases have plaintiff X?" or "Which cases have fire hazard issues?"

### Alternative 3: MongoDB (Document Database)

**Pros:**
- Schema flexibility like JSON
- Better query performance than flat files
- Supports nested documents naturally
- Horizontal scaling

**Cons:**
- Weaker consistency guarantees than PostgreSQL
- Team less experienced with MongoDB
- Harder to enforce data integrity
- More expensive to run on GCP
- Still need file storage for audit trail

**Why rejected:**
PostgreSQL's ACID properties and relational model better match our requirements. MongoDB's advantages (flexibility, scale) aren't critical for our use case (<10K submissions/month).

## Consequences

### Positive

✅ **Data redundancy** - If database corrupts, can rebuild from JSON files
✅ **Audit compliance** - Immutable record of exactly what user submitted
✅ **Query flexibility** - Can run complex SQL queries efficiently
✅ **Schema evolution** - Can update database schema without losing historical data
✅ **Development speed** - Can inspect JSON files directly during debugging
✅ **Disaster recovery** - Multiple recovery paths (database backup OR file restore)

### Negative

❌ **Storage overhead** - Data stored twice (JSON + database)
❌ **Code complexity** - Must handle writes to both systems
❌ **Sync risk** - Possibility of JSON and database getting out of sync
❌ **Increased costs** - Pay for both Cloud Storage and Cloud SQL

### Neutral

⚖️ **Write performance** - Parallel writes to storage and database take ~same time as single write
⚖️ **Backup complexity** - Need to backup both systems, but each can restore the other
⚖️ **Testing** - Need to test both storage paths, but increases confidence

## Implementation Notes

### Write Path

```javascript
// server.js
async function saveFormSubmission(formData) {
    const filename = `form-entry-${caseId}.json`;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Save to database (normalized)
        const caseResult = await client.query(
            'INSERT INTO cases (case_number, ...) VALUES ($1, ...) RETURNING id',
            [formData.caseNumber, ...]
        );

        // 2. Save plaintiffs and defendants
        for (const plaintiff of formData.plaintiffs) {
            await client.query('INSERT INTO parties (...) VALUES (...)', [...]);
        }

        // 3. Save to Cloud Storage (raw JSON)
        await saveFormData(filename, formData);

        await client.query('COMMIT');
        return { success: true, caseId, filename };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### Recovery from JSON

```bash
# Rebuild database from JSON files
for file in data/*.json; do
    curl -X POST http://localhost:3000/api/form-entries/import \
        -H "Content-Type: application/json" \
        -d @"$file"
done
```

### Database Schema

```sql
-- Normalized relational schema
CREATE TABLE cases (
    id VARCHAR(255) PRIMARY KEY,
    case_number VARCHAR(255),
    property_address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    -- ...
);

CREATE TABLE parties (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    party_type VARCHAR(50), -- 'plaintiff' or 'defendant'
    full_name TEXT,
    -- ...
);

CREATE TABLE party_issue_selections (
    id SERIAL PRIMARY KEY,
    party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
    issue_category VARCHAR(100),
    issue_value TEXT
);
```

## References

- [Database Schema](../reference/data_model.md)
- [File Storage Abstraction](../../server.js#L247-L323)
- [Form Transformation Logic](../../server.js#L480-L950)
- [Cloud Storage Setup](../deployment/DEPLOYMENT_GUIDE.md#phase-6-cloud-storage-setup)

## Metadata

- **Author:** Development Team
- **Reviewers:** Architecture Team, Database Admin
- **Last Updated:** 2025-01-15
- **Supersedes:** N/A
- **Superseded by:** N/A

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-15 | Development Team | Initial version |
