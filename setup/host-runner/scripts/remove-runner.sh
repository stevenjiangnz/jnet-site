#!/bin/bash
# Remove GitHub Actions runner
# Usage: ./remove-runner.sh <github-owner> <github-repo>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 2 ]; then
    echo "Usage: $0 <github-owner> <github-repo>"
    echo "Example: $0 myusername my-repo"
    echo ""
    echo "This will unregister and remove the runner"
    exit 1
fi

GITHUB_OWNER=$1
GITHUB_REPO=$2
RUNNER_DIR="/home/sjiang/devlocal/jnet-site/setup/host-runner/runners/${GITHUB_REPO}"
SERVICE_NAME="github-runner-${GITHUB_REPO}"

# Check if runner exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${YELLOW}Runner not found for repository: ${GITHUB_REPO}${NC}"
    exit 0
fi

# Stop runner if running
echo -e "${YELLOW}Stopping runner...${NC}"
./scripts/stop-runner.sh "${GITHUB_REPO}" || true

# Check PAT
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_PERSONAL_ACCESS_TOKEN not set${NC}"
    echo "Please set: export GITHUB_PERSONAL_ACCESS_TOKEN='your-token'"
    echo "Skipping GitHub unregistration (will remove local files only)"
else
    # Get removal token
    echo -e "${YELLOW}Getting removal token...${NC}"
    REMOVE_TOKEN=$(curl -s -X POST \
        -H "Authorization: token ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/remove-token" \
        | jq -r .token)
    
    if [ -n "$REMOVE_TOKEN" ] && [ "$REMOVE_TOKEN" != "null" ]; then
        # Unregister runner
        echo -e "${YELLOW}Unregistering runner from GitHub...${NC}"
        cd "$RUNNER_DIR"
        ./config.sh remove --token "$REMOVE_TOKEN" || true
        echo -e "${GREEN}✓ Runner unregistered${NC}"
    else
        echo -e "${YELLOW}Warning: Could not get removal token, skipping GitHub unregistration${NC}"
    fi
fi

# Remove systemd service if exists
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    echo -e "${YELLOW}Removing systemd service...${NC}"
    sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
    sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
    sudo rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd service removed${NC}"
fi

# Remove runner directory
echo -e "${YELLOW}Removing runner files...${NC}"
rm -rf "$RUNNER_DIR"
echo -e "${GREEN}✓ Runner files removed${NC}"

# Remove service config
rm -f "/home/sjiang/devlocal/jnet-site/setup/host-runner/config/${SERVICE_NAME}.service"

echo ""
echo -e "${GREEN}Runner removed successfully${NC}"