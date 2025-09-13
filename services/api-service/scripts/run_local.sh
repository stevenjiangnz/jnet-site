#!/bin/bash
set -e

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    echo "Installing dependencies..."
    uv sync
fi

# Run the application
echo "Starting API Service on http://localhost:8002"
echo "API Documentation: http://localhost:8002/docs"
echo ""
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8002