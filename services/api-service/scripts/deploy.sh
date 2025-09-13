#!/bin/bash
set -e

# Check if version is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy.sh <version>"
    echo "Example: ./scripts/deploy.sh 1.0.0"
    exit 1
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
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO" \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --concurrency 100 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8002

echo "Deployment complete!"