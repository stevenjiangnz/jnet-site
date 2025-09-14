#!/bin/bash
# Start GitHub Actions runner
# Usage: ./start-runner.sh <github-repo>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 1 ]; then
    echo "Usage: $0 <github-repo>"
    echo "Example: $0 my-repo"
    exit 1
fi

GITHUB_REPO=$1
RUNNER_DIR="/home/sjiang/devlocal/jnet-site/setup/host-runner/runners/${GITHUB_REPO}"
LOG_DIR="/home/sjiang/devlocal/jnet-site/setup/host-runner/logs"
LOG_FILE="${LOG_DIR}/${GITHUB_REPO}.log"
PID_FILE="${RUNNER_DIR}/.runner.pid"

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
    echo "Please run setup-runner.sh first"
    exit 1
fi

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Runner is already running (PID: $PID)${NC}"
        exit 0
    else
        echo -e "${YELLOW}Removing stale PID file${NC}"
        rm -f "$PID_FILE"
    fi
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Start runner
echo -e "${GREEN}Starting runner for ${GITHUB_REPO}...${NC}"
cd "$RUNNER_DIR"

# Run in background
nohup ./run.sh > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

# Wait a moment to check if it started successfully
sleep 3

if ps -p $PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Runner started successfully (PID: $PID)${NC}"
    echo "Log file: $LOG_FILE"
    echo ""
    echo "To view logs:"
    echo -e "  ${YELLOW}tail -f $LOG_FILE${NC}"
    echo ""
    echo "To stop:"
    echo -e "  ${YELLOW}./scripts/stop-runner.sh ${GITHUB_REPO}${NC}"
else
    echo -e "${RED}✗ Failed to start runner${NC}"
    echo "Check logs: $LOG_FILE"
    tail -20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi