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
    
    # Find the actual Runner.Listener process
    local runner_pid=$(pgrep -f "${runner_dir}/bin/Runner.Listener" || true)
    
    if [ -z "$runner_pid" ]; then
        echo -e "  Status: ${YELLOW}Stopped${NC}"
        # Clean up stale PID file if exists
        rm -f "$pid_file" 2>/dev/null || true
        return
    fi
    
    # Runner is running
    echo -e "  Status: ${GREEN}Running${NC}"
    echo "  PID: $runner_pid"
    echo "  Uptime: $(ps -o etime= -p $runner_pid | xargs)"
    
    # Update PID file with correct PID
    echo $runner_pid > "$pid_file"
    
    # Check if runner is registered
    if [ -f "${runner_dir}/.runner" ]; then
        local runner_name=$(jq -r .agentName "${runner_dir}/.runner" 2>/dev/null || echo "Unknown")
        echo "  Runner Name: $runner_name"
    fi
    
    # Show memory usage
    local mem_usage=$(ps -p $runner_pid -o %mem,rss --no-headers 2>/dev/null || echo "N/A")
    if [ "$mem_usage" != "N/A" ]; then
        local mem_percent=$(echo $mem_usage | awk '{print $1}')
        local mem_kb=$(echo $mem_usage | awk '{print $2}')
        local mem_mb=$((mem_kb / 1024))
        echo "  Memory: ${mem_percent}% (${mem_mb}MB)"
    fi
    
    # Check for any child processes
    local child_count=$(pgrep -P $runner_pid 2>/dev/null | wc -l || echo "0")
    if [ "$child_count" -gt 0 ]; then
        echo "  Active Jobs: $child_count"
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