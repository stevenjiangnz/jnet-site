# Google Cloud Storage Setup Guide

This guide will help you set up Google Cloud Storage (GCS) for the Stock Data Service.

## Prerequisites

- Google Cloud Platform (GCP) account
- `gcloud` CLI installed (optional but recommended)
- Project owner or editor permissions

## Step 1: Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown and select "New Project"
3. Enter a project name (e.g., `jnet-stock-data`)
4. Note your Project ID (you'll need this)

## Step 2: Enable APIs

Enable the required APIs for your project:

```bash
# Using gcloud CLI
gcloud services enable storage-api.googleapis.com

# Or in the Console:
# 1. Go to APIs & Services > Library
# 2. Search for "Cloud Storage API"
# 3. Click Enable
```

## Step 3: Create a Storage Bucket

```bash
# Using gcloud CLI
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://jnet-stock-data

# Or in the Console:
# 1. Go to Cloud Storage > Buckets
# 2. Click "Create Bucket"
# 3. Name: jnet-stock-data (must be globally unique)
# 4. Location: us-central1 (or your preferred region)
# 5. Storage class: Standard
# 6. Access control: Uniform
```

## Step 4: Create a Service Account

1. Go to IAM & Admin > Service Accounts
2. Click "Create Service Account"
3. Details:
   - Name: `stock-data-service`
   - ID: `stock-data-service`
   - Description: Service account for Stock Data Service
4. Grant roles:
   - Storage Object Admin (for the specific bucket)
   - Or Storage Admin (for broader access)
5. Click "Done"

## Step 5: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose JSON format
5. Save the downloaded file as `gcs-service-account.json`
6. Place it in: `services/stock-data-service/credentials/`

## Step 6: Set Up Environment Variables

Create or update your `.env` file:

```bash
# Google Cloud Storage
GCS_BUCKET_NAME=jnet-stock-data
GCS_PROJECT_ID=your-project-id
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json
```

## Step 7: Verify Setup

Test your configuration:

```python
# Test script (save as test_gcs.py)
from google.cloud import storage
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'

client = storage.Client(project='your-project-id')
bucket = client.bucket('jnet-stock-data')

# Test write
blob = bucket.blob('test/test.txt')
blob.upload_from_string('Hello from Stock Data Service!')

# Test read
content = blob.download_as_text()
print(f"Successfully wrote and read: {content}")

# Clean up
blob.delete()
```

## Security Best Practices

1. **Never commit credentials**
   - The `credentials/` directory is gitignored
   - Never commit the service account JSON file

2. **Principle of Least Privilege**
   - Grant only necessary permissions
   - Use bucket-specific IAM roles when possible

3. **Rotate Keys Regularly**
   - Regenerate service account keys periodically
   - Remove unused keys

4. **Use Application Default Credentials in Production**
   - On Google Cloud services (Cloud Run, GKE), use ADC instead of key files
   - Set up Workload Identity for GKE

## Bucket Organization

The bucket is organized as follows:

```
gs://jnet-stock-data/
├── stock-data/
│   ├── daily/
│   │   ├── AAPL.json
│   │   ├── GOOGL.json
│   │   └── [symbol].json
│   ├── weekly/
│   │   ├── AAPL.json
│   │   └── [symbol].json
│   └── metadata/
│       ├── profile.json
│       └── symbol-index.json
```

## Cost Estimation

Typical costs for stock data storage:

- **Storage**: ~$0.020 per GB per month
  - 10,000 symbols × 100KB each = 1GB = $0.02/month
- **Operations**: 
  - Class A (writes): $0.005 per 1,000 operations
  - Class B (reads): $0.0004 per 1,000 operations
- **Network**: Free within same region

Estimated monthly cost for typical usage: < $5

## Troubleshooting

### Authentication Errors
```
google.auth.exceptions.DefaultCredentialsError: Could not automatically determine credentials
```
**Solution**: Ensure `GCS_CREDENTIALS_PATH` points to valid JSON key file

### Permission Denied
```
403 Forbidden: xxx@xxx.iam.gserviceaccount.com does not have storage.objects.create access
```
**Solution**: Grant "Storage Object Admin" role to the service account

### Bucket Not Found
```
404 Not Found: The specified bucket does not exist
```
**Solution**: Verify bucket name in `GCS_BUCKET_NAME` matches actual bucket

## Monitoring

Set up monitoring in Google Cloud Console:

1. Go to Cloud Storage > Buckets > your-bucket
2. Click on "Metrics" tab
3. Monitor:
   - Object count
   - Bucket size
   - Request rate
   - Error rate

## Next Steps

- Set up lifecycle policies for old data
- Configure CORS if needed for direct browser access
- Set up Cloud CDN for global distribution
- Implement backup strategy