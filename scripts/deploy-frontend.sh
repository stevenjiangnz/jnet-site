#!/bin/bash

# Deploy frontend to Cloud Run using locally built Docker image
# This ensures consistency between local testing and production
# Usage: ./scripts/deploy-frontend.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Frontend Deployment using Local Docker Image${NC}"
echo ""

# Check if .env.local exists and source it
if [ -f "frontend/.env.local" ]; then
    echo -e "${BLUE}📋 Loading environment variables from .env.local...${NC}"
    export $(cat frontend/.env.local | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Error: frontend/.env.local not found!${NC}"
    echo "Please create it from frontend/.env.local.example"
    exit 1
fi

# Verify required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Supabase environment variables not set!${NC}"
    echo ""
    echo "Please ensure the following are set in frontend/.env.local:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker not found!${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI not found!${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: No Google Cloud project set!${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${BLUE}📦 Project: $PROJECT_ID${NC}"
echo -e "${BLUE}🌍 Region: us-central1${NC}"
echo ""

# Docker Hub configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-stevenjiangnz}
IMAGE_NAME="$DOCKER_USERNAME/jnet-frontend"
IMAGE_TAG="latest"
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

echo -e "${BLUE}🔨 Building Docker image locally...${NC}"
echo "Image: $FULL_IMAGE"
echo ""

cd frontend

# Build the production Docker image locally
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -t "$FULL_IMAGE" \
    -f Dockerfile \
    .

echo ""
echo -e "${GREEN}✅ Docker image built successfully!${NC}"

# Optional: Test the image locally
echo ""
read -p "Test the image locally before deploying? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧪 Starting container locally on http://localhost:9090${NC}"
    echo "Press Ctrl+C to stop and continue deployment..."
    docker run --rm -p 9090:8080 \
        -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
        -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        "$FULL_IMAGE"
fi

echo ""
echo -e "${BLUE}📤 Pushing image to Docker Hub...${NC}"

# Login to Docker Hub if not already logged in
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${YELLOW}🔐 Please log in to Docker Hub${NC}"
    docker login -u "$DOCKER_USERNAME"
fi

# Push the image
docker push "$FULL_IMAGE"

echo ""
echo -e "${GREEN}✅ Image pushed to Docker Hub successfully!${NC}"

echo ""
echo -e "${BLUE}☁️  Deploying to Cloud Run...${NC}"

# Deploy to Cloud Run using the pushed image
gcloud run deploy frontend \
    --image "$FULL_IMAGE" \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --port 8080

cd ..

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe frontend --region us-central1 --format 'value(status.url)')
echo -e "${GREEN}🌐 Your app is live at: $SERVICE_URL${NC}"
echo ""

# Show the deployed image info
echo -e "${BLUE}📸 Deployed image: $FULL_IMAGE${NC}"
echo ""

echo "📝 Post-deployment checklist:"
echo "  1. Test the deployment: $SERVICE_URL"
echo "  2. Check health endpoint: $SERVICE_URL/api/health"
echo "  3. Verify authentication works"
echo "  4. Monitor logs: gcloud run logs read frontend --region us-central1 --limit 50"
echo ""
echo "💡 To run the same image locally:"
echo "  docker run --rm -p 9090:8080 -e NEXT_PUBLIC_SUPABASE_URL='$NEXT_PUBLIC_SUPABASE_URL' -e NEXT_PUBLIC_SUPABASE_ANON_KEY='$NEXT_PUBLIC_SUPABASE_ANON_KEY' $FULL_IMAGE"
echo ""
echo "🐳 Docker Hub image: $FULL_IMAGE"
echo ""

# Optional: Open the URL in browser
if command -v open &> /dev/null; then
    read -p "Open in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$SERVICE_URL"
    fi
elif command -v xdg-open &> /dev/null; then
    read -p "Open in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "$SERVICE_URL"
    fi
fi