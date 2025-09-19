#!/bin/bash
# Script to check code formatting before committing

set -e

echo "🔍 Checking code formatting..."

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any service failed
FAILED=0

# Check stock-data-service
echo -e "\n${YELLOW}Checking stock-data-service...${NC}"
cd services/stock-data-service
if uv run black --check . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ stock-data-service formatting is correct${NC}"
else
    echo -e "${RED}✗ stock-data-service needs formatting${NC}"
    echo "  Run: cd services/stock-data-service && uv run black ."
    FAILED=1
fi
cd ../..

# Check api-service
echo -e "\n${YELLOW}Checking api-service...${NC}"
cd services/api-service
if uv run black --check . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ api-service formatting is correct${NC}"
else
    echo -e "${RED}✗ api-service needs formatting${NC}"
    echo "  Run: cd services/api-service && uv run black ."
    FAILED=1
fi
cd ../..

# Check frontend (if needed)
# Add more services as needed

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All formatting checks passed!${NC}"
else
    echo -e "\n${RED}❌ Formatting errors found. Please fix them before committing.${NC}"
    echo -e "${YELLOW}Tip: Run './scripts/fix-formatting.sh' to automatically fix all formatting issues${NC}"
    exit 1
fi