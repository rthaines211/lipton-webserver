#!/bin/bash

#=============================================================================
# Access Grafana Dashboard via SSH Tunnel
#
# This script creates an SSH tunnel to access Grafana running on
# docmosis-tornado-vm from your local machine.
#
# Usage:
#   ./access-grafana.sh
#
# Then visit: http://localhost:3000
# Login: admin / tornado2025!
#=============================================================================

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="docmosis-tornado-vm"
VM_ZONE="us-central1-c"
PROJECT_ID="docmosis-tornado"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Grafana Dashboard Access${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Creating SSH tunnel to Grafana...${NC}"
echo ""
echo -e "${YELLOW}Access Grafana at:${NC} http://localhost:3000"
echo -e "${YELLOW}Username:${NC} admin"
echo -e "${YELLOW}Password:${NC} tornado2025!"
echo ""
echo -e "${BLUE}Press Ctrl+C to close the tunnel and exit${NC}"
echo ""

# Create SSH tunnel
gcloud compute ssh "$VM_NAME" \
  --zone="$VM_ZONE" \
  --project="$PROJECT_ID" \
  --ssh-flag='-L 3000:localhost:3000 -L 9090:localhost:9090 -N'
