#!/bin/bash
# Stop GitHub Actions runner on Mac
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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_DIR="${BASE_DIR}/runners/${GITHUB_REPO}"
PID_FILE="${RUNNER_DIR}/.runner.pid"

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
    exit 1
fi

# Find Runner.Listener process
RUNNER_PID=$(pgrep -f "${RUNNER_DIR}/bin/Runner.Listener" || true)

if [ -z "$RUNNER_PID" ]; then
    echo -e "${YELLOW}Runner is not running${NC}"
    rm -f "$PID_FILE"
    exit 0
fi

echo -e "${YELLOW}Stopping runner (PID: $RUNNER_PID)...${NC}"

# Send SIGTERM first (graceful shutdown)
kill -TERM $RUNNER_PID 2>/dev/null || true

# Wait for process to terminate (max 30 seconds)
echo -n "Waiting for runner to stop"
for i in {1..30}; do
    if ! kill -0 $RUNNER_PID 2>/dev/null; then
        echo ""
        break
    fi
    echo -n "."
    sleep 1
done

# If still running, force kill
if kill -0 $RUNNER_PID 2>/dev/null; then
    echo ""
    echo -e "${YELLOW}Force killing runner...${NC}"
    kill -KILL $RUNNER_PID 2>/dev/null || true
    sleep 2
fi

# Clean up PID file
rm -f "$PID_FILE"

# Also kill any orphaned Worker processes
WORKER_PIDS=$(pgrep -f "${RUNNER_DIR}/bin/Runner.Worker" || true)
if [ -n "$WORKER_PIDS" ]; then
    echo -e "${YELLOW}Cleaning up worker processes...${NC}"
    echo "$WORKER_PIDS" | xargs kill -KILL 2>/dev/null || true
fi

echo -e "${GREEN}✓ Runner stopped${NC}"