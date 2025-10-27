# Grafana Setup Guide

## Overview

This guide covers setting up Grafana to visualize metrics from:
- NGINX on docmosis-tornado-vm
- Node.js service on Cloud Run
- Python pipeline on Cloud Run
- Google Managed Prometheus

## Option 1: Google Cloud Managed Service for Grafana (Recommended)

### Benefits
- ✅ Fully managed - no infrastructure to maintain
- ✅ Native integration with Google Cloud Monitoring
- ✅ Built-in authentication with Google Cloud IAM
- ✅ Auto-scaling and high availability
- ✅ Pre-configured data sources for GCP

### Setup Steps

#### 1. Enable the Grafana API

```bash
gcloud services enable grafana.googleapis.com \
  --project=docmosis-tornado
```

#### 2. Create a Grafana Workspace

```bash
gcloud grafana workspaces create tornado-grafana \
  --display-name="Tornado Monitoring Grafana" \
  --project=docmosis-tornado \
  --location=us-central1
```

#### 3. Get the Grafana URL

```bash
gcloud grafana workspaces describe tornado-grafana \
  --location=us-central1 \
  --project=docmosis-tornado \
  --format="value(grafanaUri)"
```

#### 4. Grant Access to Users

```bash
# Grant yourself admin access
gcloud grafana workspaces add-iam-policy-binding tornado-grafana \
  --location=us-central1 \
  --project=docmosis-tornado \
  --member="user:YOUR_EMAIL@gmail.com" \
  --role="roles/grafana.admin"
```

#### 5. Access Grafana

Visit the URL from step 3 and log in with your Google account.

#### 6. Add Prometheus Data Source

In Grafana:
1. Go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - **Name**: `VM Prometheus`
   - **URL**: Create an SSH tunnel first (see below)
   - **Access**: `Server (default)`

### SSH Tunnel for Prometheus Access

Since your Prometheus is on a VM, you need an SSH tunnel:

```bash
# Terminal 1: Create tunnel
gcloud compute ssh docmosis-tornado-vm \
  --zone=us-central1-c \
  --project=docmosis-tornado \
  --ssh-flag='-L 9090:localhost:9090 -N'
```

Then in Grafana, use: `http://localhost:9090`

---

## Option 2: Self-Hosted Grafana on VM (Alternative)

If you prefer to run Grafana on your existing VM alongside Prometheus:

### Add to docker-compose.yml

```yaml
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped

    ports:
      - "3000:3000"

    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

    environment:
      - GF_SERVER_ROOT_URL=http://localhost:3000
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_USERS_ALLOW_SIGN_UP=false

    networks:
      - monitoring

    depends_on:
      - prometheus

volumes:
  grafana-data:
    driver: local
```

### Deploy

```bash
# Set admin password
export GRAFANA_ADMIN_PASSWORD="YourSecurePassword"

# Update docker-compose and restart
gcloud compute ssh docmosis-tornado-vm \
  --zone=us-central1-c \
  --project=docmosis-tornado \
  --command="cd /home/ryanhaines/monitoring && docker-compose up -d grafana"
```

### Access via SSH Tunnel

```bash
gcloud compute ssh docmosis-tornado-vm \
  --zone=us-central1-c \
  --project=docmosis-tornado \
  --ssh-flag='-L 3000:localhost:3000'
```

Then visit: http://localhost:3000

### Configure Prometheus Data Source

1. Log in to Grafana (admin/YourSecurePassword)
2. Go to **Configuration** → **Data Sources**
3. Click **Add data source**
4. Select **Prometheus**
5. Configure:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090` (uses Docker network)
   - **Access**: `Server (default)`
6. Click **Save & Test**

---

## Pre-Built NGINX Dashboard

Once you have Grafana set up with Prometheus as a data source:

### Import NGINX Dashboard

1. In Grafana, go to **Dashboards** → **Import**
2. Enter Dashboard ID: **12708** (NGINX Prometheus Exporter)
3. Click **Load**
4. Select your Prometheus data source
5. Click **Import**

This gives you instant visualization of:
- Request rate
- Active connections
- Request duration
- Response codes
- Upstream performance

### Custom Queries

Some useful PromQL queries for your dashboards:

```promql
# Active connections
nginx_connections_active

# Request rate (per second)
rate(nginx_http_requests_total[5m])

# Requests by status code
sum by (status) (rate(nginx_http_requests_total[5m]))

# 95th percentile request duration
histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket[5m]))
```

---

## Next Steps

### Phase 3: Google Managed Prometheus

To enable long-term storage and cross-service monitoring:

1. Configure Prometheus remote write to Google Managed Prometheus
2. Add Cloud Run metrics collection
3. Create unified dashboards across all services
4. Set up alerting rules

See: `MANAGED_PROMETHEUS_SETUP.md` (coming next)

---

## Troubleshooting

### Cannot Access Grafana UI

1. Verify service is running:
   ```bash
   docker-compose ps
   ```

2. Check logs:
   ```bash
   docker-compose logs grafana
   ```

3. Verify SSH tunnel is active:
   ```bash
   lsof -i :3000  # or :9090 for Prometheus
   ```

### Prometheus Data Source Not Working

1. Test Prometheus is accessible:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. Check Prometheus targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

3. Verify Grafana can reach Prometheus:
   - In Grafana data source config, click "Save & Test"
   - Should see "Data source is working"

---

## Security Notes

- **Managed Grafana**: Uses Google Cloud IAM for authentication
- **Self-hosted Grafana**: Only accessible via SSH tunnel (not exposed to internet)
- Change default admin password immediately
- Enable HTTPS in production
- Use strong passwords for any service accounts

---

## Cost Considerations

### Google Managed Service for Grafana
- ~$50-100/month for workspace
- Includes 10 active users
- Additional users: ~$5/user/month

### Self-Hosted Grafana
- Free (uses existing VM resources)
- Minimal resource overhead (~100MB RAM)
- Already have the VM running

---

## Resources

- [Google Cloud Managed Service for Grafana](https://cloud.google.com/grafana)
- [Grafana Documentation](https://grafana.com/docs/)
- [NGINX Dashboard #12708](https://grafana.com/grafana/dashboards/12708)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
