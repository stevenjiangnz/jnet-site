#!/bin/bash

# Start frontend locally
echo "🚀 Starting frontend locally..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Navigate to frontend directory
cd frontend || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "📋 Creating .env.local..."
    cp .env.local.example .env.local 2>/dev/null || echo "API_BASE_URL=http://localhost:8000" > .env.local
    echo "⚠️  Please update .env.local with your configuration"
fi

# Start development server
echo "🌐 Starting frontend on http://localhost:3100"
npm run dev