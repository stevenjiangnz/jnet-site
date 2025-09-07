#!/bin/bash

echo "🚀 Starting Stock Data Service locally..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to service directory
cd "$PROJECT_ROOT/services/stock-data-service"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please update .env with your configuration"
fi

# Check if virtual environment exists
if [ ! -d .venv ]; then
    echo "📦 Installing dependencies with uv..."
    uv sync
fi

# Run the service
echo "🏃 Starting Stock Data Service on port 9000..."
uv run uvicorn app.main:app --reload --port 9000