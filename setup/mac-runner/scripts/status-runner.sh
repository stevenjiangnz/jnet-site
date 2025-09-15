#!/bin/bash
# Check status of GitHub Actions runners on Mac
# Usage: ./status-runner.sh [github-repo]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
RUNNERS_DIR="${BASE_DIR}/runners"

# Function to check single runner status
check_runner_status() {
    local repo=$1
    local runner_dir="${RUNNERS_DIR}/${repo}"
    local pid_file="${runner_dir}/.runner.pid"
    
    if [ ! -d "$runner_dir" ]; then
        return
    fi
    
    # Find Runner.Listener process
    local runner_pid=$(pgrep -f "${runner_dir}/bin/Runner.Listener" || true)
    
    echo -e "${BLUE}Repository:${NC} ${repo}"
    
    if [ -n "$runner_pid" ]; then
        # Get process info
        local uptime=$(ps -o etime= -p $runner_pid 2>/dev/null | xargs || echo "unknown")
        local cpu=$(ps -o %cpu= -p $runner_pid 2>/dev/null | xargs || echo "0")
        local mem=$(ps -o %mem= -p $runner_pid 2>/dev/null | xargs || echo "0")
        
        echo -e "  ${GREEN}● Running${NC}"
        echo -e "  PID:     $runner_pid"
        echo -e "  Uptime:  $uptime"
        echo -e "  CPU:     ${cpu}%"
        echo -e "  Memory:  ${mem}%"
        
        # Update PID file
        echo $runner_pid > "$pid_file"
        
        # Check for active jobs
        local worker_count=$(pgrep -f "${runner_dir}/bin/Runner.Worker" | wc -l | xargs)
        if [ "$worker_count" -gt 0 ]; then
            echo -e "  ${YELLOW}⚡ Active jobs: $worker_count${NC}"
        fi
    else
        echo -e "  ${RED}○ Stopped${NC}"
        # Clean up stale PID file
        rm -f "$pid_file"
    fi
    
    # Show log file location
    echo -e "  Logs:    ${BASE_DIR}/logs/${repo}.log"
    echo ""
}

# Header
echo -e "${BLUE}GitHub Actions Runner Status${NC}"
echo -e "${BLUE}$(date)${NC}"
echo ""

# Check specific runner or all runners
if [ $# -eq 1 ]; then
    # Check specific runner
    GITHUB_REPO=$1
    if [ ! -d "${RUNNERS_DIR}/${GITHUB_REPO}" ]; then
        echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
        exit 1
    fi
    check_runner_status "$GITHUB_REPO"
else
    # Check all runners
    if [ ! -d "$RUNNERS_DIR" ] || [ -z "$(ls -A "$RUNNERS_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}No runners configured${NC}"
        echo "Use ./scripts/setup-runner.sh to configure a runner"
        exit 0
    fi
    
    for repo_dir in "$RUNNERS_DIR"/*; do
        if [ -d "$repo_dir" ]; then
            repo=$(basename "$repo_dir")
            check_runner_status "$repo"
        fi
    done
fi

# Summary
total_runners=$(find "$RUNNERS_DIR" -maxdepth 1 -type d | tail -n +2 | wc -l | xargs)
running_runners=$(pgrep -f "${RUNNERS_DIR}.*/bin/Runner.Listener" | wc -l | xargs)

echo -e "${BLUE}Summary:${NC}"
echo -e "  Total runners:   $total_runners"
echo -e "  Running:         ${GREEN}$running_runners${NC}"
echo -e "  Stopped:         ${RED}$((total_runners - running_runners))${NC}"