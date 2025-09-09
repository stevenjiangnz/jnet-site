#!/bin/bash

# Setup stock-data service with persistent volume for downloaded data

echo "🚀 Setting up stock-data service with persistent volume..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Create the data directory structure if it doesn't exist
DATA_DIR="services/stock-data-service/data/downloads"
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating data directory at $DATA_DIR..."
    mkdir -p "$DATA_DIR"
fi

# Ensure proper permissions (Docker needs access)
chmod -R 755 "services/stock-data-service/data"

# Build and start the stock-data service
echo "🔨 Building stock-data service..."
docker-compose build stock-data-service

echo "🚀 Starting stock-data service..."
docker-compose up -d stock-data-service

# Wait for service to be healthy
echo "⏳ Waiting for stock-data service to be healthy..."
sleep 5

# Check health
if docker-compose exec stock-data-service curl -f http://localhost:9000/health > /dev/null 2>&1; then
    echo "✅ Stock-data service is ready!"
    echo ""
    echo "📍 Service URL: http://localhost:9001"
    echo "📚 API Docs: http://localhost:9001/docs"
    echo "💾 Data directory: $(pwd)/$DATA_DIR"
    echo ""
    echo "📝 Downloaded files will be persisted in: $DATA_DIR"
else
    echo "❌ Stock-data service failed to start"
    echo "Check logs with: docker-compose logs stock-data-service"
    exit 1
fi