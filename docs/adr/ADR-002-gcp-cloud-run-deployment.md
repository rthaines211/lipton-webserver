# ADR-002: GCP Cloud Run for Production Deployment

## Status

**Accepted**

Date: 2025-01-20

## Context

The legal form application needed a production deployment platform that could:

- **Scale automatically** with traffic (0 to hundreds of users)
- **Minimize costs** during low usage periods
- **Deploy easily** from code without complex infrastructure
- **Integrate seamlessly** with Cloud SQL PostgreSQL
- **Provide high availability** without manual intervention
- **Support zero-downtime deployments** for updates

### Business Constraints

- **Budget:** Limited operational budget, pay-per-use preferred
- **Team size:** Small team (2-3 developers), no dedicated DevOps
- **Traffic pattern:** Sporadic usage (busy during business hours, idle nights/weekends)
- **Compliance:** Data must stay in US (GDPR, privacy regulations)
- **SLA target:** 99.5% uptime minimum

### Technical Constraints

- Node.js Express application (main API)
- Python FastAPI service (data pipeline)
- PostgreSQL database
- Requires VPC connectivity to Cloud SQL
- SSE (Server-Sent Events) support needed for real-time updates

## Decision

**We will deploy to Google Cloud Platform using Cloud Run** (fully managed serverless container platform) with the following architecture:

- **Node.js API** → Cloud Run service
- **Python Pipeline** → Cloud Run service
- **PostgreSQL** → Cloud SQL
- **Networking** → Serverless VPC Access Connector
- **Storage** → Cloud Storage + Dropbox

## Rationale

### Why Cloud Run?

**1. Cost Efficiency**
- **Pay only for actual usage** (request time + CPU/memory)
- **Scales to zero** when idle (no charges)
- **Free tier:** 2 million requests/month, 360,000 GB-seconds memory
- **Estimated cost:** $20-50/month vs $150-300/month for dedicated VMs

**2. Developer Experience**
- **Deploy from source** - no Docker expertise required initially
- **Automatic SSL** - HTTPS certificates managed by Google
- **Built-in CI/CD** - Deploy with single `gcloud run deploy` command
- **Instant rollback** - Traffic routing to previous revisions

**3. Scalability**
- **Auto-scales** from 0 to 1000 instances automatically
- **Handles traffic spikes** without configuration
- **Per-service scaling** - Node.js and Python scale independently
- **Container isolation** - Each request runs in isolated container

**4. Reliability**
- **99.95% SLA** (higher than our 99.5% target)
- **Multi-zone deployment** - Automatic failover
- **Health checks** - Auto-restart unhealthy containers
- **Load balancing** - Built-in across regions

### Why Google Cloud Platform?

**Cloud SQL Integration:**
- Native VPC connectivity to Cloud SQL
- Automatic credential management via secrets
- Connection pooling built-in
- Private IP networking for security

**Ecosystem Benefits:**
- Cloud Storage for file persistence
- Secret Manager for credentials
- Cloud Logging for centralized logs
- Cloud Monitoring for metrics and alerts
- IAM for fine-grained access control

## Alternatives Considered

### Alternative 1: AWS ECS (Elastic Container Service)

**Pros:**
- Similar containerized deployment
- Good AWS ecosystem integration
- Mature platform

**Cons:**
- More complex setup (ALB, target groups, task definitions)
- Doesn't scale to zero (minimum 1 task)
- Higher baseline cost (~$50/month minimum)
- Team less familiar with AWS
- More configuration required

**Why rejected:**
Higher complexity and cost. Cloud Run's "scale to zero" feature critical for our sporadic traffic.

### Alternative 2: Traditional VM (Compute Engine / EC2)

**Pros:**
- Full control over environment
- Can run any software
- Predictable performance

**Cons:**
- Must provision capacity upfront
- Pay 24/7 even when idle ($100-200/month)
- Manual scaling configuration
- Need to manage OS updates, security patches
- Requires load balancer setup
- No automatic failover

**Why rejected:**
Significant operational overhead for small team. Fixed costs even during idle periods wasteful.

### Alternative 3: Heroku

**Pros:**
- Extremely simple deployment (`git push heroku main`)
- Good developer experience
- Add-ons for common services

**Cons:**
- **Expensive:** $25/month per dyno, sleep on free tier
- Limited to US and Europe regions
- Less control over infrastructure
- Vendor lock-in to Heroku CLI/ecosystem
- No VPC connectivity to managed databases
- Acquired by Salesforce (uncertain future)

**Why rejected:**
Cost prohibitive at scale ($50-150/month). Limited infrastructure control. Cloud Run provides similar simplicity at 1/3 the cost.

### Alternative 4: Kubernetes (GKE)

**Pros:**
- Maximum flexibility and control
- Industry standard orchestration
- Portable across clouds
- Advanced networking features

**Cons:**
- **Extremely complex** for small team
- Steep learning curve (pods, deployments, services, ingress)
- **Expensive:** Minimum 3 nodes for HA ($200-400/month)
- Requires dedicated DevOps expertise
- Overkill for our traffic volume

**Why rejected:**
Engineering effort not justified for current scale. Can migrate to GKE later if needed. Cloud Run abstracts complexity we don't need yet.

## Consequences

### Positive

✅ **Low operational cost** - $20-50/month vs $150-300 for VMs
✅ **Zero infrastructure management** - No OS patches, no capacity planning
✅ **Automatic scaling** - Handles traffic spikes without intervention
✅ **Fast deployments** - Deploy in 2-3 minutes with single command
✅ **Built-in SSL/TLS** - HTTPS automatic, certificates managed
✅ **Easy rollback** - Traffic shift to previous revision in seconds
✅ **High availability** - 99.95% SLA, multi-zone deployment
✅ **Developer productivity** - More time building features, less on infrastructure

### Negative

❌ **Cold start latency** - First request after idle takes 2-3 seconds
❌ **Vendor lock-in** - Migration to another platform requires refactoring
❌ **Request timeout limits** - Max 60 minutes per request (300 for Python pipeline)
❌ **Memory limits** - Max 32GB per instance (more than enough for us)
❌ **Stateless requirement** - Can't store files on local disk (use Cloud Storage)
❌ **Limited websocket support** - SSE works, but long-lived connections discouraged

### Neutral

⚖️ **Container packaging** - Need Dockerfile (but can deploy from source initially)
⚖️ **Observability** - Cloud Logging sufficient but less flexible than ELK stack
⚖️ **Regional availability** - Limited to GCP regions (acceptable for US-only deployment)

## Implementation Notes

### Basic Deployment Command

```bash
gcloud run deploy node-server \
    --source . \
    --region=us-central1 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --allow-unauthenticated \
    --vpc-connector=cloud-run-connector \
    --set-env-vars="NODE_ENV=production" \
    --set-secrets="ACCESS_TOKEN=access-token:latest"
```

### VPC Connector for Cloud SQL

```bash
# Required for private Cloud SQL access
gcloud compute networks vpc-access connectors create cloud-run-connector \
    --region=us-central1 \
    --network=default \
    --range=10.8.0.0/28
```

### Connection String Format

```env
# PostgreSQL connection via Unix socket (Cloud SQL Proxy)
DB_HOST=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
DB_NAME=legal_forms_db
DB_USER=app-user
# DB_PASSWORD loaded from Secret Manager
```

### Mitigating Cold Starts

```bash
# Set minimum instances to 1 for production (costs ~$10/month)
gcloud run services update node-server \
    --region=us-central1 \
    --min-instances=1

# Or keep at 0 and accept 2-3s first request latency
--min-instances=0  # Default
```

### Health Checks

```javascript
// Built-in health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Cloud Run automatically pings this to determine container health
```

### Deployment Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      - run: |
          gcloud run deploy node-server \
            --source . \
            --region=us-central1
```

## Migration Path

If we outgrow Cloud Run (unlikely in near term), migration paths exist:

**To GKE (Kubernetes):**
- Already containerized (Docker)
- Can deploy same containers to GKE
- Gradual migration (route traffic with Cloud Load Balancer)

**To VMs:**
- Deploy containers to Compute Engine with Docker
- Or run Node.js directly on VM

**To another cloud:**
- Containers portable to AWS ECS, Azure Container Apps
- Database can be exported and restored

## Monitoring & Alerts

```bash
# Key metrics to monitor:
- Request count (should scale with business activity)
- Error rate (should be <1%)
- Response latency (p95 should be <500ms)
- Cold start frequency (if too high, increase min-instances)
- Memory usage (if >80%, increase memory allocation)

# Alert on:
- Error rate >5% for 5 minutes
- P95 latency >2s for 10 minutes
- Zero successful requests for 15 minutes (service down)
```

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
- [Operations Guide](../operations/OPERATIONS_GUIDE.md)
- [Cloud SQL Connectivity](https://cloud.google.com/run/docs/configuring/connect-cloudsql)
- [Cost Calculator](https://cloud.google.com/products/calculator)

## Metadata

- **Author:** Development Team
- **Reviewers:** Architecture Team, Finance
- **Last Updated:** 2025-01-20
- **Supersedes:** N/A
- **Superseded by:** N/A

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-20 | Development Team | Initial version |
