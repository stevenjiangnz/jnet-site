#!/bin/bash

# Start auth service locally
echo "🚀 Starting auth service locally..."

# Check if dotnet is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET SDK is not installed"
    exit 1
fi

# Navigate to auth service directory
cd services/auth-service || exit 1

# Set environment variables
export ASPNETCORE_ENVIRONMENT=Development
export DATABASE_URL="Server=localhost;Database=jnetsolution;User=dev;Password=devpass;"
export JWT_SECRET="your-development-secret-key-min-32-characters-long"

# Start service
echo "🌐 Starting auth service on http://localhost:5000"
dotnet run