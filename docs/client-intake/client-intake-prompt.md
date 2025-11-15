I need you to perform a thorough technical review of my client intake system 
implementation plan with a SPECIFIC FOCUS on Google Cloud Platform deployment.

**CRITICAL CONTEXT:** 
- Current production system is ALREADY deployed on GCP Cloud Run
- Database: Cloud SQL PostgreSQL
- I need zero-downtime refactoring and deployment
- Solo developer managing everything
- 7-week timeline includes development AND deployment

## GCP-Specific Review Areas:

### 1. Cloud Run Deployment Strategy
- Is gradual traffic splitting the right approach for refactoring phases?
- Should I use Cloud Run revisions with tagged deployments?
- How many concurrent revisions should I keep?
- Should I set min/max instances for the service?
- Is CPU allocation set correctly (only during requests vs always allocated)?
- Do I need to adjust memory limits for the intake system?
- Should I use Cloud Run's built-in load balancing or add Cloud Load Balancer?
- What's the right concurrency setting per instance?

### 2. Cloud SQL PostgreSQL
- How do I safely run migrations on Cloud SQL without downtime?
- Should I use Cloud SQL Proxy for connections or direct connection?
- Is connection pooling configured correctly for Cloud Run's scaling?
- Should I use the built-in pg connection pool or pgBouncer?
- What's the right Cloud SQL tier for this workload?
- Should I enable High Availability (HA) configuration?
- How do I handle the 13 new tables with proper indexes for Cloud SQL?
- Should I use Cloud SQL Insights for monitoring query performance?
- Are there Cloud SQL-specific PostgreSQL settings I should optimize?

### 3. Cloud Build CI/CD Pipeline
- Should I use Cloud Build triggers on GitHub or Cloud Source Repositories?
- Is my cloudbuild.yaml configuration optimal?
- Should I cache Docker layers to speed up builds?
- How do I handle secrets during the build process?
- Should I use substitution variables for environment-specific configs?
- Do I need separate build configs for staging vs production?
- Should builds run tests before deploying?
- How do I implement manual approval gates for production?

### 4. Secret Manager Integration
- Is Secret Manager the right choice vs environment variables?
- How do I mount secrets to Cloud Run efficiently?
- Should I use Secret Manager API in code or environment variable injection?
- What's the performance impact of reading secrets at runtime?
- How do I rotate secrets without redeploying?
- Should ACCESS_TOKEN, SENDGRID_API_KEY, and DATABASE_URL all be in Secret Manager?

### 5. Cloud Storage vs Current Setup
- The plan mentions file uploads - should I use Cloud Storage or stick with Dropbox?
- If Cloud Storage: signed URLs or direct upload?
- What's the cost comparison for legal document storage?
- Should I use Cloud Storage buckets with lifecycle policies?
- Do I need separate buckets for staging and production?

### 6. Cloud Logging & Monitoring
- What Cloud Logging filters should I set up for the new intake system?
- Should I use structured logging for better querying?
- What Cloud Monitoring metrics are critical to track?
- Should I set up log-based metrics for specific errors?
- What alerting policies do I need before refactoring?
- Should I use Error Reporting for tracking exceptions?
- Do I need Cloud Trace for latency analysis?

### 7. Database Migration on Cloud SQL
- How do I test migrations on a Cloud SQL staging instance?
- Should I use Cloud SQL's point-in-time recovery instead of manual backups?
- Can I run migrations during Cloud SQL's maintenance window?
- How do I minimize connection interruptions during migration?
- Should I use Cloud SQL's read replica for testing?
- What's the rollback strategy if migration corrupts data?

### 8. Staging Environment Setup
- Should staging be a separate Cloud Run service or different project?
- Should I use a Cloud SQL clone for staging database?
- How do I keep staging data in sync with production (anonymized)?
- What's the cost of running staging 24/7 vs on-demand?
- Should staging auto-shutdown when not in use?

### 9. Traffic Management During Refactoring
- Week 1-3 refactoring: How do I validate each phase works before 100% traffic?
- Should I use Cloud Run's traffic splitting 10% → 25% → 50% → 100%?
- How long should I monitor each traffic percentage before increasing?
- What metrics indicate it's safe to increase traffic?
- Can I rollback traffic instantly if errors spike?

### 10. Zero-Downtime Deployment Mechanics
- When I deploy a new Cloud Run revision, does the old one stay alive?
- How long does Cloud Run keep old revisions before pruning?
- If a request is in-flight during deployment, what happens?
- For long-running document generation (30+ seconds), how do I prevent interruption?
- Should I implement graceful shutdown handlers?

### 11. Cost Analysis
- What are the GCP cost implications of:
  - Running staging environment 24/7
  - 13 new database tables with indexes
  - Cloud Build runs on every commit
  - Secret Manager API calls
  - Cloud Logging retention
  - Cloud Run with increased memory/CPU
- Should I set up billing alerts and budgets?
- Are there cost optimization opportunities I'm missing?

### 12. Security & IAM
- What IAM roles does Cloud Run need for:
  - Cloud SQL access
  - Secret Manager access
  - Cloud Storage access (if used)
- Should Cloud Run use default service account or custom one?
- How do I ensure least-privilege access?
- Should I enable VPC Service Controls?
- Do I need Cloud Armor for DDoS protection?

### 13. Disaster Recovery
- What's my RTO (Recovery Time Objective) and RPO (Recovery Point Objective)?
- How do I backup the entire system (code + database + config)?
- Should I enable Cloud SQL automated backups (daily)?
- How do I test disaster recovery procedures?
- Should I have a multi-region failover plan?

### 14. Performance Considerations
- Will 13 new tables slow down Cloud SQL on current tier?
- Should I use Cloud SQL's query insights before/after migration?
- Do I need Cloud CDN for static assets?
- Should I implement Cloud Memorystore (Redis) for caching?
- What's the expected latency for intake searches with filters?

### 15. Specific GCP Gotchas
- Cloud Run cold starts - will this affect user experience?
- Cloud SQL connection limits - am I hitting them with Cloud Run scaling?
- Cloud Build timeout limits - will builds complete in time?
- Cloud Run request timeout (default 5 min) - enough for document generation?
- Cloud SQL storage autoscaling - should I enable it?

### 16. Week-by-Week Deployment Questions
- **Week 1 (Doc Routes):** Can I deploy to Cloud Run without touching Cloud SQL?
- **Week 2 (Form Routes):** Same as Week 1?
- **Week 3 (DB Refactor):** Does extracting db/connection.js require redeployment?
- **Week 4 (Database):** How do I run Cloud SQL migration with zero downtime?
- **Week 5 (Client Form):** Just Cloud Run deployment, right?
- **Week 6 (Attorney Modal):** Just Cloud Run deployment?
- **Week 7 (Testing):** What's the final production deployment checklist?

### 17. Monitoring the Refactoring
- What Cloud Monitoring dashboards should I create?
- Should I track before/after metrics for each phase?
- How do I know if refactoring degraded performance?
- Should I use Cloud Profiler to compare old vs new code?

### 18. Missing GCP Services
- Should I use Cloud Tasks for async document generation?
- Should I use Cloud Scheduler for periodic cleanup jobs?
- Do I need Pub/Sub for event-driven architecture?
- Should I use Cloud Functions for any part of this?

### 19. Code-Level GCP Integration
- Is my database connection pooling correct for Cloud Run?
- Should I use @google-cloud/logging for structured logs?
- Am I handling Cloud Run's SIGTERM signal for graceful shutdown?
- Should I use Cloud Run's health checks endpoint?

### 20. Production Readiness Checklist
- What GCP-specific checks should I do before each deployment?
- How do I validate Cloud Run service is healthy post-deployment?
- Should I implement smoke tests that run after deployment?
- What's the rollback procedure if Cloud Monitoring shows errors?

Please be brutally honest about:
- GCP-specific risks I'm not considering
- Better ways to use GCP services for this use case
- Cost optimization opportunities
- Security vulnerabilities in my GCP setup
- Performance bottlenecks specific to Cloud Run + Cloud SQL
- Any GCP limits or quotas I might hit
- Whether my 7-week timeline accounts for GCP deployment complexity

I want to know if this plan will actually work on GCP or if I'm missing critical pieces!