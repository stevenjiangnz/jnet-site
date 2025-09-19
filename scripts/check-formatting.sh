#!/bin/bash
# Script to check code formatting and linting before committing

set -e

echo "🔍 Checking code formatting and linting..."

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any service failed
FAILED=0

# Function to check a Python service
check_python_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "\n${YELLOW}Checking ${service_name}...${NC}"
    cd $service_path
    
    # Check Black formatting
    if uv run black --check . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${service_name} formatting is correct${NC}"
    else
        echo -e "${RED}✗ ${service_name} needs formatting${NC}"
        echo "  Run: cd ${service_path} && uv run black ."
        FAILED=1
    fi
    
    # Check Ruff linting
    if uv run ruff check . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${service_name} linting passed${NC}"
    else
        echo -e "${RED}✗ ${service_name} has linting issues${NC}"
        echo "  Run: cd ${service_path} && uv run ruff check --fix ."
        echo "  Or check manually: cd ${service_path} && uv run ruff check ."
        FAILED=1
    fi
    
    cd - > /dev/null
}

# Check stock-data-service
check_python_service "stock-data-service" "services/stock-data-service"

# Check api-service
check_python_service "api-service" "services/api-service"

# Check frontend (if needed)
# Add more services as needed

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All formatting and linting checks passed!${NC}"
else
    echo -e "\n${RED}❌ Formatting or linting errors found. Please fix them before committing.${NC}"
    echo -e "${YELLOW}Tip: Run './scripts/fix-formatting.sh' to automatically fix formatting and some linting issues${NC}"
    exit 1
fi