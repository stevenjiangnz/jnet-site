#!/bin/bash
# Stop GitHub Actions runner
# Usage: ./stop-runner.sh <github-repo>

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
PID_FILE="${RUNNER_DIR}/.runner.pid"

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
    exit 1
fi

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}Runner is not running${NC}"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
    echo -e "${YELLOW}Runner process not found (stale PID file)${NC}"
    rm -f "$PID_FILE"
    exit 0
fi

# Stop the runner
echo -e "${YELLOW}Stopping runner (PID: $PID)...${NC}"

# Send SIGTERM for graceful shutdown
kill $PID 2>/dev/null || true

# Wait for process to stop (max 30 seconds)
for i in {1..30}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 1
done

echo ""

# Force kill if still running
if ps -p $PID > /dev/null 2>&1; then
    echo -e "${YELLOW}Force stopping runner...${NC}"
    kill -9 $PID 2>/dev/null || true
    sleep 1
fi

# Clean up PID file
rm -f "$PID_FILE"

echo -e "${GREEN}✓ Runner stopped${NC}"