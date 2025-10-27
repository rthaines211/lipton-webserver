# Monitoring Stack - Quick Reference

**Quick access to common commands and information.**

---

## 🚀 Access Dashboards

### Grafana (Recommended)

```bash
cd monitoring/gcp/scripts
./access-grafana.sh
```

**Then visit:** http://localhost:3000
**Login:** `admin` / `tornado2025!`

### Prometheus (Raw Data)

While Grafana SSH tunnel is running, also visit: http://localhost:9090

---

## 📊 Pre-Built Dashboards

### Import NGINX Dashboard

1. Open Grafana → **Dashboards** → **New** → **Import**
2. Enter ID: **`12708`**
3. Select **Prometheus** datasource
4. Click **Import**

### Other Popular Dashboards

- **Node Exporter Full** - ID: `1860` (if you add node-exporter)
- **Docker Container** - ID: `193` (if you add cadvisor)
- **Prometheus Stats** - ID: `3662`

---

## 🔧 Common Commands

### Check Status

```bash
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml ps"
```

### View Logs

```bash
# All containers
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs -f"

# Just Grafana
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs -f grafana"
```

### Restart Services

```bash
# Restart all
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml restart"

# Restart just Grafana
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml restart grafana"
```

---

## 📈 Useful PromQL Queries

### NGINX Metrics

```promql
# Current active connections
nginx_connections_active

# Requests per second (5min average)
rate(nginx_http_requests_total[5m])

# Connection states
nginx_connections_reading
nginx_connections_writing
nginx_connections_waiting

# Total requests served
nginx_http_requests_total
```

### Cloud Run Metrics

```promql
# HTTP requests per second
rate(http_requests_total[5m])

# Request duration (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Form submissions per hour
increase(form_submissions_total[1h])

# Database queries per minute
rate(database_queries_total[1m])
```

### System Health

```promql
# Check if target is up
up{job="nginx"}

# Scrape duration
scrape_duration_seconds{job="nginx"}

# Prometheus storage size
prometheus_tsdb_storage_blocks_bytes / 1024 / 1024 / 1024  # In GB
```

---

## 🛠️ Troubleshooting

### Can't Access Grafana

1. Check SSH tunnel is running:
   ```bash
   lsof -i :3000
   ```

2. Kill existing processes and retry:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ./access-grafana.sh
   ```

### Container Not Running

```bash
# Check status
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml ps"

# Check logs for errors
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml logs <container-name>"

# Restart
gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
  --command="docker-compose -f /home/ryanhaines/monitoring/docker-compose.yml restart <container-name>"
```

### Metrics Not Showing

1. Check Prometheus targets are UP:
   - Visit http://localhost:9090/targets (via SSH tunnel)
   - All targets should show "UP" in green

2. Verify NGINX stub_status is working:
   ```bash
   gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
     --command="curl -s http://localhost:8081/nginx_status"
   ```

3. Check nginx-exporter can reach NGINX:
   ```bash
   gcloud compute ssh docmosis-tornado-vm --zone=us-central1-c \
     --command="curl -s http://localhost:9113/metrics | grep nginx_up"
   ```
   Should show: `nginx_up 1`

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `monitoring/gcp/README.md` | Complete guide |
| `monitoring/gcp/PHASE2_COMPLETE.md` | Deployment details |
| `monitoring/gcp/scripts/access-grafana.sh` | Quick dashboard access |
| `monitoring/gcp/vm/docker-compose.yml` | Container definitions |
| `monitoring/gcp/vm/prometheus.yml` | Prometheus config |
| `monitoring/gcp/docs/GRAFANA_SETUP.md` | Grafana detailed guide |

---

## 🔑 Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| Grafana | http://localhost:3000 | `admin` | `tornado2025!` |
| Prometheus | http://localhost:9090 | — | — |

---

## 💡 Quick Tips

1. **Keep SSH tunnel running** while using dashboards (it's the connection)

2. **Import dashboards by ID** from https://grafana.com/grafana/dashboards/

3. **Use Explore view** in Grafana to test PromQL queries before adding to dashboards

4. **Check Prometheus targets** first if metrics aren't showing: http://localhost:9090/targets

5. **Change default password** after first login for security

6. **Star important dashboards** to find them easily later

7. **Set time range** in top-right (default is last 6 hours)

8. **Use variables** in dashboards for flexible filtering (job, instance, etc.)

---

## 📞 Need Help?

1. Check [README.md](README.md) for full documentation
2. Review [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for deployment details
3. Look at container logs for error messages
4. Check [Troubleshooting](#troubleshooting) section above

---

**Last Updated:** October 23, 2025
**Monitoring Stack Version:** 2.0
