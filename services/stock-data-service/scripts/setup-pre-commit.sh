#!/bin/bash

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "Installing pre-commit..."
    pip install pre-commit
fi

# Install the git hook scripts
echo "Installing pre-commit hooks..."
pre-commit install

echo "Pre-commit hooks installed successfully!"
echo "Black and Ruff will now run automatically before each commit."