#!/bin/bash
# Setup GitHub Actions runner on Mac machine
# Usage: ./setup-runner.sh <github-owner> <github-repo> [runner-name]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <github-owner> <github-repo> [runner-name]"
    echo "Example: $0 myusername my-repo"
    echo ""
    echo "Environment variable required:"
    echo "  GITHUB_PERSONAL_ACCESS_TOKEN - GitHub PAT with 'repo' scope"
    exit 1
fi

GITHUB_OWNER=$1
GITHUB_REPO=$2
RUNNER_NAME=${3:-"mac-runner-${GITHUB_REPO}"}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_DIR="${BASE_DIR}/runners/${GITHUB_REPO}"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    RUNNER_ARCH="arm64"
    echo "Detected Apple Silicon (M1/M2) Mac"
else
    RUNNER_ARCH="x64"
    echo "Detected Intel Mac"
fi

# Latest runner version that supports macOS
RUNNER_VERSION="2.328.0"

# Check PAT
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: GITHUB_PERSONAL_ACCESS_TOKEN not set${NC}"
    echo "Please set: export GITHUB_PERSONAL_ACCESS_TOKEN='your-token'"
    exit 1
fi

echo -e "${GREEN}Setting up GitHub Actions runner${NC}"
echo "Repository: ${GITHUB_OWNER}/${GITHUB_REPO}"
echo "Runner Name: ${RUNNER_NAME}"
echo "Runner Directory: ${RUNNER_DIR}"
echo "Architecture: ${RUNNER_ARCH}"
echo ""

# Create runner directory
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

# Download runner if not exists
if [ ! -f "config.sh" ]; then
    echo -e "${YELLOW}Downloading GitHub Actions Runner v${RUNNER_VERSION}...${NC}"
    RUNNER_DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
    
    curl -L -o actions-runner.tar.gz "$RUNNER_DOWNLOAD_URL"
    tar xzf actions-runner.tar.gz
    rm actions-runner.tar.gz
    echo -e "${GREEN}✓ Runner downloaded${NC}"
fi

# Get registration token
echo -e "${YELLOW}Getting registration token...${NC}"
REG_TOKEN=$(curl -s -X POST \
    -H "Authorization: token ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/registration-token" \
    | jq -r .token)

if [ -z "$REG_TOKEN" ] || [ "$REG_TOKEN" = "null" ]; then
    echo -e "${RED}Failed to get registration token${NC}"
    echo "Please check:"
    echo "  1. PAT has 'repo' scope"
    echo "  2. Repository exists: ${GITHUB_OWNER}/${GITHUB_REPO}"
    echo "  3. PAT is not expired"
    exit 1
fi

echo -e "${GREEN}✓ Got registration token${NC}"

# Configure runner
echo -e "${YELLOW}Configuring runner...${NC}"
./config.sh \
    --url "https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}" \
    --token "${REG_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "self-hosted,macOS,${RUNNER_ARCH},mac" \
    --work "_work" \
    --unattended \
    --replace

echo -e "${GREEN}✓ Runner configured successfully${NC}"

# Create launchd plist file
PLIST_NAME="com.github.actions.runner.${GITHUB_REPO}"
PLIST_FILE="${BASE_DIR}/config/${PLIST_NAME}.plist"

echo -e "${YELLOW}Creating launchd plist...${NC}"
cat > "${PLIST_FILE}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${RUNNER_DIR}/run.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${RUNNER_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${BASE_DIR}/logs/${GITHUB_REPO}.out.log</string>
    <key>StandardErrorPath</key>
    <string>${BASE_DIR}/logs/${GITHUB_REPO}.err.log</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✓ Plist file created: ${PLIST_FILE}${NC}"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To start the runner:"
echo -e "  ${YELLOW}./scripts/start-runner.sh ${GITHUB_REPO}${NC}"
echo ""
echo "To run as a launchd service (auto-start on boot):"
echo -e "  ${YELLOW}cp ${PLIST_FILE} ~/Library/LaunchAgents/${NC}"
echo -e "  ${YELLOW}launchctl load ~/Library/LaunchAgents/${PLIST_NAME}.plist${NC}"