#!/bin/bash

# Clean up Docker resources
echo "🧹 Cleaning up Docker resources..."

# Stop all services
docker-compose down -v

# Remove dangling images
echo "Removing dangling images..."
docker image prune -f

# Remove unused containers
echo "Removing stopped containers..."
docker container prune -f

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "💡 For a deeper clean, run: docker system prune -a"