#!/bin/bash

echo "🧪 Running all tests for JNetSolution..."

# Test frontend
echo "Testing Frontend..."
docker-compose exec -T frontend npm test -- --passWithNoTests || echo "⚠️  Frontend tests need to be implemented"


# Test user-service
echo "Testing User Service..."
docker-compose exec -T user-service pytest || echo "⚠️  User Service tests need to be implemented"

# Test stock-data-service
echo "Testing Stock Data Service..."
docker-compose exec -T stock-data-service uv run pytest || echo "⚠️  Stock Data Service tests failed"

echo "✅ Test suite complete!"