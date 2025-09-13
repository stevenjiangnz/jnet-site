#!/bin/bash

echo "Running Black formatter check..."
uv run black --check .
BLACK_EXIT=$?

echo -e "\nRunning Ruff linter..."
uv run ruff check .
RUFF_EXIT=$?

if [ $BLACK_EXIT -ne 0 ] || [ $RUFF_EXIT -ne 0 ]; then
    echo -e "\n❌ Linting failed!"
    echo "To fix formatting issues, run: uv run black ."
    echo "To fix some linting issues, run: uv run ruff check --fix ."
    exit 1
else
    echo -e "\n✅ All linting checks passed!"
    exit 0
fi