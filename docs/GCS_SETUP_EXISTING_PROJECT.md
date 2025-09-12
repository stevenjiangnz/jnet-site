# Using Existing GCP Project for Stock Data Service

This guide helps you configure the Stock Data Service to use your existing `jnet-site` GCP project and service account.

## Prerequisites

- Existing GCP project (e.g., `jnet-site`)
- Existing service account with some permissions
- Project owner/editor access to modify permissions

## Step 1: Identify Your Current Setup

First, let's identify your existing resources:

```bash
# Set your project (replace with your actual project ID)
gcloud config set project jnet-site

# List existing service accounts
gcloud iam service-accounts list

# List existing storage buckets
gsutil ls
```

## Step 2: Expand Service Account Permissions

### Option A: Using gcloud CLI (Recommended)

```bash
# Replace with your actual service account email
SERVICE_ACCOUNT_EMAIL="your-existing-sa@jnet-site.iam.gserviceaccount.com"

# Add Storage Object Admin role for GCS access
gcloud projects add-iam-policy-binding jnet-site \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.objectAdmin"

# Verify permissions were added
gcloud projects get-iam-policy jnet-site \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --format="table(bindings.role)"
```

### Option B: Using Console

1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam)
2. Select your project `jnet-site`
3. Find your existing service account
4. Click the pencil icon to edit
5. Click "ADD ANOTHER ROLE"
6. Search and add: **Storage Object Admin**
7. Click "SAVE"

## Step 3: Create or Use Existing Bucket

### Check Existing Buckets

```bash
# List all buckets in your project
gsutil ls

# If you see a suitable bucket, note its name
# If not, create a new one:
```

### Create Stock Data Bucket (if needed)

```bash
# Create a new bucket for stock data
# Replace 'your-unique-suffix' to ensure global uniqueness
gsutil mb -p jnet-site -c STANDARD -l us-central1 gs://jnet-site-stock-data

# Or if you prefer to keep everything in one bucket with folders:
# Use existing bucket with a stock-data prefix
EXISTING_BUCKET="jnet-site-data"  # Replace with your bucket name
```

## Step 4: Download Existing Service Account Key

### If you already have the key file:

```bash
# Copy existing key to stock-data-service
cp /path/to/your/existing-key.json services/stock-data-service/credentials/gcs-service-account.json
```

### If you need to create a new key:

```bash
# Create new key for existing service account
gcloud iam service-accounts keys create \
    ./services/stock-data-service/credentials/gcs-service-account.json \
    --iam-account=${SERVICE_ACCOUNT_EMAIL}
```

## Step 5: Configure Environment Variables

Update your `.env` file with existing project details:

```bash
cd services/stock-data-service
cp .env.example .env

# Edit .env with your actual values
nano .env
```

Update these values:

```env
# Google Cloud Storage - Using existing project
GCS_BUCKET_NAME=jnet-site-stock-data    # Or your existing bucket name
GCS_PROJECT_ID=jnet-site                # Your existing project ID
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json

# Optional: If using subfolder in existing bucket
# You would need to update storage_paths.py to include this prefix
# GCS_STORAGE_PREFIX=stock-data/
```

## Step 6: Update Storage Paths (if using existing bucket)

If you're using an existing bucket with a subfolder structure, update the storage paths:

```bash
# Edit storage paths configuration
nano app/services/storage_paths.py
```

Modify to include your prefix:

```python
class StoragePaths:
    """Centralized management of GCS storage paths."""
    
    # Add base prefix if using subfolder in existing bucket
    BASE_PREFIX = "stock-data/"  # Or empty string if dedicated bucket
    
    # Base prefixes for different data types
    DAILY_PREFIX = f"{BASE_PREFIX}daily/"
    WEEKLY_PREFIX = f"{BASE_PREFIX}weekly/"
    METADATA_PREFIX = f"{BASE_PREFIX}metadata/"
    
    # ... rest of the file remains the same
```

## Step 7: Test the Configuration

Create a test script to verify everything works:

```python
# test_existing_setup.py
import os
from google.cloud import storage

# Set your values
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'
PROJECT_ID = 'jnet-site'
BUCKET_NAME = 'jnet-site-stock-data'  # Your bucket name

try:
    # Test connection
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(BUCKET_NAME)
    
    # Test write
    blob = bucket.blob('stock-data/test/connection-test.txt')
    blob.upload_from_string('Connection successful with existing project!')
    print(f"✓ Successfully wrote to gs://{BUCKET_NAME}/stock-data/test/connection-test.txt")
    
    # Test read
    content = blob.download_as_text()
    print(f"✓ Successfully read: {content}")
    
    # List service account permissions (informational)
    print(f"\n✓ Using project: {PROJECT_ID}")
    print(f"✓ Using bucket: {BUCKET_NAME}")
    
    # Clean up
    blob.delete()
    print("✓ Test file cleaned up")
    
except Exception as e:
    print(f"❌ Error: {e}")
```

Run the test:

```bash
cd services/stock-data-service
uv run python test_existing_setup.py
```

## Step 8: Verify Docker Compose Configuration

Ensure your Docker Compose environment matches:

```yaml
# docker-compose.yml (stock-data-service section)
environment:
  - GCS_BUCKET_NAME=${GCS_BUCKET_NAME:-jnet-site-stock-data}
  - GCS_PROJECT_ID=${GCS_PROJECT_ID:-jnet-site}
  - GCS_CREDENTIALS_PATH=/app/credentials/gcs-service-account.json
```

## Common Scenarios

### Scenario 1: Using Completely Separate Bucket

Best for isolation and organization:

```bash
# Create dedicated bucket
gsutil mb -p jnet-site gs://jnet-site-stock-data

# Use as-is with code
GCS_BUCKET_NAME=jnet-site-stock-data
```

### Scenario 2: Using Existing Bucket with Folders

Best for consolidation:

```bash
# Use existing bucket
GCS_BUCKET_NAME=jnet-site-data

# Update StoragePaths.py to add prefix
BASE_PREFIX = "stock-data/"
```

### Scenario 3: Multiple Service Accounts

If you want a dedicated service account for stock data:

```bash
# Create new service account in existing project
gcloud iam service-accounts create stock-data-service \
    --display-name="Stock Data Service" \
    --project=jnet-site

# Grant permissions only to specific bucket
gsutil iam ch \
    serviceAccount:stock-data-service@jnet-site.iam.gserviceaccount.com:objectAdmin \
    gs://jnet-site-stock-data
```

## Verification Checklist

- [ ] Service account has `Storage Object Admin` role
- [ ] Bucket exists and is accessible
- [ ] Service account key file is in place
- [ ] `.env` file has correct project ID and bucket name
- [ ] Test script runs successfully
- [ ] Docker container can access GCS

## Security Best Practices

1. **Principle of Least Privilege**: If possible, scope permissions to specific buckets:
   ```bash
   # Remove project-wide access
   gcloud projects remove-iam-policy-binding jnet-site \
       --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
       --role="roles/storage.objectAdmin"
   
   # Add bucket-specific access
   gsutil iam ch \
       serviceAccount:${SERVICE_ACCOUNT_EMAIL}:objectAdmin \
       gs://jnet-site-stock-data
   ```

2. **Separate Buckets**: Consider using separate buckets for different data types:
   - `jnet-site-public` - Public assets
   - `jnet-site-private` - User data
   - `jnet-site-stock-data` - Stock market data

3. **Audit Logging**: Enable audit logs for the bucket:
   ```bash
   gsutil logging set on -b gs://jnet-site-logs gs://jnet-site-stock-data
   ```

## Troubleshooting

### Check Current Permissions

```bash
# View all roles for service account
gcloud projects get-iam-policy jnet-site \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:*" \
    --format="table(bindings.members,bindings.role)"

# Check bucket permissions
gsutil iam get gs://your-bucket-name
```

### Test Specific Permissions

```bash
# Test read
gsutil -i your-sa@jnet-site.iam.gserviceaccount.com ls gs://your-bucket/

# Test write
echo "test" | gsutil -i your-sa@jnet-site.iam.gserviceaccount.com cp - gs://your-bucket/test.txt

# Test delete
gsutil -i your-sa@jnet-site.iam.gserviceaccount.com rm gs://your-bucket/test.txt
```

## Next Steps

1. Run the stock data service:
   ```bash
   docker-compose up stock-data-service
   ```

2. Test downloading stock data:
   ```bash
   curl http://localhost:9001/api/v1/download/AAPL?period=5d
   ```

3. Verify data in GCS:
   ```bash
   gsutil ls gs://your-bucket-name/stock-data/daily/
   ```