#!/bin/bash
set -e

echo "Running linting checks..."

# Run Black formatter check
echo "Checking Black formatting..."
uv run black --check app tests

# Run Ruff linter
echo "Running Ruff linter..."
uv run ruff check app tests

# Run MyPy type checker
echo "Running MyPy type checker..."
uv run mypy app

echo "All linting checks passed!"