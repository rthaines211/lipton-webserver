# Architecture Decision Records (ADRs)

## What are ADRs?

Architecture Decision Records document significant architectural decisions made during the project's lifecycle. They capture:
- **What** decision was made
- **Why** it was made
- **What alternatives** were considered
- **What consequences** resulted

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](ADR-001-dual-storage-system.md) | Dual Storage System (JSON + PostgreSQL) | Accepted | 2025-01-15 |
| [ADR-002](ADR-002-gcp-cloud-run-deployment.md) | GCP Cloud Run for Deployment | Accepted | 2025-01-20 |
| [ADR-003](ADR-003-nginx-hybrid-cloud-architecture.md) | Nginx Hybrid Cloud Architecture | Accepted | 2025-10-23 |

### Planned ADRs (Not Yet Written)

| ADR | Title | Status | Notes |
|-----|-------|--------|-------|
| ADR-004 | Server-Sent Events for Progress Tracking | Proposed | Real-time document generation progress |
| ADR-005 | Dropbox Integration for Cloud Backup | Proposed | Optional cloud backup strategy |
| ADR-006 | Python FastAPI for Data Normalization | Proposed | ETL pipeline architecture |

## Template

Use this template for new ADRs: [ADR-TEMPLATE.md](ADR-TEMPLATE.md)

## Status Definitions

- **Proposed** - Decision is under consideration
- **Accepted** - Decision has been approved and implemented
- **Deprecated** - Decision is no longer recommended
- **Superseded** - Decision has been replaced by another ADR

## How to Create an ADR

1. Copy the template: `cp docs/adr/ADR-TEMPLATE.md docs/adr/ADR-XXX-short-title.md`
2. Fill in all sections with relevant information
3. Assign the next available ADR number
4. Submit for review via pull request
5. Update this index when approved

## Best Practices

- **Be specific** - Provide concrete details and examples
- **Explain context** - Help future readers understand the situation
- **List alternatives** - Show what else was considered
- **Be honest** - Document both pros and cons
- **Keep it concise** - Aim for 1-2 pages maximum
- **Date everything** - Include dates for all status changes
