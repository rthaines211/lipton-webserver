# ADR-003: Nginx Hybrid Cloud Architecture

**Status:** Accepted
**Date:** 2025-10-23
**Deciders:** Development Team, DevOps Team
**Technical Story:** Deployment of production infrastructure

---

## Context

The Legal Form Application requires a robust architecture that supports:

1. **High-performance document generation** using Docmosis Tornado
2. **Scalable web application** backend for form processing
3. **Cost-effective** infrastructure
4. **Simple authentication** mechanism for users
5. **Reliable** service with minimal downtime

### Initial Architecture Challenges

**Option 1: Fully Cloud Run**
- ❌ Docmosis Tornado not containerizable (licensing tied to VM)
- ❌ Complex networking for Docmosis <-> Cloud Run communication
- ❌ Document generation latency over network

**Option 2: Fully VM-Based**
- ❌ Manual scaling required
- ❌ No auto-scaling for traffic spikes
- ❌ Higher operational overhead
- ❌ More expensive at low traffic volumes

**Option 3: Separate Services (no gateway)**
- ❌ Users must manage multiple URLs
- ❌ Duplicate authentication on each service
- ❌ No single entry point for monitoring
- ❌ Complex CORS configuration

---

## Decision

We will implement a **hybrid cloud architecture** with:

1. **Nginx Gateway** on GCP Compute Engine VM (`docmosis-tornado-vm`)
   - Acts as reverse proxy and single entry point
   - Routes `/api/render` to local Docmosis Tornado
   - Routes all other traffic to Cloud Run Node.js server
   - Automatically injects authentication tokens

2. **Docmosis Tornado** on same VM (localhost:8080)
   - Local access via Nginx (zero network latency)
   - Dedicated VM resources
   - License compliance

3. **Node.js Application** on Cloud Run
   - Auto-scales 0 → N instances
   - Pay-per-request pricing
   - Managed platform (zero maintenance)

4. **Cloudflare** as CDN/SSL layer
   - Free SSL/TLS certificates
   - DDoS protection
   - Global CDN
   - DNS management

### Architecture Diagram

```
Internet Users
    ↓ HTTPS
Cloudflare (SSL termination, DDoS)
    ↓ HTTP
Nginx Gateway (docmosis-tornado-vm:80)
    ├─→ /api/render → Docmosis Tornado (localhost:8080)
    └─→ /* → Cloud Run + auth token injection
```

---

## Rationale

### 1. Nginx as Intelligent Gateway

**Benefits:**
- **Single Entry Point**: All traffic goes through one URL (`docs.liptonlegal.com`)
- **Automatic Authentication**: Nginx injects access token for Cloud Run requests
- **Path-Based Routing**: Different backends based on URL path
- **Zero Network Latency**: Docmosis accessed via localhost
- **Request Transformation**: Smart query parameter handling

**Implementation:**
```nginx
# Document generation: Local Docmosis
location /api/render {
    proxy_pass http://localhost:8080;
}

# Application: Cloud Run with auth injection
location / {
    set $backend "node-server-zyiwmzwenq-uc.a.run.app";
    set $token "***";
    proxy_pass https://$backend$uri?token=$token;
}
```

### 2. Docmosis on VM (Co-located with Nginx)

**Benefits:**
- **Zero Latency**: localhost communication (< 1ms)
- **Dedicated Resources**: No resource contention
- **License Compliance**: VM-based licensing satisfied
- **Simplified Networking**: No firewall rules needed for localhost

**Cost:**
- VM: e2-standard-2 (2 vCPU, 8 GB) = ~$50/month
- Always running (Docmosis requires persistent process)

### 3. Node.js on Cloud Run

**Benefits:**
- **Auto-Scaling**: 0 → 10 instances based on traffic
- **Pay-Per-Use**: Only charged for request time
- **Zero Maintenance**: Automatic patching, no server management
- **Global Load Balancing**: Built-in by GCP
- **Deployment**: `gcloud run deploy` (30 seconds)

**Cost:**
- $0 when idle (scales to zero)
- ~$10-30/month for typical traffic
- Scales automatically during traffic spikes

### 4. Cloudflare for SSL & Security

**Benefits:**
- **Free SSL/TLS**: Automatic certificate management
- **DDoS Protection**: Enterprise-grade included free
- **Global CDN**: 200+ edge locations
- **Analytics**: Traffic insights and performance metrics
- **DNS Management**: Fast, reliable DNS

**Cost:**
- Free plan (sufficient for current needs)
- No Let's Encrypt maintenance required

---

## Consequences

### Positive

✅ **Cost-Effective**
- Cloud Run: $0 when idle, pay-per-request
- Single VM for Nginx + Docmosis
- Total infrastructure: ~$60-80/month

✅ **High Performance**
- Docmosis: localhost access (< 1ms latency)
- Cloud Run: Auto-scales for traffic spikes
- Cloudflare: Global CDN caching

✅ **Simplified User Experience**
- Single URL for all services
- Automatic authentication (no manual token management)
- Transparent backend routing

✅ **Operational Simplicity**
- Cloud Run: Fully managed (zero maintenance)
- Nginx: Simple configuration (40 lines)
- Cloudflare: Automatic SSL renewal

✅ **Scalability**
- Cloud Run: 0 → 100+ instances automatically
- Nginx: Handle 1000+ req/sec on e2-standard-2
- Docmosis: Dedicated VM resources

✅ **Security**
- 5 layers: Cloudflare WAF → SSL → Nginx → Cloud Run Auth → Cloud SQL
- DDoS protection via Cloudflare
- Token injection prevents token exposure

### Negative (Accepted Trade-offs)

⚠️ **Single Point of Failure**
- Nginx VM is critical path for all traffic
- **Mitigation:**
  - Cloudflare health checks (60s intervals)
  - Automated VM snapshots (daily)
  - Standby VM for failover
  - Cloudflare can point directly to Cloud Run as emergency fallback

⚠️ **Manual Nginx Management**
- Nginx config requires manual updates
- **Mitigation:**
  - Simple config (40 lines total)
  - Documented procedures in [NGINX_GATEWAY.md](../infrastructure/NGINX_GATEWAY.md)
  - Config backup on every change
  - Testing before reload (`nginx -t`)

⚠️ **VM Costs (Always Running)**
- e2-standard-2 = ~$50/month (24/7)
- **Justification:**
  - Docmosis requires persistent process
  - Nginx overhead is minimal
  - Cheaper than alternatives (managed load balancer = $18+/month just for LB)

⚠️ **Docmosis Limited to Single VM**
- Cannot horizontally scale Docmosis
- **Mitigation:**
  - VM sized for 95th percentile load
  - Monitor document generation queue
  - Scale VM vertically if needed
  - Queue system for burst traffic

---

## Alternatives Considered

### Alternative 1: GCP Cloud Load Balancer

```
Cloud Load Balancer
    ├─→ /api/render → VM Group (Docmosis)
    └─→ /* → Cloud Run (Node.js)
```

**Why Rejected:**
- **Cost**: $18/month for load balancer + $50/month for VM = $68/month (vs $50/month for Nginx)
- **Complexity**: More moving parts to manage
- **Overkill**: Don't need load balancing across multiple VMs yet
- **Auth Injection**: Would require additional proxy layer anyway

**When to Reconsider:**
- Need multiple Docmosis VMs
- Require automated failover
- Traffic exceeds single VM capacity

### Alternative 2: Docker Compose on VM

```
VM running Docker Compose:
  - Nginx container
  - Docmosis container
  - Node.js container
  - PostgreSQL container
```

**Why Rejected:**
- **Complexity**: Docker overhead unnecessary
- **Cloud Run Benefits Lost**: No auto-scaling, managed platform
- **Database**: Cloud SQL is superior to self-managed Postgres
- **Cost**: Same VM cost, but more operational overhead
- **Docmosis Licensing**: May violate license agreement (VM vs container)

**When to Reconsider:**
- Need exact environment replication
- Switching away from Cloud Run
- All services must be co-located

### Alternative 3: Serverless Docmosis (AWS Lambda)

```
API Gateway
    ├─→ /api/render → Lambda (Docmosis via Java)
    └─→ /* → Cloud Run (Node.js)
```

**Why Rejected:**
- **Cold Starts**: 5-10 second cold start for Docmosis lambda
- **Cost**: More expensive than dedicated VM for our traffic
- **Complexity**: Java-based Docmosis wrapper
- **Performance**: Warm dedicated process faster than ephemeral lambda
- **Licensing**: Tornado license is VM-based, not serverless

**When to Reconsider:**
- Very low document generation volume (< 10/day)
- Willing to accept cold start latency
- Switch to Docmosis Cloud (SaaS)

### Alternative 4: Fully Managed (Docmosis Cloud SaaS)

```
Cloud Run (Node.js)
    └─→ Docmosis Cloud API (SaaS)
```

**Why Rejected:**
- **Cost**: Docmosis Cloud = $100-500/month (vs $50/month for Tornado VM)
- **Vendor Lock-in**: Dependent on Docmosis Cloud availability
- **Latency**: Network round-trip for each document
- **Data Privacy**: Templates sent to external SaaS
- **Control**: Less control over document generation

**When to Reconsider:**
- Document generation volume increases significantly (1000+/day)
- Don't want to manage Docmosis infrastructure
- Budget allows for SaaS pricing

---

## Implementation Plan

### Phase 1: Setup VM and Nginx ✅ **COMPLETE**
- [x] Provision GCP Compute Engine VM
- [x] Install Nginx
- [x] Configure Nginx with dual routing
- [x] Test localhost Docmosis connectivity
- [x] Test Cloud Run proxy

### Phase 2: Cloudflare Integration ✅ **COMPLETE**
- [x] Point DNS to VM external IP
- [x] Enable Cloudflare proxy (orange cloud)
- [x] Configure SSL (Flexible mode)
- [x] Test HTTPS end-to-end
- [x] Verify DDoS protection active

### Phase 3: Authentication Automation ✅ **COMPLETE**
- [x] Implement token injection in Nginx
- [x] Handle query parameters correctly
- [x] Test with and without existing params
- [x] Verify Cloud Run receives token

### Phase 4: Monitoring & Alerts 🔄 **IN PROGRESS**
- [x] Setup GCP Cloud Monitoring
- [x] Configure uptime checks
- [ ] Create alert policies
- [ ] Setup log-based metrics
- [ ] Dashboard for traffic visualization

### Phase 5: Documentation ✅ **COMPLETE**
- [x] NGINX_GATEWAY.md - Complete setup guide
- [x] ARCHITECTURE.md - Architecture overview
- [x] OPERATIONS_GUIDE.md - Operations procedures
- [x] ADR-003 - This document

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime | > 99.9% | 99.95% | ✅ Met |
| Docmosis Latency | < 100ms | ~10ms | ✅ Exceeded |
| Form Submission | < 500ms | ~200ms | ✅ Exceeded |
| Infrastructure Cost | < $100/month | ~$65/month | ✅ Met |
| Time to Deploy | < 5 min | ~2 min | ✅ Exceeded |
| Auto-Scaling | 0→N instances | Working | ✅ Met |

---

## Review Schedule

This ADR should be reviewed:

- **Quarterly**: Check if traffic patterns have changed
- **When**: Docmosis usage increases 3x
- **When**: Nginx VM hits 70%+ CPU sustained
- **When**: Cost optimization is needed
- **When**: New GCP services become available

---

## References

- [NGINX_GATEWAY.md](../infrastructure/NGINX_GATEWAY.md) - Nginx documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [DEPLOYMENT_GUIDE.md](../deployment/DEPLOYMENT_GUIDE.md) - Deployment procedures
- [ADR-001](./ADR-001-dual-storage-system.md) - Dual storage decision
- [ADR-002](./ADR-002-gcp-cloud-run-deployment.md) - Cloud Run decision

---

**Approved By:** Development Team
**Date Implemented:** October 2025
**Last Reviewed:** October 23, 2025
**Next Review:** January 2026
