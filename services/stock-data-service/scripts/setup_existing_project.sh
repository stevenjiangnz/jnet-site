#!/bin/bash

# Stock Data Service - Setup Script for Existing GCP Project
# This script helps configure the service to use an existing project

set -e

echo "=== Stock Data Service - Existing Project Setup ==="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}No active GCP project found.${NC}"
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "Current GCP Project: ${GREEN}$CURRENT_PROJECT${NC}"
echo

# Ask if they want to use current project
read -p "Use this project for Stock Data Service? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter project ID to use: " PROJECT_ID
    gcloud config set project $PROJECT_ID
    CURRENT_PROJECT=$PROJECT_ID
fi

echo -e "\nUsing project: ${GREEN}$CURRENT_PROJECT${NC}"

# List service accounts
echo -e "\n${YELLOW}=== Service Accounts in Project ===${NC}"
gcloud iam service-accounts list --project=$CURRENT_PROJECT

# Get service account email
echo
read -p "Enter service account email (or press Enter to create new): " SA_EMAIL

if [ -z "$SA_EMAIL" ]; then
    # Create new service account
    SA_NAME="stock-data-service"
    SA_EMAIL="$SA_NAME@$CURRENT_PROJECT.iam.gserviceaccount.com"
    
    echo -e "\n${YELLOW}Creating new service account: $SA_EMAIL${NC}"
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Stock Data Service" \
        --project=$CURRENT_PROJECT
fi

# Add permissions
echo -e "\n${YELLOW}=== Adding Required Permissions ===${NC}"
echo "Adding Storage Object Admin role..."

gcloud projects add-iam-policy-binding $CURRENT_PROJECT \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.objectAdmin" \
    --condition=None \
    --quiet

echo -e "${GREEN}✓ Permissions added${NC}"

# List buckets
echo -e "\n${YELLOW}=== Available Storage Buckets ===${NC}"
gsutil ls -p $CURRENT_PROJECT 2>/dev/null || echo "No buckets found"

# Get bucket name
echo
read -p "Enter bucket name (or press Enter to create new): " BUCKET_NAME

if [ -z "$BUCKET_NAME" ]; then
    # Generate unique bucket name
    BUCKET_NAME="$CURRENT_PROJECT-stock-data"
    echo -e "\n${YELLOW}Creating new bucket: gs://$BUCKET_NAME${NC}"
    
    # Ask for region
    echo "Select region:"
    echo "1) us-central1 (Iowa)"
    echo "2) us-east1 (South Carolina)"
    echo "3) europe-west1 (Belgium)"
    echo "4) asia-northeast1 (Tokyo)"
    read -p "Enter choice (1-4): " region_choice
    
    case $region_choice in
        1) REGION="us-central1";;
        2) REGION="us-east1";;
        3) REGION="europe-west1";;
        4) REGION="asia-northeast1";;
        *) REGION="us-central1";;
    esac
    
    gsutil mb -p $CURRENT_PROJECT -c STANDARD -l $REGION gs://$BUCKET_NAME
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Download service account key
echo -e "\n${YELLOW}=== Service Account Key ===${NC}"

CRED_DIR="./credentials"
KEY_FILE="$CRED_DIR/gcs-service-account.json"

mkdir -p $CRED_DIR

if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}Key file already exists at $KEY_FILE${NC}"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key file"
    else
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SA_EMAIL \
            --project=$CURRENT_PROJECT
        chmod 600 $KEY_FILE
        echo -e "${GREEN}✓ New key created${NC}"
    fi
else
    echo "Creating new service account key..."
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL \
        --project=$CURRENT_PROJECT
    chmod 600 $KEY_FILE
    echo -e "${GREEN}✓ Key created${NC}"
fi

# Create .env file
echo -e "\n${YELLOW}=== Creating .env Configuration ===${NC}"

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Backing up existing .env to .env.backup${NC}"
    cp $ENV_FILE "$ENV_FILE.backup"
fi

cat > $ENV_FILE << EOF
# Environment Configuration
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DATA_DIRECTORY=./data

# API Configuration
API_V1_PREFIX=/api/v1

# Storage Configuration
MAX_FILE_AGE_DAYS=365
DEFAULT_DATA_FORMAT=json

# Rate Limiting
RATE_LIMIT_CALLS=5
RATE_LIMIT_PERIOD=1

# Google Cloud Storage
GCS_BUCKET_NAME=$BUCKET_NAME
GCS_PROJECT_ID=$CURRENT_PROJECT
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json

# Upstash Redis (configure later)
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token
CACHE_ENABLED=false
EOF

echo -e "${GREEN}✓ .env file created${NC}"

# Test configuration
echo -e "\n${YELLOW}=== Testing Configuration ===${NC}"

cat > test_config.py << 'EOF'
import os
from google.cloud import storage

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'

try:
    # Load from .env
    from dotenv import load_dotenv
    load_dotenv()
    
    project_id = os.getenv('GCS_PROJECT_ID')
    bucket_name = os.getenv('GCS_BUCKET_NAME')
    
    print(f"Testing connection to project: {project_id}")
    print(f"Using bucket: {bucket_name}")
    
    client = storage.Client(project=project_id)
    bucket = client.bucket(bucket_name)
    
    # Test write
    blob = bucket.blob('test/setup-test.txt')
    blob.upload_from_string('Setup test successful!')
    print("✓ Write test passed")
    
    # Test read
    content = blob.download_as_text()
    print("✓ Read test passed")
    
    # Cleanup
    blob.delete()
    print("✓ Delete test passed")
    
    print("\n✅ All tests passed! Configuration is working.")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nPlease check your configuration and try again.")
EOF

# Install python-dotenv if needed
pip install python-dotenv google-cloud-storage --quiet 2>/dev/null || true

python test_config.py

# Cleanup test script
rm -f test_config.py

# Summary
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo
echo "Configuration Summary:"
echo "  Project ID: $CURRENT_PROJECT"
echo "  Service Account: $SA_EMAIL"
echo "  Bucket: gs://$BUCKET_NAME"
echo "  Credentials: $KEY_FILE"
echo
echo "Next steps:"
echo "1. Configure Upstash Redis (optional)"
echo "2. Run: docker-compose up stock-data-service"
echo "3. Test: curl http://localhost:9001/api/v1/download/AAPL?period=5d"
echo
echo -e "${GREEN}Happy coding! 🚀${NC}"