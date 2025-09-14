#!/bin/bash
# Initial setup for host runner environment

echo "Setting up host runner environment..."

# Make scripts executable
chmod +x scripts/*.sh

# Create required directories
mkdir -p config logs runners

echo "Setup complete!"
echo ""
echo "To get started:"
echo "  1. Export your GitHub PAT:"
echo "     export GITHUB_PERSONAL_ACCESS_TOKEN='your-token'"
echo "  2. Setup a runner:"
echo "     ./scripts/setup-runner.sh <owner> <repo>"
echo "  3. Start the runner:"
echo "     ./scripts/start-runner.sh <repo>"