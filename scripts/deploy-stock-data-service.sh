#!/bin/bash

# Deploy Stock Data Service to Google Cloud Run
# This script reads configuration from .env file and deploys the service

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if GCP project ID is provided
if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/deploy-stock-data-service.sh YOUR_GCP_PROJECT_ID [REGION]"
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}
SERVICE_ACCOUNT="506487697841-compute@developer.gserviceaccount.com"

# Docker Hub configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-stevenjiangnz}
IMAGE_NAME="$DOCKER_USERNAME/jnet-stock-data-service"

# Check for required environment variables
if [ -z "$STOCK_DATA_SERVICE_API_KEY" ]; then
    echo "❌ STOCK_DATA_SERVICE_API_KEY not found in .env file"
    exit 1
fi

if [ -z "$GCS_PROJECT_ID" ]; then
    echo "❌ GCS_PROJECT_ID not found in .env file"
    exit 1
fi

if [ -z "$GCS_BUCKET_NAME" ]; then
    echo "❌ GCS_BUCKET_NAME not found in .env file"
    exit 1
fi

echo "🚀 Deploying Stock Data Service to Google Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service Account: $SERVICE_ACCOUNT"
echo "   GCS Bucket: $GCS_BUCKET_NAME"
echo ""

# Check for required tools
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud SDK is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

# Configure gcloud
echo "☁️  Configuring Google Cloud..."
gcloud config set project $PROJECT_ID

# Login to Docker Hub if not already logged in
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "🔐 Please log in to Docker Hub"
    docker login -u "$DOCKER_USERNAME"
fi

# Build and push image
echo "🔨 Building Docker image..."
docker build -t "$IMAGE_NAME:latest" ./services/stock-data-service

echo "⬆️  Pushing to Docker Hub..."
docker push "$IMAGE_NAME:latest"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy stock-data-service \
    --image "$IMAGE_NAME:latest" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --service-account "$SERVICE_ACCOUNT" \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO,GCS_BUCKET_NAME=$GCS_BUCKET_NAME,GCS_PROJECT_ID=$GCS_PROJECT_ID,API_KEY=$STOCK_DATA_SERVICE_API_KEY" \
    --memory 512Mi \
    --cpu 1 \
    --port 9000

# Get the service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe stock-data-service --platform managed --region $REGION --format 'value(status.url)')
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "🔑 API Key configured from .env file"
echo "   - Use header: X-API-Key: <your-api-key>"
echo "   - Or header: Authorization: Bearer <your-api-key>"
echo ""
echo "📚 API Documentation: $SERVICE_URL/docs"
echo "❤️  Health Check: $SERVICE_URL/health (no auth required)"