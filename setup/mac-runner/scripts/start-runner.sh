#!/bin/bash
# Start GitHub Actions runner on Mac
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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_DIR="${BASE_DIR}/runners/${GITHUB_REPO}"
LOG_DIR="${BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/${GITHUB_REPO}.log"
PID_FILE="${RUNNER_DIR}/.runner.pid"

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
    echo "Please run setup-runner.sh first"
    exit 1
fi

# Check if already running by looking for actual Runner.Listener process
EXISTING_PID=$(pgrep -f "${RUNNER_DIR}/bin/Runner.Listener" || true)
if [ -n "$EXISTING_PID" ]; then
    echo -e "${YELLOW}Runner is already running (PID: $EXISTING_PID)${NC}"
    echo $EXISTING_PID > "$PID_FILE"
    exit 0
fi

# Clean up any stale PID file
rm -f "$PID_FILE"

# Create log directory
mkdir -p "$LOG_DIR"

# Start runner
echo -e "${GREEN}Starting runner for ${GITHUB_REPO}...${NC}"
cd "$RUNNER_DIR"

# Run in background with nohup (macOS compatible)
nohup ./run.sh > "$LOG_FILE" 2>&1 &
SCRIPT_PID=$!

# Wait for Runner.Listener to start (max 10 seconds)
echo -n "Waiting for runner to start"
for i in {1..10}; do
    RUNNER_PID=$(pgrep -f "${RUNNER_DIR}/bin/Runner.Listener" || true)
    if [ -n "$RUNNER_PID" ]; then
        echo ""
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$RUNNER_PID" ]; then
    echo ""
    echo -e "${RED}✗ Failed to start runner${NC}"
    echo "Check logs: $LOG_FILE"
    tail -20 "$LOG_FILE"
    # Try to kill the script if it's still running
    kill $SCRIPT_PID 2>/dev/null || true
    exit 1
fi

# Save the actual Runner.Listener PID
echo $RUNNER_PID > "$PID_FILE"

echo -e "${GREEN}✓ Runner started successfully (PID: $RUNNER_PID)${NC}"
echo "Log file: $LOG_FILE"
echo ""
echo "To view logs:"
echo -e "  ${YELLOW}tail -f $LOG_FILE${NC}"
echo ""
echo "To stop:"
echo -e "  ${YELLOW}./scripts/stop-runner.sh ${GITHUB_REPO}${NC}"