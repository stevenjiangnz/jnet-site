#!/bin/bash
# Script to automatically fix code formatting and linting issues

set -e

echo "🔧 Fixing code formatting and linting issues..."

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to fix a Python service
fix_python_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "\n${YELLOW}Fixing ${service_name}...${NC}"
    cd $service_path
    
    # Fix formatting with Black
    echo -e "${BLUE}Running Black formatter...${NC}"
    uv run black .
    
    # Fix auto-fixable linting issues with Ruff
    echo -e "${BLUE}Running Ruff auto-fixes...${NC}"
    uv run ruff check --fix . || true
    
    cd - > /dev/null
}

# Fix stock-data-service
fix_python_service "stock-data-service" "services/stock-data-service"

# Fix api-service
fix_python_service "api-service" "services/api-service"

# Add more services as needed

echo -e "\n${GREEN}✅ All auto-fixable formatting and linting issues resolved!${NC}"
echo -e "${YELLOW}Note: Some linting issues may require manual fixes.${NC}"
echo -e "${YELLOW}Tip: Run './scripts/check-formatting.sh' to verify all checks pass${NC}"