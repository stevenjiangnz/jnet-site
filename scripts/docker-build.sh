#!/bin/bash

# Build Docker images
echo "🔨 Building Docker images..."

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Building all services..."
    docker-compose build
else
    echo "Building $SERVICE..."
    docker-compose build $SERVICE
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "💡 To start services, run: ./scripts/docker-up.sh"