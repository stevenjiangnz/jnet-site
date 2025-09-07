#!/bin/bash

# Start all Docker services
echo "🚀 Starting Docker services..."

# Check if docker-compose command exists
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed"
    exit 1
fi

# Start services
docker-compose up -d

# Show status
echo ""
echo "✅ Services started!"
echo ""
docker-compose ps
echo ""
echo "📝 View logs with: docker-compose logs -f [service-name]"