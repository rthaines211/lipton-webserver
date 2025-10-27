# GCP VM Monitoring Stack - Complete Guide

✅ **Status: Phase 2 COMPLETE** - Prometheus, NGINX Exporter, and Grafana deployed and running

This directory contains the complete monitoring stack deployed on your `docmosis-tornado-vm` using Docker containers.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Internet (docs.liptonlegal.com)                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  docmosis-tornado-vm (e2-medium)                │
│  ┌───────────────────────────────────────────┐  │
│  │  NGINX (Port 80 & 8081)                   │  │
│  │  - Port 80: Public traffic                │  │
│  │  - Port 8081: /nginx_status (internal)    │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  Monitoring Stack (Docker)                │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  nginx-exporter (port 9113)         │  │  │
│  │  │  ✓ Scrapes NGINX stub_status        │  │  │
│  │  │  ✓ Exports Prometheus metrics       │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Prometheus (port 9090)             │  │  │
│  │  │  ✓ Scrapes nginx-exporter           │  │  │
│  │  │  ✓ Scrapes Cloud Run services       │  │  │
│  │  │  ✓ 7-day local retention            │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Grafana (port 3000)                │  │  │
│  │  │  ✓ Pre-configured Prometheus DS     │  │  │
│  │  │  ✓ Import dashboards                │  │  │
│  │  │  ✓ Login: admin/tornado2025!        │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

Access via SSH Tunnel:
  ssh -L 3000:localhost:3000 → Grafana UI
  ssh -L 9090:localhost:9090 → Prometheus UI
```

## 🚀 Quick Start - Access Your Dashboards

### Easiest Way: Use the Access Script

```bash
cd monitoring/gcp/scripts
./access-grafana.sh
```

Then open in your browser:
- **Grafana**: http://localhost:3000 (login: `admin` / `tornado2025!`)
- **Prometheus**: http://localhost:9090

### Manual SSH Tunnel

```bash
gcloud compute ssh docmosis-tornado-vm \
  --zone=us-central1-c \
  --project=docmosis-tornado \
  --ssh-flag='-L 3000:localhost:3000 -L 9090:localhost:9090 -N'
```

Keep this terminal open while using the dashboards.

## 📊 What's Running

### Container Status

```bash
# Check all containers
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml ps"
```

Expected output:
```
NAME             STATUS                   PORTS
nginx-exporter   Up (healthy)             0.0.0.0:9113->9113/tcp
prometheus       Up (healthy)             0.0.0.0:9090->9090/tcp
grafana          Up (healthy)             0.0.0.0:3000->3000/tcp
```

### Metrics Being Collected

| Source | Metrics Endpoint | What It Measures |
|--------|-----------------|------------------|
| **NGINX** | http://localhost:9113/metrics | Active connections, request rate, upstream performance |
| **Prometheus** | http://localhost:9090/metrics | Internal Prometheus stats, scrape performance |
| **Grafana** | http://localhost:3000/metrics | Dashboard usage, query performance |
| **Node.js (Cloud Run)** | https://node-server-zyiwmzwenq-uc.a.run.app/metrics | HTTP requests, form submissions, database queries |

## 📁 Directory Structure

```
monitoring/gcp/
├── README.md                          # This file
├── PHASE1_COMPLETE.md                 # Phase 1 completion report
├── PHASE2_COMPLETE.md                 # Phase 2 completion report (NEW)
│
├── vm/                                # VM configuration files
│   ├── docker-compose.yml             # Full stack: Prometheus + NGINX exporter + Grafana
│   ├── prometheus.yml                 # Prometheus scrape configuration
│   ├── nginx-stub-status.conf         # NGINX metrics endpoint config
│   └── grafana/                       # Grafana provisioning
│       └── provisioning/
│           ├── datasources/           # Auto-configured Prometheus datasource
│           │   └── prometheus.yml
│           └── dashboards/            # Dashboard provider config
│               └── dashboards.yml
│
├── scripts/                           # Automation scripts
│   ├── setup-vm-monitoring.sh         # ✅ Phase 2 deployment script
│   └── access-grafana.sh              # ✅ Quick access to dashboards
│
└── docs/                              # Documentation
    └── GRAFANA_SETUP.md               # Detailed Grafana setup guide
```

## 🎯 Getting Started with Grafana

### 1. Access Grafana

Run the access script and visit http://localhost:3000:

```bash
cd monitoring/gcp/scripts
./access-grafana.sh
```

**Login credentials:**
- Username: `admin`
- Password: `tornado2025!`

### 2. Verify Prometheus Data Source

1. Click **☰ menu** → **Connections** → **Data sources**
2. You should see **Prometheus** with a green checkmark ✅
3. Click on it to verify the connection

### 3. Import NGINX Dashboard

1. Click **☰ menu** → **Dashboards**
2. Click **New** → **Import**
3. Enter Dashboard ID: **`12708`**
4. Click **Load**
5. Select **Prometheus** as the data source
6. Click **Import**

You'll instantly see:
- 📈 Request rate and throughput
- 🔗 Active, waiting, and idle connections
- ⏱️ Connection handling performance
- 📊 Reading/writing/waiting states

### 4. Create Custom Queries

Try these PromQL queries in the Explore view:

**Current active connections:**
```promql
nginx_connections_active
```

**Request rate (requests per second):**
```promql
rate(nginx_http_requests_total[5m])
```

**95th percentile connection duration:**
```promql
histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket[5m]))
```

## 🔧 Management Commands

### View Logs

```bash
# All containers
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs -f"

# Specific container
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs -f grafana"
```

### Restart Services

```bash
# Restart all
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml restart"

# Restart specific service
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml restart grafana"
```

### Check Container Health

```bash
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml ps"
```

### Update Configuration

After modifying `docker-compose.yml` or `prometheus.yml` locally:

```bash
# Copy updated files
gcloud compute scp monitoring/gcp/vm/docker-compose.yml \
  docmosis-tornado-vm:/home/ryanhaines/monitoring/ \
  --zone=us-central1-c

# Restart stack
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="cd /home/ryanhaines/monitoring && docker-compose up -d"
```

## 📈 Metrics Available

### NGINX Metrics (from nginx-exporter)

```promql
# Connection metrics
nginx_connections_active              # Currently active connections
nginx_connections_reading             # Connections reading request
nginx_connections_writing             # Connections writing response
nginx_connections_waiting             # Idle keepalive connections

# Request metrics
nginx_http_requests_total             # Total HTTP requests served
nginx_connections_accepted            # Total accepted connections
nginx_connections_handled             # Total handled connections
```

### Prometheus Metrics

```promql
# Scrape performance
up{job="nginx"}                       # Target health (1=up, 0=down)
scrape_duration_seconds               # Time to scrape target
scrape_samples_scraped                # Number of samples collected

# Storage
prometheus_tsdb_head_samples          # Samples in memory
prometheus_tsdb_storage_blocks_bytes  # Storage size
```

### Node.js Cloud Run Metrics

```promql
# HTTP metrics
http_requests_total                   # Total HTTP requests
http_request_duration_seconds         # Request latency
http_requests_in_flight               # Concurrent requests

# Application metrics
form_submissions_total                # Form submissions
pipeline_executions_total             # Pipeline invocations
database_queries_total                # Database queries
```

## 🛠️ Troubleshooting

### Grafana Login Issues

**Problem:** Can't log in to Grafana

**Solution:**
```bash
# Reset password
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker exec -it grafana grafana-cli admin reset-admin-password tornado2025!"
```

### Prometheus Not Scraping NGINX

**Problem:** nginx_up metric shows 0

**Solution:**
```bash
# Check NGINX stub_status is accessible
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="curl -s http://localhost:8081/nginx_status"

# Check nginx-exporter logs
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs nginx-exporter --tail=20"
```

### SSH Tunnel Not Working

**Problem:** Can't access Grafana on localhost:3000

**Solution:**
1. Verify SSH tunnel is running:
   ```bash
   lsof -i :3000
   ```

2. Check for port conflicts:
   ```bash
   # Kill existing process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

3. Recreate tunnel:
   ```bash
   ./access-grafana.sh
   ```

### Container Won't Start

**Problem:** `docker-compose ps` shows container as "Exited"

**Solution:**
```bash
# View logs for error messages
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs <container-name>"

# Restart with fresh pull
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="cd /home/ryanhaines/monitoring && docker-compose down && docker-compose pull && docker-compose up -d"
```

## 💰 Cost Breakdown

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| **docmosis-tornado-vm** | $25 | Existing VM, already paid |
| **Prometheus** | $0 | Uses VM resources (~200MB RAM) |
| **NGINX exporter** | $0 | Minimal overhead (~10MB RAM) |
| **Grafana** | $0 | Uses VM resources (~100MB RAM) |
| **Storage (metrics)** | $0.10 | ~2GB Docker volumes |
| **TOTAL NEW COST** | **~$0.10/month** ✅ |

**Total monitoring impact:** Adds ~310MB RAM and 2GB disk to existing VM - well within capacity!

## 🎓 Learning Resources

### Prometheus
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

### Grafana
- [Grafana Fundamentals](https://grafana.com/tutorials/grafana-fundamentals/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Community Dashboards](https://grafana.com/grafana/dashboards/)

### NGINX Monitoring
- [NGINX Prometheus Exporter](https://github.com/nginxinc/nginx-prometheus-exporter)
- [Dashboard #12708](https://grafana.com/grafana/dashboards/12708)

## 🚦 Next Steps

### Phase 3: Google Managed Prometheus (Optional)

For long-term storage beyond 7 days and enterprise features:

1. Configure Prometheus remote_write to Google Managed Prometheus
2. Set up cross-service monitoring
3. Enable long-term metric retention
4. Add alerting and SLO tracking

See: `docs/MANAGED_PROMETHEUS_SETUP.md` (coming soon)

### Add More Dashboards

1. **System Metrics** - Monitor VM CPU, memory, disk
2. **Application Metrics** - Track custom app metrics
3. **Cloud Run Metrics** - Deep dive into Cloud Run performance
4. **Alerting** - Set up Grafana alerts for critical thresholds

### Security Hardening

1. Change default Grafana password
2. Enable HTTPS for Grafana (if exposing publicly)
3. Set up user accounts and permissions
4. Configure alert notifications (email, Slack, PagerDuty)

## 📞 Support

**Questions or issues?**
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review container logs for error messages
3. Verify SSH tunnel is active
4. Check [GRAFANA_SETUP.md](docs/GRAFANA_SETUP.md) for detailed setup info

---

**Monitoring Stack Version:** v2.0
**Last Updated:** October 23, 2025
**Status:** ✅ Production Ready
