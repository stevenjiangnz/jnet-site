# Stock Data Service - Existing Project Configuration

## Quick Configuration Steps

### 1. Find Your Existing Service Account

```bash
# List service accounts in your project
gcloud iam service-accounts list --project=jnet-site

# Example output:
# EMAIL                                    NAME
# sa-123456@jnet-site.iam.gserviceaccount.com  My Service Account
```

### 2. Add Required Permissions

```bash
# Set your service account email
export SA_EMAIL="your-service-account@jnet-site.iam.gserviceaccount.com"

# Add Storage Object Admin role
gcloud projects add-iam-policy-binding jnet-site \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectAdmin"
```

### 3. Create Stock Data Bucket

```bash
# Option 1: Create new bucket
gsutil mb -p jnet-site gs://jnet-site-stock-data

# Option 2: Use existing bucket with folder
# No action needed, just note your bucket name
```

### 4. Configure .env File

```bash
# Copy and edit .env
cd services/stock-data-service
cp .env.example .env
```

Edit `.env`:
```env
# Using existing jnet-site project
GCS_BUCKET_NAME=jnet-site-stock-data
GCS_PROJECT_ID=jnet-site
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json

# Upstash Redis (optional)
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token
CACHE_ENABLED=true
```

### 5. Copy/Create Service Account Key

```bash
# If you have existing key
cp /path/to/existing-key.json ./credentials/gcs-service-account.json

# If you need new key
gcloud iam service-accounts keys create \
    ./credentials/gcs-service-account.json \
    --iam-account=${SA_EMAIL}
```

### 6. Test Configuration

```python
# Quick test - save as test.py
import os
from google.cloud import storage

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'

client = storage.Client(project='jnet-site')
bucket = client.bucket('jnet-site-stock-data')

# Test write
blob = bucket.blob('test.txt')
blob.upload_from_string('Test OK')
print("✓ GCS connection successful!")

# Cleanup
blob.delete()
```

## Configuration Options

### Option 1: Dedicated Bucket (Recommended)

```env
GCS_BUCKET_NAME=jnet-site-stock-data
# Data structure: /daily/AAPL.json
```

### Option 2: Shared Bucket with Prefix

If using existing bucket like `jnet-site-data`:

1. Update `.env`:
```env
GCS_BUCKET_NAME=jnet-site-data
```

2. Modify `app/services/storage_paths.py`:
```python
class StoragePaths:
    # Add prefix for stock data
    BASE_PREFIX = "stock-data/"
    
    DAILY_PREFIX = f"{BASE_PREFIX}daily/"
    WEEKLY_PREFIX = f"{BASE_PREFIX}weekly/"
    METADATA_PREFIX = f"{BASE_PREFIX}metadata/"
```

### Option 3: Multiple Environments

For dev/staging/prod:

```env
# .env.development
GCS_BUCKET_NAME=jnet-site-stock-data-dev
GCS_PROJECT_ID=jnet-site-dev

# .env.production  
GCS_BUCKET_NAME=jnet-site-stock-data-prod
GCS_PROJECT_ID=jnet-site
```

## Permissions Reference

### Minimum Required Permissions

The service account needs these permissions on the bucket:

- `storage.objects.create` - Upload new data
- `storage.objects.get` - Read data
- `storage.objects.list` - List symbols
- `storage.objects.delete` - Update/replace data

### Role Options

1. **Storage Object Admin** (easiest, includes all above)
   ```bash
   gcloud projects add-iam-policy-binding jnet-site \
       --member="serviceAccount:${SA_EMAIL}" \
       --role="roles/storage.objectAdmin"
   ```

2. **Custom Role** (more secure)
   ```bash
   # Create custom role
   gcloud iam roles create stockDataServiceRole \
       --project=jnet-site \
       --title="Stock Data Service Role" \
       --permissions=storage.objects.create,storage.objects.get,storage.objects.list,storage.objects.delete
   
   # Assign to service account
   gcloud projects add-iam-policy-binding jnet-site \
       --member="serviceAccount:${SA_EMAIL}" \
       --role="projects/jnet-site/roles/stockDataServiceRole"
   ```

3. **Bucket-Level Permissions** (most secure)
   ```bash
   # Remove project-wide permissions if any
   gcloud projects remove-iam-policy-binding jnet-site \
       --member="serviceAccount:${SA_EMAIL}" \
       --role="roles/storage.objectAdmin"
   
   # Add bucket-specific permissions
   gsutil iam ch \
       serviceAccount:${SA_EMAIL}:objectAdmin \
       gs://jnet-site-stock-data
   ```

## Verification Commands

```bash
# Check service account roles
gcloud projects get-iam-policy jnet-site \
    --filter="bindings.members:serviceAccount:${SA_EMAIL}" \
    --format="table(bindings.role)"

# Test bucket access
gsutil ls gs://jnet-site-stock-data/

# Check bucket IAM
gsutil iam get gs://jnet-site-stock-data

# Test write permission
echo "test" | gsutil cp - gs://jnet-site-stock-data/test.txt
gsutil rm gs://jnet-site-stock-data/test.txt
```

## Common Issues

### Issue: "Permission denied" even after adding role

**Solution**: Roles can take a minute to propagate. Wait and retry.

### Issue: Multiple service accounts confused

**Solution**: Explicitly set in code:
```python
from google.oauth2 import service_account

credentials = service_account.Credentials.from_service_account_file(
    './credentials/gcs-service-account.json'
)
client = storage.Client(credentials=credentials, project='jnet-site')
```

### Issue: Bucket name conflicts

**Solution**: Use unique naming:
- `jnet-site-stock-data`
- `jnet-site-data-stocks`
- `jnet-stock-service-data`

## Ready to Go!

Once configured, start the service:

```bash
# With Docker Compose
docker-compose up stock-data-service

# Or locally
cd services/stock-data-service
uv run uvicorn app.main:app --reload --port 9000

# Test API
curl http://localhost:9001/api/v1/download/AAPL?period=5d
```