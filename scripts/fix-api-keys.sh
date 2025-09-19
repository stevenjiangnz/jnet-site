#!/bin/bash
# Script to fix API key configuration across services

echo "Fixing API key configuration..."

# Get the current API key from stock-data-service
STOCK_API_KEY=$(gcloud run services describe stock-data-service --region us-central1 --format="value(spec.template.spec.containers[0].env[?name=='API_KEY'].value)")
echo "Stock Data Service API Key: $STOCK_API_KEY"

# Update api-service to use this API key when calling stock-data-service
echo "Updating api-service environment variables..."
gcloud run services update api-service \
  --region us-central1 \
  --update-env-vars "STOCK_DATA_SERVICE_API_KEY=$STOCK_API_KEY"

# For frontend, we need an API key to call api-service
# This should be a different key, but for now we'll use a standard one
API_SERVICE_KEY="api-service-key-2024"
echo "Updating frontend environment variables..."
gcloud run services update frontend \
  --region us-central1 \
  --update-env-vars "API_KEY=$API_SERVICE_KEY"

# Update api-service to accept this key
echo "Updating api-service to accept the frontend API key..."
gcloud run services update api-service \
  --region us-central1 \
  --update-env-vars "API_KEY=$API_SERVICE_KEY"

echo "API key configuration fixed!"
echo ""
echo "Summary:"
echo "- Frontend uses API_KEY=$API_SERVICE_KEY to call api-service"
echo "- api-service accepts API_KEY=$API_SERVICE_KEY"
echo "- api-service uses STOCK_DATA_SERVICE_API_KEY=$STOCK_API_KEY to call stock-data-service"
echo "- stock-data-service accepts API_KEY=$STOCK_API_KEY"