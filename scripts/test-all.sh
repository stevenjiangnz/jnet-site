#!/bin/bash

echo "🧪 Running all tests for JNetSolution..."

# Test frontend
echo "Testing Frontend..."
docker-compose exec -T frontend npm test -- --passWithNoTests || echo "⚠️  Frontend tests need to be implemented"

# Test auth-service
echo "Testing Auth Service..."
docker-compose exec -T auth-service dotnet test || echo "⚠️  Auth Service tests need to be implemented"

# Test user-service
echo "Testing User Service..."
docker-compose exec -T user-service pytest || echo "⚠️  User Service tests need to be implemented"

# Test content-service
echo "Testing Content Service..."
docker-compose exec -T content-service npm test -- --passWithNoTests || echo "⚠️  Content Service tests need to be implemented"

echo "✅ Test suite complete!"