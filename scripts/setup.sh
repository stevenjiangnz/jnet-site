#!/bin/bash

echo "🚀 Setting up JNetSolution development environment..."

# Check for required tools
echo "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📋 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your configuration values"
fi

# Build Docker images
echo "🔨 Building Docker images..."
./scripts/docker-build.sh

# Start services
echo "🎯 Starting development environment..."
./scripts/docker-up.sh

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
services=("frontend:3110" "auth-service:5001" "user-service:8001" "content-service:3001")
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1 || curl -s "http://localhost:$port/" > /dev/null 2>&1; then
        echo "✅ $name is running on port $port"
    else
        echo "⚠️  $name might not be ready yet on port $port"
    fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access your services at:"
echo "   Frontend: http://localhost:3110"
echo "   Auth Service: http://localhost:5001"
echo "   User Service: http://localhost:8001"
echo "   Content Service: http://localhost:3001"
echo "   Database: localhost:5432"
echo ""
echo "📝 Useful commands:"
echo "   ./scripts/docker-logs.sh     # View logs"
echo "   ./scripts/docker-down.sh     # Stop all services"
echo "   ./scripts/docker-restart.sh  # Restart all services"
echo "   ./scripts/test-all.sh        # Run all tests"