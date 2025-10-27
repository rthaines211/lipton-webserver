#!/bin/bash

#=============================================================================
# Setup Prometheus Monitoring on docmosis-tornado-vm
#
# This script automates the deployment of Prometheus and nginx-exporter
# on the existing docmosis-tornado-vm.
#
# What it does:
# 1. Creates monitoring directory structure on VM
# 2. Copies Prometheus and docker-compose configuration
# 3. Updates NGINX with stub_status endpoint
# 4. Starts Prometheus and nginx-exporter containers
# 5. Verifies everything is working
#
# Prerequisites:
# - gcloud CLI authenticated
# - SSH access to docmosis-tornado-vm
# - Docker and Docker Compose installed on VM
#
# Usage:
#   cd monitoring/gcp/scripts
#   chmod +x setup-vm-monitoring.sh
#   ./setup-vm-monitoring.sh
#
#=============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="docmosis-tornado-vm"
VM_ZONE="us-central1-c"
PROJECT_ID="docmosis-tornado"

# Detect the SSH user's home directory on the VM
# This will be set dynamically after we SSH into the VM
MONITORING_DIR=""  # Will be set to $HOME/monitoring on the VM

# Script directory (where this script is located)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VM_CONFIG_DIR="$SCRIPT_DIR/../vm"

#=============================================================================
# Helper Functions
#=============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

#=============================================================================
# Validation
#=============================================================================

print_header "Validating Prerequisites"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi
print_success "gcloud CLI installed"

# Check if configuration files exist
if [ ! -f "$VM_CONFIG_DIR/docker-compose.yml" ]; then
    print_error "docker-compose.yml not found at $VM_CONFIG_DIR"
    exit 1
fi
print_success "Configuration files found"

# Check if prometheus.yml exists
if [ ! -f "$VM_CONFIG_DIR/prometheus.yml" ]; then
    print_error "prometheus.yml not found at $VM_CONFIG_DIR"
    exit 1
fi
print_success "Prometheus configuration found"

# Check VM exists and is running
print_info "Checking VM status..."
VM_STATUS=$(gcloud compute instances describe $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --format='value(status)' 2>/dev/null || echo "NOT_FOUND")

if [ "$VM_STATUS" != "RUNNING" ]; then
    print_error "VM $VM_NAME is not running (status: $VM_STATUS)"
    exit 1
fi
print_success "VM is running"

#=============================================================================
# Detect SSH User and Create Monitoring Directory Structure on VM
#=============================================================================

print_header "Creating Directory Structure on VM"

# First, detect the SSH user and their home directory
print_info "Detecting SSH user and home directory..."
VM_USER=$(gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="whoami" 2>/dev/null | tr -d '\r')

VM_HOME=$(gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="echo \$HOME" 2>/dev/null | tr -d '\r')

MONITORING_DIR="$VM_HOME/monitoring"

print_success "Detected user: $VM_USER, home: $VM_HOME"
print_info "Monitoring directory will be: $MONITORING_DIR"

# Create directory structure with proper permissions
# Note: We only create the monitoring directory; Docker will manage the data volume
gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="
        mkdir -p $MONITORING_DIR && \
        chmod 755 $MONITORING_DIR && \
        echo 'Directory created successfully at $MONITORING_DIR'
    "

print_success "Directory structure created at $MONITORING_DIR"

#=============================================================================
# Copy Configuration Files to VM
#=============================================================================

print_header "Copying Configuration Files to VM"

# Copy docker-compose.yml
print_info "Copying docker-compose.yml..."
gcloud compute scp "$VM_CONFIG_DIR/docker-compose.yml" \
    "$VM_NAME:$MONITORING_DIR/" \
    --zone="$VM_ZONE" \
    --project="$PROJECT_ID"

print_success "docker-compose.yml copied"

# Copy prometheus.yml
print_info "Copying prometheus.yml..."
gcloud compute scp "$VM_CONFIG_DIR/prometheus.yml" \
    "$VM_NAME:$MONITORING_DIR/" \
    --zone="$VM_ZONE" \
    --project="$PROJECT_ID"

print_success "prometheus.yml copied"

# Copy NGINX stub status configuration
print_info "Copying NGINX stub status configuration..."
gcloud compute scp "$VM_CONFIG_DIR/nginx-stub-status.conf" \
    "$VM_NAME:/tmp/nginx-stub-status.conf" \
    --zone="$VM_ZONE" \
    --project="$PROJECT_ID"

print_success "NGINX configuration copied"

#=============================================================================
# Update NGINX Configuration
#=============================================================================

print_header "Configuring NGINX Stub Status"

print_warning "This will update your NGINX configuration"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping NGINX configuration. You'll need to configure it manually."
else
    gcloud compute ssh $VM_NAME \
        --zone=$VM_ZONE \
        --project=$PROJECT_ID \
        --command="
            # Copy configuration to sites-available
            sudo cp /tmp/nginx-stub-status.conf /etc/nginx/sites-available/stub-status

            # Create symlink to sites-enabled
            sudo ln -sf /etc/nginx/sites-available/stub-status /etc/nginx/sites-enabled/

            # Test NGINX configuration
            sudo nginx -t

            # Reload NGINX
            sudo systemctl reload nginx

            # Test stub_status endpoint
            sleep 2
            curl -s http://127.0.0.1:8081/nginx_status
        "

    print_success "NGINX configured and reloaded"
fi

#=============================================================================
# Install Docker Compose (if not already installed)
#=============================================================================

print_header "Setting Up Docker and Docker Compose"

# Check and install docker-compose
print_info "Checking Docker and Docker Compose installation..."

gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="
        # Test if docker-compose works
        if docker-compose version &>/dev/null; then
            echo 'Docker Compose is already installed and working'
            docker-compose version
        else
            echo 'Installing Docker Compose standalone binary...'

            # Download latest stable docker-compose
            sudo curl -L \"https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose

            # Make it executable
            sudo chmod +x /usr/local/bin/docker-compose

            # Create symlink for backward compatibility
            sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

            # Verify installation
            docker-compose version

            echo 'Docker Compose installed successfully'
        fi

        # Ensure user is in docker group
        if ! groups | grep -q docker; then
            echo 'Adding user to docker group...'
            sudo usermod -aG docker \$USER
            echo 'User added to docker group. Note: You may need to log out and back in for group changes to take effect.'
        else
            echo 'User is already in docker group'
        fi

        # Try to use docker without sudo
        if ! docker ps &>/dev/null; then
            echo 'Enabling docker socket permissions...'
            sudo chmod 666 /var/run/docker.sock
        fi
    "

print_success "Docker Compose setup complete"

#=============================================================================
# Start Monitoring Stack
#=============================================================================

print_header "Starting Monitoring Stack"

gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="
        cd $MONITORING_DIR

        # Pull latest images
        docker-compose pull

        # Start containers
        docker-compose up -d

        # Wait for containers to start
        sleep 10

        # Show container status
        docker-compose ps

        # Show logs
        docker-compose logs --tail=20
    "

print_success "Monitoring stack started"

#=============================================================================
# Verification
#=============================================================================

print_header "Verifying Installation"

print_info "Checking container health..."

HEALTH_STATUS=$(gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="docker-compose -f $MONITORING_DIR/docker-compose.yml ps --format=json" 2>/dev/null)

print_info "Testing metrics endpoints..."

# Test NGINX exporter
gcloud compute ssh $VM_NAME \
    --zone=$VM_ZONE \
    --project=$PROJECT_ID \
    --command="
        echo 'Testing NGINX Exporter:'
        curl -s http://localhost:9113/metrics | head -10
        echo ''
        echo 'Testing Prometheus:'
        curl -s http://localhost:9090/-/healthy
    "

print_success "Metrics endpoints are responding"

#=============================================================================
# Summary
#=============================================================================

print_header "Installation Complete!"

echo -e "${GREEN}Monitoring stack successfully deployed to $VM_NAME${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify Prometheus targets: http://localhost:9090/targets (via SSH tunnel)"
echo "  2. Check metrics are flowing to Google Managed Prometheus"
echo "  3. Proceed to Phase 3: Configure Managed Prometheus"
echo ""
echo "SSH tunnel command:"
echo -e "  ${YELLOW}gcloud compute ssh $VM_NAME --zone=$VM_ZONE --ssh-flag='-L 9090:localhost:9090'${NC}"
echo "  Then visit: http://localhost:9090"
echo ""
echo "View logs:"
echo -e "  ${YELLOW}gcloud compute ssh $VM_NAME --zone=$VM_ZONE --command='cd $MONITORING_DIR && docker-compose logs -f'${NC}"
echo ""
echo "Restart services:"
echo -e "  ${YELLOW}gcloud compute ssh $VM_NAME --zone=$VM_ZONE --command='cd $MONITORING_DIR && docker-compose restart'${NC}"
echo ""

print_success "Setup complete!"
