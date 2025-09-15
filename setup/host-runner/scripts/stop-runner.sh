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

# Find the actual Runner.Listener process
RUNNER_PID=$(pgrep -f "${RUNNER_DIR}/bin/Runner.Listener" || true)

if [ -z "$RUNNER_PID" ]; then
    echo -e "${YELLOW}Runner is not running${NC}"
    # Clean up stale PID file if exists
    rm -f "$PID_FILE"
    exit 0
fi

# Stop the runner
echo -e "${YELLOW}Stopping runner (PID: $RUNNER_PID)...${NC}"

# Send SIGTERM for graceful shutdown
kill $RUNNER_PID 2>/dev/null || true

# Wait for process to stop (max 30 seconds)
echo -n "Waiting for runner to stop"
for i in {1..30}; do
    if ! ps -p $RUNNER_PID > /dev/null 2>&1; then
        echo ""
        break
    fi
    echo -n "."
    sleep 1
done

echo ""

# Force kill if still running
if ps -p $RUNNER_PID > /dev/null 2>&1; then
    echo -e "${YELLOW}Force stopping runner...${NC}"
    kill -9 $RUNNER_PID 2>/dev/null || true
    sleep 1
fi

# Also kill any related processes (run.sh, run-helper.sh)
pkill -f "${RUNNER_DIR}/run.sh" 2>/dev/null || true
pkill -f "${RUNNER_DIR}/run-helper.sh" 2>/dev/null || true

# Clean up PID file
rm -f "$PID_FILE"

# Final check
if pgrep -f "${RUNNER_DIR}/bin/Runner.Listener" > /dev/null 2>&1; then
    echo -e "${RED}✗ Failed to stop runner completely${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Runner stopped${NC}"
fi