#!/bin/bash
set -e

echo "Setting up API Service..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
fi

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    pip install uv
fi

# Install dependencies
echo "Installing dependencies..."
uv sync

# Create credentials directory
mkdir -p credentials

echo "Setup complete!"
echo "To run locally: uv run uvicorn app.main:app --reload"
echo "To run with Docker: docker-compose up api-service"