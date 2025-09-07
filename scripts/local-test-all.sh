#!/bin/bash

# Run all tests locally
echo "🧪 Running all tests locally..."

# Test frontend
echo ""
echo "📦 Testing frontend..."
cd frontend && npm test -- --passWithNoTests
cd ..

# Test auth service
echo ""
echo "📦 Testing auth service..."
cd services/auth-service && dotnet test
cd ../..

# Test user service
echo ""
echo "📦 Testing user service..."
cd services/user-service
if [ -d "venv" ]; then
    source venv/bin/activate
fi
pytest tests/
cd ../..

# Test content service
echo ""
echo "📦 Testing content service..."
cd services/content-service && npm test -- --passWithNoTests
cd ../..

echo ""
echo "✅ All tests complete!"