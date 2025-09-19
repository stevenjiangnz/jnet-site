#!/bin/bash
set -e

# Check if version is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy.sh <version>"
    echo "Example: ./scripts/deploy.sh 1.0.0"
    echo ""
    echo "Set API_KEY environment variable before deployment:"
    echo "export API_KEY=your-secure-api-key"
    exit 1
fi

# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
    echo "WARNING: API_KEY environment variable is not set!"
    echo "Using default 'dev-api-key' which is NOT secure for production."
    echo "Set a secure API key with: export API_KEY=your-secure-api-key"
    echo ""
    read -p "Continue with default API key? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

VERSION=$1
IMAGE_NAME="stevenjiangnz/jnet-api-service"

echo "Deploying API Service version $VERSION..."

# Build Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME:$VERSION -t $IMAGE_NAME:latest .

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push $IMAGE_NAME:$VERSION
docker push $IMAGE_NAME:latest

# Deploy to Google Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy api-service \
    --image docker.io/$IMAGE_NAME:$VERSION \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --service-account api-service@jnet-site.iam.gserviceaccount.com \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO,API_KEY=${API_KEY:-dev-api-key},STOCK_DATA_SERVICE_URL=https://stock-data-service-506487697841.us-central1.run.app,GCS_BUCKET_NAME=jnet-api-service,GCS_PROJECT_ID=jnet-site" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --concurrency 100 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8002

echo "Deployment complete!"