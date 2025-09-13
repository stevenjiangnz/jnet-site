#!/bin/bash
set -e

echo "Running tests..."

# Run unit tests
uv run pytest tests/unit -v

# Run integration tests if environment is set up
if [ -f .env ]; then
    echo "Running integration tests..."
    uv run pytest tests/integration -v
else
    echo "Skipping integration tests (no .env file found)"
fi

# Generate coverage report
echo "Test coverage report:"
uv run pytest --cov=app --cov-report=term-missing