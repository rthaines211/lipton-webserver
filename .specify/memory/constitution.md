# Lipton Legal Form Application Constitution

<!--
Sync Impact Report - Constitution Update

Version: 1.0.0 → 1.0.0 (Initial Creation)
Creation Date: 2025-11-12

Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (6 principles)
  - Quality Gates
  - Development Workflow
  - Governance

Removed Sections: N/A

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Updated Constitution Check with all 6 principles
  ✅ .specify/templates/spec-template.md - Requirements section aligns with principles
  ✅ .specify/templates/tasks-template.md - Task categorization compatible with workflow
  ✅ .specify/templates/checklist-template.md - Added Constitution Compliance section
  ✅ .specify/templates/agent-file-template.md - Added Multi-Environment Configuration

Follow-up TODOs: None - all templates synchronized with constitution
-->

## Core Principles

### I. Multi-Environment Safety (NON-NEGOTIABLE)

The system MUST maintain three distinct environments with graduated promotion:
- **Development**: Experimental changes, rapid iteration allowed
- **Staging**: Production-like testing, requires validation before promotion
- **Production**: Live user data, requires manual approval for deployments

**Rationale**: Legal data is sensitive and mission-critical. Separation of environments prevents accidental data corruption or exposure. Every change must be validated in staging before production deployment.

**Enforcement**:
- All infrastructure changes must be tested in staging first
- Production deployments require manual approval in CI/CD pipeline
- Environment-specific secrets managed in GCP Secret Manager
- Database schemas validated in staging before production migration

### II. Data Reliability & Dual Storage

All form submissions MUST be stored redundantly:
- **Primary**: PostgreSQL database with relational integrity
- **Secondary**: JSON files in filesystem/cloud storage
- **Tertiary**: Dropbox cloud backup (when enabled)

**Rationale**: Legal document data cannot be lost. Dual storage provides redundancy, allows rollback, and enables data recovery. JSON files serve as audit trail and backup mechanism.

**Enforcement**:
- Form submission endpoint writes to both storage systems atomically
- If either storage fails, transaction is rolled back and user is notified
- JSON files are immutable once created (timestamped filenames)
- Dropbox sync is asynchronous and non-blocking

### III. Real-Time User Feedback

Users MUST receive immediate, transparent feedback about system state:
- Form submission progress via Server-Sent Events (SSE)
- Toast notifications for all user actions
- Clear error messages with actionable guidance
- Progress indicators for long-running operations (pipeline execution)

**Rationale**: Legal professionals need confidence that their data is being processed correctly. Real-time feedback reduces anxiety and support burden.

**Enforcement**:
- SSE connection established before form submission
- Heartbeat messages every 15 seconds to prevent connection timeout
- Deduplication of SSE messages to prevent UI confusion
- Error states must include user-actionable next steps

### IV. Test Coverage Before Deployment

All user-facing features MUST have automated tests before production deployment:
- **Playwright tests**: End-to-end form workflows
- **API contract tests**: Endpoint validation
- **Integration tests**: Database and external service interactions

**Rationale**: Legal form processing is complex with many edge cases. Automated tests prevent regression and ensure data integrity across deployments.

**Enforcement**:
- New features require corresponding test files
- CI/CD pipeline blocks deployment if tests fail
- Test coverage reports reviewed in PRs
- Critical paths (form submission, data transformation) require comprehensive test scenarios

### V. Documentation as Code

All features, APIs, and deployment procedures MUST be documented:
- **User Guide**: How to fill out forms, troubleshooting
- **Developer Guide**: Setup, testing, contributing
- **API Reference**: OpenAPI spec + examples
- **Architecture Docs**: System design, data flow, technology stack

**Rationale**: Legal form system has many stakeholders (users, developers, legal staff). Comprehensive documentation reduces onboarding time and prevents knowledge silos.

**Enforcement**:
- Feature PRs must update relevant documentation
- Deployment changes must update environment setup guides
- API changes must update OpenAPI specification
- Breaking changes require migration guides

### VI. Observability & Monitoring

System health and performance MUST be continuously monitored:
- **Structured logging**: Winston logger with daily rotation
- **Metrics**: Prometheus endpoints for performance tracking
- **Health checks**: `/health` and `/health/detailed` endpoints
- **Error tracking**: Comprehensive error logging with context

**Rationale**: Production issues must be detected and diagnosed quickly. Structured observability enables proactive problem resolution.

**Enforcement**:
- All API endpoints must log request/response times
- Database queries must log execution time
- External service calls (Dropbox, pipeline) must log success/failure
- Health check endpoints required for Cloud Run deployment

## Quality Gates

### Pre-Implementation Gates

**Before starting any feature**:
- [ ] Feature specification documented in `/specs/[###-feature-name]/spec.md`
- [ ] User stories defined with acceptance criteria
- [ ] Multi-environment impact assessed (dev/staging/production)
- [ ] Database schema changes reviewed (if applicable)
- [ ] External service dependencies identified (Dropbox, pipeline, email)

### Pre-Deployment Gates

**Before deploying to staging**:
- [ ] All Playwright tests passing locally
- [ ] Database migrations tested locally
- [ ] Environment variables documented in [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md)
- [ ] API changes reflected in OpenAPI spec

**Before deploying to production**:
- [ ] Feature validated in staging environment
- [ ] Performance impact assessed (database queries, memory usage)
- [ ] Rollback plan documented
- [ ] Stakeholders notified of deployment window

## Development Workflow

### Branch Strategy

- **`main`**: Production-ready code, auto-deploys to staging, manual approval for production
- **`develop`**: Integration branch for features, auto-deploys to development environment
- **Feature branches**: `[###-feature-name]` format, created from `develop`

### Commit Standards

- Conventional commits format: `type(scope): description`
  - `feat`: New user-facing feature
  - `fix`: Bug fix
  - `refactor`: Code restructuring without behavior change
  - `docs`: Documentation updates
  - `test`: Test additions or modifications
  - `chore`: Build system, dependencies, tooling

### Code Review Requirements

- All changes require PR review before merge
- PR must include:
  - Description of changes and rationale
  - Test evidence (screenshots, test output)
  - Documentation updates (if applicable)
  - Breaking change warnings (if applicable)

### Testing Discipline

- Write tests for new features before implementation (TDD preferred)
- Ensure tests fail before implementing feature (red-green-refactor)
- Update existing tests when modifying behavior
- Do not skip tests or use `.skip()` without documented justification

## Governance

### Amendment Procedure

This constitution governs all development practices for the Lipton Legal Form Application. Amendments require:

1. **Proposal**: Document proposed change with rationale
2. **Review**: Discuss impact on existing workflows and templates
3. **Approval**: Consensus from core maintainers
4. **Migration**: Update all dependent templates and documentation
5. **Version Bump**: Follow semantic versioning rules

### Versioning Policy

- **MAJOR (X.0.0)**: Principle removal or fundamental practice change (e.g., removing multi-environment requirement)
- **MINOR (1.X.0)**: New principle added or existing principle expanded (e.g., adding security principle)
- **PATCH (1.0.X)**: Clarifications, typo fixes, non-semantic improvements

### Compliance Review

- All PRs must verify alignment with constitution principles
- Constitution violations require explicit justification and approval
- Complexity additions (new dependencies, architectural changes) require documented rationale
- Use this constitution file for governance, refer to [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for runtime development guidance

### Non-Negotiable Requirements

The following principles are marked **NON-NEGOTIABLE** and cannot be bypassed:
- **Multi-Environment Safety**: No direct production deployments
- **Test Coverage**: No production deployments without tests

Violations of non-negotiable principles require emergency review and immediate remediation plan.

**Version**: 1.0.0 | **Ratified**: 2025-11-12 | **Last Amended**: 2025-11-12
