#!/bin/bash

# Run all tests locally
echo "🧪 Running all tests locally..."

# Test frontend
echo ""
echo "📦 Testing frontend..."
cd frontend && npm test -- --passWithNoTests
cd ..


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

# Test stock-data service
echo ""
echo "📦 Testing stock-data service..."
cd services/stock-data-service && uv run pytest tests/
cd ../..

echo ""
echo "✅ All tests complete!"