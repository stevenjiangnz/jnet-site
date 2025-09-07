#!/bin/bash

# Stop all Docker services
echo "🛑 Stopping Docker services..."

docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "💡 To remove volumes too, run: docker-compose down -v"