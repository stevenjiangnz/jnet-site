#!/bin/bash

# Deploy frontend to Cloud Run with proper environment variables
# Usage: ./scripts/deploy-frontend-cloud-run.sh

set -e

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Supabase environment variables not set!"
    echo ""
    echo "Please set the following environment variables:"
    echo "  export NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "  export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key"
    echo ""
    echo "You can find these values in your Supabase project settings."
    exit 1
fi

echo "🚀 Deploying frontend to Cloud Run..."
echo ""
echo "Using Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

cd frontend

# Deploy with environment variables set both at build time and runtime
gcloud run deploy frontend \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-env-vars "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "If you still get errors, check the logs with:"
echo "  gcloud run logs read frontend --region us-central1 --limit 50"