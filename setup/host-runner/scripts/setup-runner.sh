#!/bin/bash
# Setup GitHub Actions runner on host machine
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
RUNNER_NAME=${3:-"host-runner-${GITHUB_REPO}"}
RUNNER_DIR="/home/sjiang/devlocal/jnet-site/setup/host-runner/runners/${GITHUB_REPO}"
RUNNER_VERSION="2.311.0"

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
echo ""

# Create runner directory
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

# Download runner if not exists
if [ ! -f "config.sh" ]; then
    echo -e "${YELLOW}Downloading GitHub Actions Runner v${RUNNER_VERSION}...${NC}"
    curl -L -o actions-runner.tar.gz \
        "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
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
    --labels "self-hosted,linux,x64,host" \
    --work "_work" \
    --unattended \
    --replace

echo -e "${GREEN}✓ Runner configured successfully${NC}"

# Create systemd service file
SERVICE_NAME="github-runner-${GITHUB_REPO}"
SERVICE_FILE="/home/sjiang/devlocal/jnet-site/setup/host-runner/config/${SERVICE_NAME}.service"

echo -e "${YELLOW}Creating systemd service...${NC}"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=GitHub Actions Runner for ${GITHUB_REPO}
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${RUNNER_DIR}
ExecStart=${RUNNER_DIR}/run.sh
Restart=always
RestartSec=5
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Service file created: ${SERVICE_FILE}${NC}"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To start the runner:"
echo -e "  ${YELLOW}./scripts/start-runner.sh ${GITHUB_REPO}${NC}"
echo ""
echo "To run as a systemd service:"
echo -e "  ${YELLOW}sudo cp ${SERVICE_FILE} /etc/systemd/system/${NC}"
echo -e "  ${YELLOW}sudo systemctl enable ${SERVICE_NAME}${NC}"
echo -e "  ${YELLOW}sudo systemctl start ${SERVICE_NAME}${NC}"