# GitHub Secrets Setup for Stock Data Service

## Required Secrets

You need to add the following secrets to your GitHub repository for the Stock Data Service CI/CD workflow:

### 1. **STOCK_DATA_SERVICE_API_KEY** (Required)
- **Value**: `BQ1kpkId36uCXmq_HfXQLOfvY3jZJKiQ2bjSP2oU1XY`
- **Description**: API key for authenticating requests to the stock data service

### 2. **GCS_BUCKET_NAME** (Required)
- **Value**: `jnet-site-stock-data`
- **Description**: Google Cloud Storage bucket name for stock data

### 3. **GCP_PROJECT_ID** (Required)
- **Value**: `jnet-site`
- **Description**: Google Cloud Project ID

### 4. **GCP_SA_KEY** (Already exists)
- **Description**: Service account JSON key for Cloud Run deployment
- **Note**: This should already be configured from your jnet-site setup

### 5. **DOCKER_HUB_TOKEN** (Already exists)
- **Description**: Docker Hub access token
- **Note**: This should already be configured from your jnet-site setup

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the name and value listed above

## Verification

After adding the secrets, you can verify they're available by checking the workflow runs or by listing them (names only) in the GitHub UI.

## Security Notes
- Never commit these values to your repository
- The API key provides access to your stock data service
- The GCS credentials allow access to your storage bucket
- Rotate the API key periodically for security