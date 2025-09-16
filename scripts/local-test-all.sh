#!/bin/bash

# Run all tests locally
echo "🧪 Running all tests locally..."

# Test frontend
echo ""
echo "📦 Testing frontend..."
cd frontend && npm test -- --passWithNoTests
cd ..



# Test stock-data service
echo ""
echo "📦 Testing stock-data service..."
cd services/stock-data-service && uv run pytest tests/
cd ../..

echo ""
echo "✅ All tests complete!"