#!/bin/bash
# Check status of GitHub Actions runners
# Usage: ./status-runner.sh [github-repo]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RUNNERS_DIR="/home/sjiang/devlocal/jnet-site/setup/host-runner/runners"

# Function to check single runner
check_runner() {
    local repo=$1
    local runner_dir="${RUNNERS_DIR}/${repo}"
    local pid_file="${runner_dir}/.runner.pid"
    
    echo -e "${BLUE}Repository: ${repo}${NC}"
    
    if [ ! -d "$runner_dir" ]; then
        echo -e "  Status: ${RED}Not configured${NC}"
        return
    fi
    
    if [ ! -f "$pid_file" ]; then
        echo -e "  Status: ${YELLOW}Stopped${NC}"
        return
    fi
    
    local pid=$(cat "$pid_file")
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}Running${NC}"
        echo "  PID: $pid"
        echo "  Uptime: $(ps -o etime= -p $pid | xargs)"
        
        # Check if runner is registered
        if [ -f "${runner_dir}/.runner" ]; then
            local runner_name=$(jq -r .agentName "${runner_dir}/.runner" 2>/dev/null || echo "Unknown")
            echo "  Runner Name: $runner_name"
        fi
    else
        echo -e "  Status: ${RED}Crashed (stale PID)${NC}"
        echo "  Last PID: $pid"
    fi
}

# Check specific runner or all runners
if [ $# -eq 1 ]; then
    # Check specific runner
    check_runner "$1"
else
    # Check all runners
    echo -e "${GREEN}=== GitHub Actions Runners Status ===${NC}"
    echo ""
    
    if [ ! -d "$RUNNERS_DIR" ] || [ -z "$(ls -A $RUNNERS_DIR 2>/dev/null)" ]; then
        echo -e "${YELLOW}No runners configured${NC}"
        echo "Use setup-runner.sh to configure a runner"
        exit 0
    fi
    
    for repo in $(ls -1 "$RUNNERS_DIR" 2>/dev/null); do
        check_runner "$repo"
        echo ""
    done
fi