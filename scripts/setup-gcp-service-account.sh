#!/bin/bash

# Set your project ID
PROJECT_ID="your-project-id"  # Replace with your actual project ID

echo "Setting up GCP service account for GitHub Actions..."

# Set the project
gcloud config set project $PROJECT_ID

# Create service account
echo "Creating service account..."
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions CI/CD" \
    --description="Service account for GitHub Actions CI/CD pipeline"

# Grant necessary roles
echo "Granting permissions..."
SERVICE_ACCOUNT_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Artifact Registry Writer (to push Docker images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/artifactregistry.writer"

# Cloud Run Admin (to deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.admin"

# Service Account User (to act as service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# Storage Admin (if using Cloud Storage)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.admin"

# Create and download key
echo "Creating service account key..."
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account="${SERVICE_ACCOUNT_EMAIL}"

echo "✅ Service account created successfully!"
echo "📄 Key saved to: github-actions-key.json"
echo ""
echo "⚠️  IMPORTANT: This key file contains sensitive credentials."
echo "    - Copy its contents to add as GitHub secret"
echo "    - Delete the file after adding to GitHub"
echo "    - Never commit this file to your repository"