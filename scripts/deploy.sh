#!/bin/bash

# Check if GCP project ID is provided
if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/deploy.sh YOUR_GCP_PROJECT_ID"
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}

echo "🚀 Deploying JNetSolution to Google Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"

# Check for required tools
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud SDK is required but not installed. Aborting." >&2; exit 1; }

# Configure gcloud
echo "☁️  Configuring Google Cloud..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com

# Docker Hub configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-stevenjiangnz}

# Login to Docker Hub if not already logged in
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "🔐 Please log in to Docker Hub"
    docker login -u "$DOCKER_USERNAME"
fi

# Build and push images
echo "🔨 Building and pushing Docker images to Docker Hub..."
services=("frontend" "user-service" "content-service" "stock-data-service")

for service in "${services[@]}"; do
    echo "📦 Building $service..."
    IMAGE_NAME="$DOCKER_USERNAME/jnet-$service"
    
    if [ "$service" == "frontend" ]; then
        docker build -t "$IMAGE_NAME:latest" \
            --build-arg NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co \
            --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a3NjZWlyam9neGxob2hia2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDk1MzgsImV4cCI6MjA3Mjk4NTUzOH0.c1W743KiBjCyTCmYUS9Xa2aWVRqqw3eg4oR5ZvA6SB8 \
            ./frontend
    else
        docker build -t "$IMAGE_NAME:latest" ./services/$service
    fi
    
    echo "⬆️  Pushing $service to Docker Hub..."
    docker push "$IMAGE_NAME:latest"
done

# Deploy services to Cloud Run
echo "🚀 Deploying services to Cloud Run..."


# Deploy user-service
gcloud run deploy jnetsolution-user \
    --image "$DOCKER_USERNAME/jnet-user-service:latest" \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=production"

# Deploy content-service
gcloud run deploy jnetsolution-content \
    --image "$DOCKER_USERNAME/jnet-content-service:latest" \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "NODE_ENV=production"

# Deploy frontend (allow unauthenticated)
gcloud run deploy jnetsolution-frontend \
    --image "$DOCKER_USERNAME/jnet-frontend:latest" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a3NjZWlyam9neGxob2hia2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDk1MzgsImV4cCI6MjA3Mjk4NTUzOH0.c1W743KiBjCyTCmYUS9Xa2aWVRqqw3eg4oR5ZvA6SB8"

# Deploy stock-data-service (allow unauthenticated for public API access)
gcloud run deploy jnetsolution-stock-data \
    --image "$DOCKER_USERNAME/jnet-stock-data-service:latest" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO" \
    --memory 512Mi \
    --cpu 1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🐳 Docker Hub images deployed:"
for service in "${services[@]}"; do
    echo "   - $DOCKER_USERNAME/jnet-$service:latest"
done
echo ""
echo "🌐 Your services are deployed. Get the URLs with:"
echo "   gcloud run services list --platform managed --region $REGION"
echo ""
echo "⚠️  Remember to:"
echo "   1. Set up Cloud SQL and update DATABASE_URL"
echo "   2. Configure JWT_SECRET in Cloud Run environment variables"
echo "   3. Set up a load balancer or API Gateway"
echo "   4. Configure custom domain and SSL certificates"