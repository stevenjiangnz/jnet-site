#!/bin/bash

# Restart Docker services
SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "🔄 Restarting all services..."
    docker-compose restart
else
    echo "🔄 Restarting $SERVICE..."
    docker-compose restart $SERVICE
fi

echo ""
echo "✅ Restart complete!"
echo ""
docker-compose ps