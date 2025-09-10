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
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build and push images
echo "🔨 Building and pushing Docker images..."
services=("frontend" "auth-service" "user-service" "content-service" "stock-data-service")

for service in "${services[@]}"; do
    echo "📦 Building $service..."
    if [ "$service" == "frontend" ]; then
        docker build -t gcr.io/$PROJECT_ID/jnetsolution-$service \
            --build-arg NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co \
            --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a3NjZWlyam9neGxob2hia2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDk1MzgsImV4cCI6MjA3Mjk4NTUzOH0.c1W743KiBjCyTCmYUS9Xa2aWVRqqw3eg4oR5ZvA6SB8 \
            ./frontend
    else
        docker build -t gcr.io/$PROJECT_ID/jnetsolution-$service ./services/$service
    fi
    
    echo "⬆️  Pushing $service to Container Registry..."
    docker push gcr.io/$PROJECT_ID/jnetsolution-$service
done

# Deploy services to Cloud Run
echo "🚀 Deploying services to Cloud Run..."

# Deploy auth-service
gcloud run deploy jnetsolution-auth \
    --image gcr.io/$PROJECT_ID/jnetsolution-auth-service \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "ASPNETCORE_ENVIRONMENT=Production"

# Deploy user-service
gcloud run deploy jnetsolution-user \
    --image gcr.io/$PROJECT_ID/jnetsolution-user-service \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=production"

# Deploy content-service
gcloud run deploy jnetsolution-content \
    --image gcr.io/$PROJECT_ID/jnetsolution-content-service \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "NODE_ENV=production"

# Deploy frontend (allow unauthenticated)
gcloud run deploy jnetsolution-frontend \
    --image gcr.io/$PROJECT_ID/jnetsolution-frontend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a3NjZWlyam9neGxob2hia2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDk1MzgsImV4cCI6MjA3Mjk4NTUzOH0.c1W743KiBjCyTCmYUS9Xa2aWVRqqw3eg4oR5ZvA6SB8"

# Deploy stock-data-service
gcloud run deploy jnetsolution-stock-data \
    --image gcr.io/$PROJECT_ID/jnetsolution-stock-data-service \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO" \
    --memory 512Mi \
    --cpu 1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your services are deployed. Get the URLs with:"
echo "   gcloud run services list --platform managed --region $REGION"
echo ""
echo "⚠️  Remember to:"
echo "   1. Set up Cloud SQL and update DATABASE_URL"
echo "   2. Configure JWT_SECRET in Cloud Run environment variables"
echo "   3. Set up a load balancer or API Gateway"
echo "   4. Configure custom domain and SSL certificates"