#!/bin/bash
# Script to automatically fix code formatting

set -e

echo "🔧 Fixing code formatting..."

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fix stock-data-service
echo -e "\n${YELLOW}Formatting stock-data-service...${NC}"
cd services/stock-data-service
uv run black .
cd ../..

# Fix api-service
echo -e "\n${YELLOW}Formatting api-service...${NC}"
cd services/api-service
uv run black .
cd ../..

# Add more services as needed

echo -e "\n${GREEN}✅ All formatting fixed!${NC}"
echo -e "${YELLOW}Tip: Run './scripts/check-formatting.sh' to verify all formatting is correct${NC}"