#!/bin/bash

# Quick frontend deployment to Cloud Run
# This script builds and deploys directly without Docker Hub or Container Registry
# Usage: ./scripts/deploy-frontend-quick.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick Frontend Deployment to Cloud Run${NC}"
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

# Optional: Build locally first to catch errors early
echo -e "${BLUE}🔨 Building Next.js app locally...${NC}"
cd frontend
npm run build
cd ..

echo ""
echo -e "${BLUE}☁️  Deploying to Cloud Run...${NC}"
echo "This will build the Docker image in Cloud Build and deploy directly."
echo ""

cd frontend

# Deploy with source upload (Cloud Build will handle the Docker build)
gcloud run deploy frontend \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-env-vars "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60

cd ..

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe frontend --region us-central1 --format 'value(status.url)')
echo -e "${GREEN}🌐 Your app is live at: $SERVICE_URL${NC}"
echo ""

echo "📝 Post-deployment checklist:"
echo "  1. Test the deployment: $SERVICE_URL"
echo "  2. Check health endpoint: $SERVICE_URL/api/health"
echo "  3. Verify authentication works"
echo "  4. Monitor logs: gcloud run logs read frontend --region us-central1 --limit 50"
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