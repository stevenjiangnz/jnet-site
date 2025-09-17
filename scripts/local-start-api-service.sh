#!/bin/bash

echo "🚀 Starting API Service locally..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to service directory
cd "$PROJECT_ROOT/services/api-service"

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
echo "🏃 Starting API Service on port 8002..."
echo "📚 API documentation available at:"
echo "   - Swagger UI: http://localhost:8002/docs"
echo "   - ReDoc: http://localhost:8002/redoc"
uv run uvicorn app.main:app --reload --port 8002