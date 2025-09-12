# GCS Quick Setup Reference

## 1. Create GCP Project
```bash
# Option A: Console
# Go to https://console.cloud.google.com
# Click "New Project" → Name: jnet-stock-data

# Option B: CLI
gcloud projects create jnet-stock-data --name="JNet Stock Data"
gcloud config set project jnet-stock-data
```

## 2. Enable APIs
```bash
gcloud services enable storage-api.googleapis.com
```

## 3. Create Bucket
```bash
# Create bucket (change name if taken)
gsutil mb -p jnet-stock-data -c STANDARD -l us-central1 gs://jnet-stock-data-prod
```

## 4. Create Service Account
```bash
# Create service account
gcloud iam service-accounts create stock-data-service \
    --display-name="Stock Data Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding jnet-stock-data \
    --member="serviceAccount:stock-data-service@jnet-stock-data.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

## 5. Download Credentials
```bash
# Create key
gcloud iam service-accounts keys create ~/Downloads/gcs-service-account.json \
    --iam-account=stock-data-service@jnet-stock-data.iam.gserviceaccount.com

# Copy to project
cp ~/Downloads/gcs-service-account.json services/stock-data-service/credentials/

# Set permissions
chmod 600 services/stock-data-service/credentials/gcs-service-account.json
```

## 6. Configure .env
```bash
cd services/stock-data-service
cp .env.example .env

# Edit .env with:
# GCS_BUCKET_NAME=jnet-stock-data-prod
# GCS_PROJECT_ID=jnet-stock-data
# GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json
```

## 7. Test Connection
```python
# Quick test
from google.cloud import storage
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = './credentials/gcs-service-account.json'
client = storage.Client(project='jnet-stock-data')
bucket = client.bucket('jnet-stock-data-prod')
blob = bucket.blob('test.txt')
blob.upload_from_string('Test successful!')
print("✅ GCS connected successfully!")
```

## Required Information Checklist
- [ ] Project ID: `jnet-stock-data`
- [ ] Bucket Name: `jnet-stock-data-prod` (or your unique name)
- [ ] Service Account Email: `stock-data-service@jnet-stock-data.iam.gserviceaccount.com`
- [ ] Credentials File: `./credentials/gcs-service-account.json`
- [ ] Region: `us-central1` (or your chosen region)

## Common Commands
```bash
# List buckets
gsutil ls

# List bucket contents
gsutil ls gs://jnet-stock-data-prod/

# Check bucket size
gsutil du -sh gs://jnet-stock-data-prod/

# View bucket info
gsutil info gs://jnet-stock-data-prod/
```