#!/bin/bash

# Start content service locally
echo "🚀 Starting content service locally..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Navigate to content service directory
cd services/content-service || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables
export NODE_ENV=development
export DATABASE_URL="postgresql://dev:devpass@localhost:5432/jnetsolution"

# Start service
echo "🌐 Starting content service on http://localhost:3000"
npm run dev