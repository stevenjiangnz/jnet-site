# GCS Setup Troubleshooting Guide

## Common Issues and Solutions

### 1. Authentication Errors

#### Error: "Could not automatically determine credentials"
```
google.auth.exceptions.DefaultCredentialsError: Could not automatically determine credentials
```

**Causes & Solutions:**

1. **Missing credentials file**
   ```bash
   # Check if file exists
   ls -la services/stock-data-service/credentials/gcs-service-account.json
   
   # If missing, download again from GCP Console
   ```

2. **Wrong path in .env**
   ```bash
   # Check .env file
   cat services/stock-data-service/.env | grep GCS_CREDENTIALS_PATH
   
   # Should be: ./credentials/gcs-service-account.json
   ```

3. **Invalid JSON file**
   ```bash
   # Validate JSON
   cat services/stock-data-service/credentials/gcs-service-account.json | python -m json.tool
   
   # Should show formatted JSON, not error
   ```

### 2. Permission Errors

#### Error: "403 Forbidden"
```
403 Forbidden: stock-data-service@xxx.iam.gserviceaccount.com does not have storage.objects.create access
```

**Solution:**
```bash
# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:stock-data-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

# Verify permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:stock-data-service@*"
```

### 3. Bucket Errors

#### Error: "404 The specified bucket does not exist"
```
google.api_core.exceptions.NotFound: 404 GET https://storage.googleapis.com/storage/v1/b/jnet-stock-data
```

**Solutions:**

1. **Check bucket name**
   ```bash
   # List your buckets
   gsutil ls
   
   # Verify in .env matches actual bucket
   grep GCS_BUCKET_NAME services/stock-data-service/.env
   ```

2. **Create bucket if missing**
   ```bash
   gsutil mb -p YOUR_PROJECT_ID gs://your-bucket-name
   ```

#### Error: "Bucket name already exists"
```
googleapiclient.errors.HttpError: 409 Conflict: The requested bucket name is not available
```

**Solution:** Use unique name
```bash
# Try with your username or random suffix
gsutil mb gs://jnet-stock-data-yourname-prod
gsutil mb gs://jnet-stock-data-$(date +%s)
```

### 4. Docker-Related Issues

#### Error: "No such file or directory" in Docker
```
FileNotFoundError: [Errno 2] No such file or directory: '/app/credentials/gcs-service-account.json'
```

**Solution:**
```bash
# Ensure credentials directory exists
mkdir -p services/stock-data-service/credentials

# Copy credentials
cp ~/Downloads/your-key.json services/stock-data-service/credentials/gcs-service-account.json

# Restart Docker Compose
docker-compose restart stock-data-service
```

### 5. Network/Firewall Issues

#### Error: "Connection timed out"
```
requests.exceptions.ConnectTimeout: HTTPSConnectionPool(host='storage.googleapis.com', port=443)
```

**Solutions:**

1. **Check internet connection**
   ```bash
   ping storage.googleapis.com
   curl https://storage.googleapis.com
   ```

2. **Corporate proxy/firewall**
   ```bash
   # Set proxy if needed
   export HTTPS_PROXY=http://your-proxy:port
   export HTTP_PROXY=http://your-proxy:port
   ```

3. **Docker DNS issues**
   ```bash
   # Restart Docker
   sudo systemctl restart docker
   # or
   docker system prune -a
   ```

### 6. API/Service Issues

#### Error: "API not enabled"
```
403 Cloud Storage JSON API has not been used in project
```

**Solution:**
```bash
# Enable the API
gcloud services enable storage-api.googleapis.com

# Verify enabled
gcloud services list --enabled | grep storage
```

### 7. Debugging Steps

#### Step 1: Test Outside Docker
```python
# test_gcs_direct.py
import os
from google.cloud import storage

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'

try:
    client = storage.Client()
    buckets = list(client.list_buckets())
    print(f"Found {len(buckets)} buckets")
    for bucket in buckets:
        print(f"- {bucket.name}")
except Exception as e:
    print(f"Error: {e}")
```

#### Step 2: Check Environment Variables
```bash
# In Docker container
docker-compose exec stock-data-service bash
env | grep GCS

# Should show:
# GCS_BUCKET_NAME=...
# GCS_PROJECT_ID=...
# GCS_CREDENTIALS_PATH=...
```

#### Step 3: Test with gsutil
```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=./credentials/gcs-service-account.json

# Test access
gsutil ls gs://your-bucket-name/
```

### 8. Quick Fixes Script

Create this script to diagnose issues:

```bash
#!/bin/bash
# save as diagnose_gcs.sh

echo "=== GCS Setup Diagnostic ==="

# Check credentials file
echo -n "Checking credentials file... "
if [ -f "services/stock-data-service/credentials/gcs-service-account.json" ]; then
    echo "✓ Found"
else
    echo "✗ Missing"
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f "services/stock-data-service/.env" ]; then
    echo "✓ Found"
    echo "GCS settings:"
    grep "GCS_" services/stock-data-service/.env
else
    echo "✗ Missing"
fi

# Check if gcloud is installed
echo -n "Checking gcloud CLI... "
if command -v gcloud &> /dev/null; then
    echo "✓ Installed"
    echo "Active project: $(gcloud config get-value project)"
else
    echo "✗ Not installed"
fi

# Test Python import
echo -n "Checking Python GCS library... "
cd services/stock-data-service
if uv run python -c "import google.cloud.storage" 2>/dev/null; then
    echo "✓ Installed"
else
    echo "✗ Not installed"
fi

echo "=== End Diagnostic ==="
```

### 9. Reset Everything

If all else fails, start fresh:

```bash
# 1. Delete service account
gcloud iam service-accounts delete stock-data-service@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 2. Delete bucket
gsutil rm -r gs://your-bucket-name

# 3. Remove local files
rm -rf services/stock-data-service/credentials/*
rm services/stock-data-service/.env

# 4. Start over with setup guide
```

### 10. Get Help

If still having issues:

1. **Check GCP Status**: https://status.cloud.google.com/
2. **Enable Debug Logging**:
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```
3. **GCP Support**: https://cloud.google.com/support
4. **Community**: https://stackoverflow.com/questions/tagged/google-cloud-storage