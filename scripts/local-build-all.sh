#!/bin/bash

# Build all services locally
echo "🔨 Building all services locally..."

# Build frontend
echo "📦 Building frontend..."
cd frontend && npm run build
cd ..


echo ""
echo "✅ All builds complete!"
echo ""
echo "💡 Note: Python services don't require a build step"