#!/bin/bash

# Start user service locally
echo "🚀 Starting user service locally..."

# Check if python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Navigate to user service directory
cd services/user-service || exit 1

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export ENVIRONMENT=development
export DATABASE_URL="postgresql://dev:devpass@localhost:5432/jnetsolution"

# Start service
echo "🌐 Starting user service on http://localhost:8000"
uvicorn app.main:app --reload --port 8000