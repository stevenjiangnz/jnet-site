# GitHub Secrets Setup for CI/CD

## Required GitHub Secrets

To deploy the application with Supabase authentication via GitHub Actions, you need to add the following secrets to your GitHub repository:

### 1. Supabase Configuration (Required)
- **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project URL
  - Value: `https://lwksceirjogxlhohbkcs.supabase.co`
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase anonymous key
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a3NjZWlyam9neGxob2hia2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDk1MzgsImV4cCI6MjA3Mjk4NTUzOH0.c1W743KiBjCyTCmYUS9Xa2aWVRqqw3eg4oR5ZvA6SB8`

### 2. Docker Hub (Already configured)
- **`DOCKER_HUB_TOKEN`**: Your Docker Hub access token
- **`DOCKER_USERNAME`**: Your Docker Hub username (optional, defaults to 'stevenjiangnz')

### 3. Google Cloud Platform (Already configured)
- **`GCP_SA_KEY`**: Service account JSON key for deployment
- **`GCP_PROJECT_ID`**: Your Google Cloud project ID

## How to Add GitHub Secrets

1. Go to your repository on GitHub
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value

## Important Notes

- These secrets are used during the CI/CD build process to inject environment variables
- The `NEXT_PUBLIC_*` variables are built into the frontend at build time
- Never commit these values directly to your repository
- The same values should be used for both development and production unless you have separate Supabase projects

## Verifying the Setup

After adding the secrets, your next push to `develop` or `main` branch will:
1. Build the Docker image with Supabase configuration
2. Deploy to Google Cloud Run with the environment variables set
3. The authentication should work in the deployed application