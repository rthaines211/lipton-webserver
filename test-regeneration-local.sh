#!/bin/bash

# ============================================================================
# Local Regeneration Testing Script
# ============================================================================
# This script helps you test the document regeneration feature locally
# ============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     DOCUMENT REGENERATION - LOCAL TESTING                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check for existing submissions
echo -e "${BLUE}📁 Checking for existing form submissions...${NC}"
SUBMISSION_COUNT=$(ls -1 data/form-entry-*.json 2>/dev/null | wc -l | tr -d ' ')

if [ "$SUBMISSION_COUNT" -eq "0" ]; then
    echo -e "${RED}❌ No form submissions found in data/ directory${NC}"
    echo -e "${YELLOW}💡 You need to submit a form first before testing regeneration${NC}"
    echo ""
    echo "Options:"
    echo "1. Start the server (npm start) and submit a test form"
    echo "2. Or copy an existing form submission file to data/"
    exit 1
else
    echo -e "${GREEN}✅ Found $SUBMISSION_COUNT form submission(s)${NC}"
    echo ""
    echo "Recent submissions:"
    ls -lt data/form-entry-*.json | head -3 | awk '{print "   - " $9}'
fi

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Step 2: Check Python pipeline
echo -e "${BLUE}🐍 Checking Python pipeline...${NC}"

if [ ! -d "normalization work/venv" ]; then
    echo -e "${YELLOW}⚠️  Python virtual environment not found${NC}"
    echo -e "${YELLOW}   The pipeline is needed for document generation${NC}"
    echo ""
    read -p "Do you want to set up the Python pipeline now? (y/n): " SETUP_PIPELINE

    if [ "$SETUP_PIPELINE" = "y" ]; then
        echo "Setting up Python environment..."
        cd "normalization work"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
        echo -e "${GREEN}✅ Python environment ready${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping pipeline setup${NC}"
        echo -e "${YELLOW}   Note: Regeneration will fail without the pipeline${NC}"
    fi
else
    echo -e "${GREEN}✅ Python virtual environment found${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Step 3: Instructions to start services
echo -e "${BLUE}🚀 Ready to test regeneration!${NC}"
echo ""
echo "To test the regeneration feature, you need to:"
echo ""
echo -e "${YELLOW}Terminal 1 - Start Python Pipeline:${NC}"
echo "   cd \"normalization work\""
echo "   source venv/bin/activate"
echo "   uvicorn api.main:app --reload --port 5001"
echo ""
echo -e "${YELLOW}Terminal 2 - Start Node.js Server:${NC}"
echo "   npm start"
echo ""
echo -e "${YELLOW}Terminal 3 - Open Browser:${NC}"
echo "   http://localhost:3000"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo -e "${GREEN}📋 Testing Steps:${NC}"
echo "1. Click 'View Submissions' tab"
echo "2. Find a submission in the list"
echo "3. Click the blue regenerate button (🔄)"
echo "4. Select which documents to regenerate"
echo "5. Click 'Regenerate Selected Documents'"
echo "6. Watch the progress bar"
echo "7. After completion, close modal and re-open the submission"
echo "8. Verify no 404 error occurs"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# Offer to start services automatically
read -p "Do you want to start both services now? (y/n): " START_SERVICES

if [ "$START_SERVICES" = "y" ]; then
    echo ""
    echo -e "${GREEN}🚀 Starting services...${NC}"

    # Start Python pipeline in background
    echo "Starting Python pipeline on port 5001..."
    cd "normalization work"
    source venv/bin/activate
    nohup uvicorn api.main:app --reload --port 5001 > ../logs/pipeline.log 2>&1 &
    PIPELINE_PID=$!
    cd ..
    echo -e "${GREEN}✅ Python pipeline started (PID: $PIPELINE_PID)${NC}"

    # Wait a moment for pipeline to start
    sleep 3

    # Start Node.js server in background
    echo "Starting Node.js server on port 3000..."
    npm start > logs/server.log 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}✅ Node.js server started (PID: $SERVER_PID)${NC}"

    # Wait for services to fully start
    echo ""
    echo "Waiting for services to start..."
    sleep 5

    echo ""
    echo -e "${GREEN}✅ Both services are running!${NC}"
    echo ""
    echo "Service URLs:"
    echo "   🌐 Web App:  http://localhost:3000"
    echo "   🐍 Pipeline: http://localhost:5001"
    echo ""
    echo "Logs:"
    echo "   📄 Server:   tail -f logs/server.log"
    echo "   📄 Pipeline: tail -f logs/pipeline.log"
    echo ""
    echo "To stop services:"
    echo "   kill $SERVER_PID $PIPELINE_PID"
    echo ""

    # Open browser
    read -p "Open browser now? (y/n): " OPEN_BROWSER
    if [ "$OPEN_BROWSER" = "y" ]; then
        open http://localhost:3000
    fi
else
    echo ""
    echo -e "${YELLOW}ℹ️  Services not started. Start them manually using the commands above.${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
