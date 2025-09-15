#!/bin/bash
# Initial setup for Mac runner environment

echo "Setting up Mac runner environment..."

# Make scripts executable
chmod +x scripts/*.sh

# Create required directories
mkdir -p config logs runners

# Check for required tools
echo "Checking for required tools..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "Warning: Homebrew not found. Some dependencies may need to be installed manually."
    echo "Install Homebrew from: https://brew.sh"
else
    echo "✓ Homebrew found"
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "jq not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo "Please install jq manually"
        exit 1
    fi
else
    echo "✓ jq found"
fi

echo "Setup complete!"
echo ""
echo "To get started:"
echo "  1. Export your GitHub PAT:"
echo "     export GITHUB_PERSONAL_ACCESS_TOKEN='your-token'"
echo "  2. Setup a runner:"
echo "     ./scripts/setup-runner.sh <owner> <repo>"
echo "  3. Start the runner:"
echo "     ./scripts/start-runner.sh <repo>"