#!/bin/bash
# Configure Docker for non-interactive credential storage on Mac
# This script should be run on the Mac runner machine

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Configuring Docker for non-interactive credential storage...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker Desktop from https://docker.com"
    exit 1
fi

# Create Docker config directory if it doesn't exist
mkdir -p ~/.docker

# Configure Docker to use file-based credential store instead of osxkeychain
echo -e "${YELLOW}Updating Docker config...${NC}"
cat > ~/.docker/config.json <<EOF
{
    "auths": {},
    "credsStore": ""
}
EOF

echo -e "${GREEN}✓ Docker configured for file-based credential storage${NC}"

# Test Docker
echo -e "${YELLOW}Testing Docker...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker is working${NC}"
else
    echo -e "${RED}✗ Docker test failed${NC}"
    echo "Make sure Docker Desktop is running"
    exit 1
fi

echo ""
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "Notes:"
echo "- Docker will now store credentials in ~/.docker/config.json"
echo "- This is less secure than keychain but works in non-interactive mode"
echo "- For production use, consider using Docker Hub access tokens"
echo ""
echo "To test Docker login:"
echo -e "  ${YELLOW}docker login -u <username> -p <token>${NC}"