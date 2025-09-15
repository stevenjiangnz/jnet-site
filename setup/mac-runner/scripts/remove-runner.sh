#!/bin/bash
# Remove GitHub Actions runner from Mac
# Usage: ./remove-runner.sh <github-owner> <github-repo>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <github-owner> <github-repo>"
    echo "Example: $0 myusername my-repo"
    echo ""
    echo "Environment variable required:"
    echo "  GITHUB_PERSONAL_ACCESS_TOKEN - GitHub PAT with 'repo' scope"
    exit 1
fi

GITHUB_OWNER=$1
GITHUB_REPO=$2
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_DIR="${BASE_DIR}/runners/${GITHUB_REPO}"
PLIST_NAME="com.github.actions.runner.${GITHUB_REPO}"
PLIST_FILE="${BASE_DIR}/config/${PLIST_NAME}.plist"

# Check PAT
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_PERSONAL_ACCESS_TOKEN not set${NC}"
    echo "Please set: export GITHUB_PERSONAL_ACCESS_TOKEN='your-token'"
    exit 1
fi

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo -e "${RED}Error: Runner not found for repository: ${GITHUB_REPO}${NC}"
    exit 1
fi

echo -e "${YELLOW}Removing runner for ${GITHUB_OWNER}/${GITHUB_REPO}...${NC}"

# Stop runner if running
echo "Stopping runner..."
"$SCRIPT_DIR/stop-runner.sh" "$GITHUB_REPO" || true

# Unload launchd service if exists
if [ -f ~/Library/LaunchAgents/${PLIST_NAME}.plist ]; then
    echo "Unloading launchd service..."
    launchctl unload ~/Library/LaunchAgents/${PLIST_NAME}.plist 2>/dev/null || true
    rm -f ~/Library/LaunchAgents/${PLIST_NAME}.plist
    echo -e "${GREEN}✓ Launchd service removed${NC}"
fi

# Get removal token
echo -e "${YELLOW}Getting removal token...${NC}"
cd "$RUNNER_DIR"

REMOVE_TOKEN=$(curl -s -X POST \
    -H "Authorization: token ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/remove-token" \
    | jq -r .token)

if [ -z "$REMOVE_TOKEN" ] || [ "$REMOVE_TOKEN" = "null" ]; then
    echo -e "${RED}Failed to get removal token${NC}"
    echo "The runner may have already been removed from GitHub"
    echo "Continuing with local cleanup..."
else
    # Remove runner from GitHub
    echo "Removing runner from GitHub..."
    ./config.sh remove --token "${REMOVE_TOKEN}" || true
    echo -e "${GREEN}✓ Runner removed from GitHub${NC}"
fi

# Remove runner directory
echo "Removing runner files..."
cd "$BASE_DIR"
rm -rf "$RUNNER_DIR"
echo -e "${GREEN}✓ Runner files removed${NC}"

# Remove config files
rm -f "$PLIST_FILE"

# Remove logs
rm -f "${BASE_DIR}/logs/${GITHUB_REPO}.log"
rm -f "${BASE_DIR}/logs/${GITHUB_REPO}.out.log"
rm -f "${BASE_DIR}/logs/${GITHUB_REPO}.err.log"

echo -e "${GREEN}✓ Runner completely removed${NC}"