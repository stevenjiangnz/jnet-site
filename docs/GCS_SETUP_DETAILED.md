# Detailed Google Cloud Storage Setup for Stock Data Service

This guide provides step-by-step instructions with screenshots references for setting up GCS for the Stock Data Service.

## Prerequisites

- Google account
- Credit card (for GCP billing, though you get $300 free credits)
- Basic command line knowledge

## Step 1: Create Google Cloud Account

1. Go to [https://cloud.google.com](https://cloud.google.com)
2. Click "Get started for free"
3. Sign in with your Google account
4. Accept terms and conditions
5. Set up billing (you get $300 free credits for 90 days)

## Step 2: Create a New Project

### Using Google Cloud Console (Web UI)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top (it might say "My First Project")
3. Click "NEW PROJECT"
4. Enter the following:
   - **Project name**: `jnet-stock-data` (or your preferred name)
   - **Project ID**: This will be auto-generated, note it down
   - **Organization**: Leave as default
   - **Location**: Leave as default
5. Click "CREATE"
6. Wait for project creation (usually takes 10-30 seconds)

### Using gcloud CLI (Alternative)

```bash
# Install gcloud CLI first if not installed
# See: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Create project
gcloud projects create jnet-stock-data --name="JNet Stock Data"

# Set as active project
gcloud config set project jnet-stock-data
```

## Step 3: Enable Required APIs

### Using Console

1. In the Cloud Console, go to **APIs & Services > Library**
2. Search for "Cloud Storage API"
3. Click on it and press "ENABLE"
4. Wait for API to be enabled

### Using gcloud CLI

```bash
gcloud services enable storage-api.googleapis.com
```

## Step 4: Create Storage Bucket

### Using Console

1. Go to **Cloud Storage > Buckets** in the navigation menu
2. Click "CREATE BUCKET"
3. Configure the bucket:
   
   **Step 1 - Name your bucket**
   - Name: `jnet-stock-data-prod` (must be globally unique)
   - If taken, try: `jnet-stock-data-[yourname]-prod`
   - Click "CONTINUE"
   
   **Step 2 - Choose where to store your data**
   - Location type: Select "Region"
   - Region: Choose closest to you (e.g., `us-central1` for US Central)
   - Click "CONTINUE"
   
   **Step 3 - Choose a storage class**
   - Select "Standard" (best for frequently accessed data)
   - Click "CONTINUE"
   
   **Step 4 - Choose how to control access**
   - Select "Uniform" access control
   - Uncheck "Enforce public access prevention"
   - Click "CONTINUE"
   
   **Step 5 - Choose how to protect object data**
   - Leave defaults (no retention policy needed)
   - Click "CREATE"

### Using gsutil CLI

```bash
# Create bucket in us-central1 region
gsutil mb -p jnet-stock-data -c STANDARD -l us-central1 gs://jnet-stock-data-prod

# Verify bucket was created
gsutil ls
```

## Step 5: Create Service Account

### Using Console

1. Go to **IAM & Admin > Service Accounts**
2. Click "CREATE SERVICE ACCOUNT"
3. Fill in the details:
   
   **Service account details**
   - Service account name: `stock-data-service`
   - Service account ID: `stock-data-service` (auto-filled)
   - Description: `Service account for Stock Data Service to access GCS`
   - Click "CREATE AND CONTINUE"
   
   **Grant this service account access to project**
   - Click "Select a role"
   - Search for "Storage Object Admin"
   - Select it
   - Click "CONTINUE"
   
   **Grant users access to this service account** (Optional)
   - Skip this step
   - Click "DONE"

### Using gcloud CLI

```bash
# Create service account
gcloud iam service-accounts create stock-data-service \
    --display-name="Stock Data Service Account" \
    --description="Service account for Stock Data Service to access GCS"

# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding jnet-stock-data \
    --member="serviceAccount:stock-data-service@jnet-stock-data.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

## Step 6: Create and Download Service Account Key

### Using Console

1. In **IAM & Admin > Service Accounts**, find your service account
2. Click on `stock-data-service@[project-id].iam.gserviceaccount.com`
3. Go to the "KEYS" tab
4. Click "ADD KEY" > "Create new key"
5. Choose "JSON" as the key type
6. Click "CREATE"
7. The JSON file will download automatically
8. **IMPORTANT**: Save this file securely - you can't download it again!

### Using gcloud CLI

```bash
# Create and download key
gcloud iam service-accounts keys create ~/Downloads/gcs-service-account.json \
    --iam-account=stock-data-service@jnet-stock-data.iam.gserviceaccount.com
```

## Step 7: Set Up Credentials in Your Project

1. **Copy the downloaded JSON file to your project:**

```bash
# Navigate to your project directory
cd /home/sjiang/devlocal/jnet-site

# Copy the service account key
cp ~/Downloads/[your-key-file].json services/stock-data-service/credentials/gcs-service-account.json

# Verify the file is in place
ls -la services/stock-data-service/credentials/
```

2. **Set proper permissions:**

```bash
# Make credentials directory readable only by you
chmod 700 services/stock-data-service/credentials/
chmod 600 services/stock-data-service/credentials/gcs-service-account.json
```

## Step 8: Configure Environment Variables

1. **Create your local .env file:**

```bash
cd services/stock-data-service
cp .env.example .env
```

2. **Edit the .env file:**

```bash
# Open with your preferred editor
nano .env  # or vim .env
```

3. **Update these values:**

```env
# Google Cloud Storage
GCS_BUCKET_NAME=jnet-stock-data-prod  # Your actual bucket name
GCS_PROJECT_ID=jnet-stock-data        # Your actual project ID
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json

# Upstash Redis (we'll set this up next)
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token
CACHE_ENABLED=true
```

## Step 9: Verify Your Setup

1. **Create a test script** to verify GCS access:

```bash
# Create test script
cat > test_gcs_setup.py << 'EOF'
import os
from google.cloud import storage

# Set credentials
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'

try:
    # Initialize client
    client = storage.Client(project=os.getenv('GCS_PROJECT_ID', 'jnet-stock-data'))
    bucket_name = os.getenv('GCS_BUCKET_NAME', 'jnet-stock-data-prod')
    
    # Get bucket
    bucket = client.bucket(bucket_name)
    
    # Test write
    blob = bucket.blob('test/connection-test.txt')
    blob.upload_from_string('GCS connection successful!')
    print(f"✓ Successfully wrote to gs://{bucket_name}/test/connection-test.txt")
    
    # Test read
    content = blob.download_as_text()
    print(f"✓ Successfully read: {content}")
    
    # List blobs (should be at least our test file)
    blobs = list(bucket.list_blobs(prefix='test/'))
    print(f"✓ Found {len(blobs)} blob(s) in test/ directory")
    
    # Clean up
    blob.delete()
    print("✓ Successfully deleted test file")
    
    print("\n✅ GCS setup is working correctly!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nTroubleshooting:")
    print("1. Check if credentials file exists")
    print("2. Verify project ID and bucket name")
    print("3. Ensure service account has proper permissions")
EOF
```

2. **Run the test:**

```bash
# Load environment variables
source .env  # On Windows: use `set -a; . .env; set +a`

# Install Google Cloud Storage library if not already installed
uv add google-cloud-storage

# Run test
uv run python test_gcs_setup.py
```

## Step 10: Common Issues and Solutions

### Issue 1: Permission Denied
```
403 Forbidden: stock-data-service@xxx.iam.gserviceaccount.com does not have storage.objects.create access
```

**Solution**: Grant Storage Object Admin role to service account
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SERVICE_ACCOUNT_EMAIL]" \
    --role="roles/storage.objectAdmin"
```

### Issue 2: Bucket Not Found
```
404 Not Found: The specified bucket does not exist
```

**Solution**: Verify bucket name in .env matches actual bucket name
```bash
# List your buckets
gsutil ls
```

### Issue 3: Invalid Credentials
```
google.auth.exceptions.DefaultCredentialsError: Could not automatically determine credentials
```

**Solution**: 
1. Verify credentials file path is correct
2. Check if JSON file is valid: `cat credentials/gcs-service-account.json | jq .`
3. Ensure environment variable is set correctly

### Issue 4: Bucket Name Already Taken
```
Error: Bucket name 'jnet-stock-data' is already taken
```

**Solution**: Choose a unique name by adding suffix:
- `jnet-stock-data-[yourname]`
- `jnet-stock-data-[company]`
- `jnet-stock-data-[random-number]`

## Step 11: Cost Optimization Tips

1. **Set up lifecycle rules** to delete old data:
```bash
# Create lifecycle rule to delete files older than 365 days
echo '{"lifecycle": {"rule": [{"action": {"type": "Delete"}, "condition": {"age": 365}}]}}' > lifecycle.json
gsutil lifecycle set lifecycle.json gs://your-bucket-name
```

2. **Set up budget alerts:**
   - Go to **Billing > Budgets & alerts**
   - Create budget for $5-10/month
   - Set alerts at 50%, 90%, 100%

3. **Monitor usage:**
   - Go to **Cloud Storage > Browser > [Your Bucket]**
   - Click "Metrics" tab
   - Monitor storage size and request counts

## Next Steps

Now that GCS is set up, you should:

1. **Set up Upstash Redis** for caching (see next section)
2. **Test the service** with Docker Compose
3. **Download some test data** to verify everything works

## Upstash Redis Setup (Quick Guide)

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up for free account
3. Create a new Redis database:
   - Name: `jnet-stock-cache`
   - Region: Choose closest to your GCS region
   - Type: Regional (not Global)
4. Copy credentials from Upstash dashboard:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
5. Update your .env file with these values

## Final Verification

Run the Stock Data Service to verify everything works:

```bash
# Start with Docker Compose
cd /home/sjiang/devlocal/jnet-site
docker-compose up stock-data-service

# Or run locally
cd services/stock-data-service
uv run uvicorn app.main:app --reload --port 9000

# Test API
curl http://localhost:9000/health
curl http://localhost:9000/api/v1/download/AAPL?period=5d
```

Congratulations! Your GCS setup is complete. 🎉