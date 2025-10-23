# Nginx Gateway - Complete Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [SSL/TLS with Cloudflare](#ssltls-with-cloudflare)
- [Operations & Maintenance](#operations--maintenance)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance Tuning](#performance-tuning)

---

## Overview

The Nginx gateway serves as the **single entry point** for all traffic to the Legal Form Application, running on the `docmosis-tornado-vm` GCP Compute Engine instance. It acts as an intelligent reverse proxy that:

1. **Routes document generation** → Local Docmosis Tornado (port 8080)
2. **Routes application traffic** → Cloud Run Node.js server (with auto-auth)
3. **Handles SSL termination** → via Cloudflare (upstream)
4. **Injects authentication** → Automatic token injection for Cloud Run
5. **Manages large uploads** → 100MB support for forms and templates

### Key Benefits

| Feature | Benefit |
|---------|---------|
| **Single Entry Point** | Simplified routing, easier monitoring |
| **Local Docmosis Access** | Zero network latency for document generation |
| **Automatic Auth Injection** | Users don't need to manage tokens |
| **Request Transformation** | Dynamic backend URLs, smart query handling |
| **Cloudflare Integration** | Free SSL, DDoS protection, global CDN |

---

## Architecture

### Traffic Flow

```
Internet User
    ↓ HTTPS
Cloudflare CDN (SSL termination, DDoS protection)
    ↓ HTTP
Nginx (docmosis-tornado-vm:80)
    ├─→ /api/render → Docmosis (localhost:8080)
    └─→ /* → Cloud Run (https://node-server-***.a.run.app?token=***)
```

### VM Details

```yaml
VM Instance: docmosis-tornado-vm
Zone: us-central1-a
Machine Type: e2-standard-2 (2 vCPU, 8 GB RAM)
Internal IP: 10.128.0.3
External IP: 136.114.198.83
Domain: docs.liptonlegal.com (via Cloudflare)

Services:
  - Nginx 1.18.0 (port 80)
  - Docmosis Tornado 2.9.x (port 8080)
  - Ubuntu 22.04 LTS
```

---

## Installation & Setup

### 1. Install Nginx

```bash
# Update package lists
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v
# Output: nginx version: nginx/1.18.0 (Ubuntu)
```

### 2. Create Site Configuration

```bash
# Create the Nginx configuration for Legal Form Application
sudo bash -c 'cat > /etc/nginx/sites-available/tornado << EOF
server {
    listen 80;
    server_name docs.liptonlegal.com;

    # Add DNS resolver - IPv4 only
    resolver 8.8.8.8 8.8.4.4 valid=300s ipv6=off;
    resolver_timeout 5s;

    # Route /api/render to local Docmosis service
    location /api/render {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Support large file uploads
        client_max_body_size 100M;

        # Timeouts for document generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Route everything else to Cloud Run node-server
    location / {
        set \$backend "node-server-zyiwmzwenq-uc.a.run.app";
        set \$token "a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4";

        set \$token_param "?token=\$token";
        if (\$is_args) {
            set \$token_param "&token=\$token";
        }

        proxy_pass https://\$backend\$uri\$is_args\$args\$token_param;

        proxy_set_header Host \$backend;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_ssl_server_name on;

        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF'
```

### 3. Enable Site and Restart Nginx

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/tornado /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
# Output should be:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### 4. Verify Nginx is Running

```bash
# Check Nginx status
sudo systemctl status nginx

# Should show: active (running)

# Check listening ports
sudo netstat -tlnp | grep nginx
# Should show: tcp 0.0.0.0:80 LISTEN

# Test local connectivity
curl -I http://localhost
# Should return HTTP 200 or redirect
```

---

## Configuration

### Configuration File Location

```
/etc/nginx/sites-available/tornado    # Main configuration
/etc/nginx/sites-enabled/tornado      # Symlink to active config
/etc/nginx/nginx.conf                 # Global Nginx config
/var/log/nginx/access.log             # Access logs
/var/log/nginx/error.log              # Error logs
```

### Line-by-Line Configuration Explanation

#### DNS Resolver
```nginx
resolver 8.8.8.8 8.8.4.4 valid=300s ipv6=off;
resolver_timeout 5s;
```
- **Purpose**: Resolves Cloud Run dynamic DNS names
- **8.8.8.8**: Google's primary DNS server
- **8.8.4.4**: Google's secondary DNS server
- **valid=300s**: Cache DNS results for 5 minutes
- **ipv6=off**: Disable IPv6 resolution (Cloud Run uses IPv4)
- **timeout 5s**: DNS lookup fails after 5 seconds

#### Location: `/api/render` (Docmosis)

```nginx
location /api/render {
    proxy_pass http://localhost:8080;
```
- **Matches**: `https://docs.liptonlegal.com/api/render/*`
- **Proxies to**: `http://localhost:8080/api/render/*`
- **Use case**: Document generation requests

```nginx
    client_max_body_size 100M;
```
- **Purpose**: Allow large template uploads (up to 100MB)
- **Default**: 1MB (would reject large files)

```nginx
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
```
- **read_timeout**: Wait up to 5 minutes for Docmosis response
- **connect_timeout**: Wait up to 75 seconds to connect to Docmosis
- **Reason**: Complex documents can take several minutes to generate

#### Location: `/` (Cloud Run)

```nginx
location / {
    set $backend "node-server-zyiwmzwenq-uc.a.run.app";
    set $token "a0ae8df2d793c8c4dcaebe22095479aa7241605f06b057a3e057919ab5b95ed4";
```
- **Variables**: Store backend URL and auth token
- **Benefit**: Easy to update without changing entire config

```nginx
    set $token_param "?token=$token";
    if ($is_args) {
        set $token_param "&token=$token";
    }
```
- **Smart token injection**:
  - If URL has no query params: Add `?token=***`
  - If URL has existing params: Add `&token=***`
- **Example**:
  - `/api/cases` → `/api/cases?token=***`
  - `/api/cases?id=123` → `/api/cases?id=123&token=***`

```nginx
    proxy_pass https://$backend$uri$is_args$args$token_param;
```
- **Constructs final URL**:
  - `$backend`: Cloud Run hostname
  - `$uri`: Original request path
  - `$is_args`: `?` if query params exist, empty otherwise
  - `$args`: Original query parameters
  - `$token_param`: Injected auth token

```nginx
    proxy_ssl_server_name on;
```
- **Enables SNI**: Required for Cloud Run HTTPS
- **Without this**: SSL handshake fails

### Updating the Access Token

If the Cloud Run access token changes:

```bash
# Method 1: Edit config file
sudo nano /etc/nginx/sites-available/tornado

# Find this line:
set $token "OLD_TOKEN_HERE";

# Replace with new token:
set $token "NEW_TOKEN_HERE";

# Save and test
sudo nginx -t
sudo systemctl reload nginx

# Method 2: One-liner sed command
sudo sed -i 's/OLD_TOKEN/NEW_TOKEN/g' /etc/nginx/sites-available/tornado
sudo nginx -t && sudo systemctl reload nginx
```

### Updating the Cloud Run Backend URL

If the Cloud Run service URL changes:

```bash
# Edit config
sudo nano /etc/nginx/sites-available/tornado

# Find this line:
set $backend "OLD-URL.a.run.app";

# Replace with new URL:
set $backend "NEW-URL.a.run.app";

# Apply changes
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS with Cloudflare

### Architecture

```
User Browser (HTTPS) → Cloudflare (SSL termination) → Nginx (HTTP) → Backend
```

**Why this setup?**
- Cloudflare provides **free SSL certificates**
- Automatic renewal (no Let's Encrypt maintenance)
- DDoS protection included
- Global CDN for static assets

### Cloudflare Configuration

#### 1. DNS Settings

```
Type: A
Name: docs.liptonlegal.com
Value: 136.114.198.83 (VM external IP)
Proxy: Enabled (orange cloud)
TTL: Auto
```

#### 2. SSL/TLS Settings

Navigate to: **SSL/TLS** → **Overview**

**SSL/TLS Encryption Mode:** `Flexible`
- User → Cloudflare: **HTTPS (encrypted)**
- Cloudflare → Nginx: **HTTP (plaintext)**

**Alternative (More Secure): `Full`**
- Requires SSL certificate on Nginx
- Both hops encrypted
- Setup guide below

#### 3. Optional: Origin Certificate (Full SSL)

If you want end-to-end encryption:

```bash
# 1. Go to Cloudflare: SSL/TLS → Origin Server
# 2. Create Certificate (15 year validity)
# 3. Download: cert.pem and key.pem

# 4. Copy to VM
sudo mkdir -p /etc/nginx/ssl
sudo nano /etc/nginx/ssl/cert.pem  # Paste certificate
sudo nano /etc/nginx/ssl/key.pem   # Paste private key
sudo chmod 600 /etc/nginx/ssl/key.pem

# 5. Update Nginx config
sudo nano /etc/nginx/sites-available/tornado
```

Add SSL configuration:
```nginx
server {
    listen 443 ssl;
    server_name docs.liptonlegal.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name docs.liptonlegal.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Firewall Configuration

Update GCP firewall to restrict traffic to Cloudflare IPs only:

```bash
# Get Cloudflare IP ranges
curl https://www.cloudflare.com/ips-v4

# Create firewall rule in GCP Console:
# Name: allow-http-from-cloudflare
# Direction: Ingress
# Targets: docmosis-tornado-vm
# Source IP ranges: (paste Cloudflare IPs)
# Protocols: tcp:80,tcp:443
```

---

## Operations & Maintenance

### Daily Operations

#### Check Nginx Status
```bash
sudo systemctl status nginx
```

#### View Recent Logs
```bash
# Last 50 lines of access log
sudo tail -n 50 /var/log/nginx/access.log

# Last 50 lines of error log
sudo tail -n 50 /var/log/nginx/error.log

# Follow logs in real-time
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Restart/Reload Nginx

```bash
# Reload config (zero downtime)
sudo systemctl reload nginx

# Restart Nginx (brief downtime)
sudo systemctl restart nginx

# Stop Nginx
sudo systemctl stop nginx

# Start Nginx
sudo systemctl start nginx
```

### Configuration Testing

**Always test before reloading:**
```bash
# Test configuration syntax
sudo nginx -t

# Output if successful:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# If errors, fix them before reloading
```

### Log Rotation

Nginx logs can grow large. Ubuntu comes with automatic log rotation:

```bash
# View rotation config
cat /etc/logrotate.d/nginx

# Default rotation:
# - Daily rotation
# - Keep 14 days of logs
# - Compress old logs (gzip)
```

Manual log rotation:
```bash
# Force rotation now
sudo logrotate -f /etc/logrotate.d/nginx

# Verify
ls -lh /var/log/nginx/
```

### Backup Configuration

```bash
# Backup Nginx config
sudo cp /etc/nginx/sites-available/tornado \
       /etc/nginx/sites-available/tornado.backup.$(date +%Y%m%d)

# Restore from backup
sudo cp /etc/nginx/sites-available/tornado.backup.20251023 \
       /etc/nginx/sites-available/tornado
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring

### Real-Time Monitoring

#### Active Connections
```bash
# Show active connections
curl http://localhost/nginx_status

# Or use netstat
sudo netstat -an | grep :80 | wc -l
```

#### Access Log Analysis
```bash
# Count requests per minute
sudo tail -n 1000 /var/log/nginx/access.log | \
  awk '{print $4}' | cut -d: -f1-2 | sort | uniq -c | tail -n 10

# Top 10 requested URLs
sudo awk '{print $7}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -n 10

# Response status codes
sudo awk '{print $9}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn

# Average response time (requires custom log format)
sudo awk '{sum+=$10; count++} END {print sum/count}' /var/log/nginx/access.log
```

### Metrics Collection

#### Install nginx-prometheus-exporter

```bash
# Download Prometheus exporter
wget https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v0.11.0/nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz

# Extract
tar xzf nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz
sudo mv nginx-prometheus-exporter /usr/local/bin/

# Create systemd service
sudo bash -c 'cat > /etc/systemd/system/nginx-exporter.service << EOF
[Unit]
Description=Nginx Prometheus Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nginx-prometheus-exporter -nginx.scrape-uri=http://localhost/nginx_status
Restart=always

[Install]
WantedBy=multi-user.target
EOF'

# Start exporter
sudo systemctl daemon-reload
sudo systemctl enable nginx-exporter
sudo systemctl start nginx-exporter

# Metrics available at: http://localhost:9113/metrics
```

### GCP Cloud Monitoring

Create uptime check in GCP Console:

```
Uptime Check Name: nginx-docs-liptonlegal
Resource Type: URL
Hostname: docs.liptonlegal.com
Path: /health
Check Frequency: 1 minute
Regions: 3+ (usa, europe, asia)
```

Set up alerts:
```
Alert Name: Nginx Down
Condition: Uptime check fails
Duration: 2 minutes
Notification: Email, SMS
```

---

## Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway

**Symptoms:**
- User sees "502 Bad Gateway" error
- Nginx returns 502 status code

**Possible Causes:**

**A) Docmosis is down (for `/api/render` requests)**
```bash
# Check if Docmosis is running
sudo netstat -tlnp | grep :8080

# If not running, start Docmosis
sudo systemctl start docmosis  # (adjust service name)

# Check Docmosis logs
sudo journalctl -u docmosis -n 50
```

**B) Cloud Run is down or unreachable**
```bash
# Test Cloud Run directly
curl -I https://node-server-zyiwmzwenq-uc.a.run.app

# Check Nginx error log
sudo tail -n 50 /var/log/nginx/error.log

# Look for DNS resolution errors or SSL errors
```

**C) Firewall blocking outbound HTTPS**
```bash
# Test outbound connectivity
curl -I https://www.google.com

# If fails, check GCP firewall egress rules
```

#### 2. 504 Gateway Timeout

**Symptoms:**
- Request takes >300 seconds
- 504 error returned

**Solutions:**

```bash
# Increase timeout in Nginx config
sudo nano /etc/nginx/sites-available/tornado

# Change these values:
proxy_read_timeout 600s;      # 10 minutes
proxy_connect_timeout 120s;   # 2 minutes

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 413 Request Entity Too Large

**Symptoms:**
- File upload fails
- 413 error on large form submissions

**Solution:**

```bash
# Increase max body size
sudo nano /etc/nginx/sites-available/tornado

# Change:
client_max_body_size 200M;  # Increase from 100M

# Reload
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Authentication Token Not Working

**Symptoms:**
- Cloud Run returns 401 Unauthorized
- Token appears to be missing

**Debug:**

```bash
# Enable debug logging
sudo nano /etc/nginx/sites-available/tornado

# Add to location / block:
error_log /var/log/nginx/debug.log debug;

# Reload and check debug log
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/debug.log

# Look for final proxy_pass URL - should include token
```

#### 5. DNS Resolution Failures

**Symptoms:**
- Error log shows: "could not be resolved"
- 502 errors for Cloud Run requests

**Solutions:**

```bash
# Test DNS resolution
dig @8.8.8.8 node-server-zyiwmzwenq-uc.a.run.app

# If fails, try different resolver
sudo nano /etc/nginx/sites-available/tornado

# Change resolver:
resolver 1.1.1.1 1.0.0.1 valid=300s ipv6=off;  # Cloudflare DNS

# Reload
sudo systemctl reload nginx
```

### Emergency Procedures

#### Nginx Completely Down

```bash
# 1. Check if process is running
ps aux | grep nginx

# 2. Try to start
sudo systemctl start nginx

# 3. If start fails, check error log
sudo journalctl -u nginx -n 50

# 4. Test config
sudo nginx -t

# 5. If config has errors, restore backup
sudo cp /etc/nginx/sites-available/tornado.backup.YYYYMMDD \
       /etc/nginx/sites-available/tornado
sudo nginx -t
sudo systemctl start nginx
```

#### Emergency: Bypass Nginx (Temporary)

If Nginx is down and you need immediate access:

```bash
# 1. Update Cloudflare DNS to point directly to Cloud Run
# A record: docs.liptonlegal.com → node-server-zyiwmzwenq-uc.a.run.app

# WARNING: This bypasses Docmosis - /api/render will not work
# Users must manually add ?token=*** to URLs
```

---

## Security

### Best Practices

#### 1. Hide Nginx Version
```bash
sudo nano /etc/nginx/nginx.conf

# Add to http block:
server_tokens off;

# Reload
sudo systemctl reload nginx
```

#### 2. Restrict Access to Cloudflare IPs Only

```bash
# Create IP whitelist
sudo nano /etc/nginx/conf.d/cloudflare-ips.conf
```

```nginx
# Cloudflare IPv4 ranges (update quarterly)
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
# ... (add all Cloudflare IPs from https://www.cloudflare.com/ips/)

real_ip_header CF-Connecting-IP;
```

#### 3. Rate Limiting

```bash
sudo nano /etc/nginx/sites-available/tornado

# Add to http block:
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Add to location / block:
limit_req zone=api burst=20 nodelay;
```

#### 4. Secure Headers

```nginx
# Add to server block
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Access Control

```bash
# View who has SSH access to VM
gcloud compute instances describe docmosis-tornado-vm \
  --zone=us-central1-a \
  --format="value(metadata.items.filter(key:ssh-keys))"
```

### Audit Logging

```bash
# Enable detailed access logging
sudo nano /etc/nginx/sites-available/tornado

# Add custom log format:
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct=$upstream_connect_time '
                    'uht=$upstream_header_time urt=$upstream_response_time';

# Use in location blocks:
access_log /var/log/nginx/access.log detailed;
```

---

## Performance Tuning

### Worker Processes

```bash
sudo nano /etc/nginx/nginx.conf

# Set based on CPU cores (VM has 2 vCPU)
worker_processes 2;

# Connections per worker
events {
    worker_connections 2048;  # Default: 768
}
```

### Connection Keep-Alive

```nginx
# In http block
keepalive_timeout 65;
keepalive_requests 100;

# For upstream connections
upstream backend {
    server node-server-zyiwmzwenq-uc.a.run.app:443;
    keepalive 32;
}
```

### Caching (Optional)

```nginx
# Cache static assets from Cloud Run
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=static_cache:10m max_size=1g inactive=60m;

location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    proxy_cache static_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status;

    # Proxy to Cloud Run
    proxy_pass https://$backend$uri$is_args$args;
}
```

### Compression

```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript
           application/x-javascript application/xml+rss application/json;
```

### Connection Limits

```nginx
# Limit connections per IP
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
limit_conn conn_limit_per_ip 10;
```

---

## Additional Resources

### Documentation
- **Nginx Docs**: https://nginx.org/en/docs/
- **Nginx Variables**: https://nginx.org/en/docs/varindex.html
- **Proxy Module**: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

### Monitoring Tools
- **GoAccess**: Real-time log analyzer
- **nginx-amplify**: Free Nginx monitoring (by Nginx Inc)
- **Prometheus + Grafana**: Metrics visualization

### Related Documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Full system architecture
- [DEPLOYMENT_GUIDE.md](../deployment/DEPLOYMENT_GUIDE.md) - Deployment procedures
- [OPERATIONS_GUIDE.md](../operations/OPERATIONS_GUIDE.md) - Operations handbook

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Maintained By:** DevOps Team
