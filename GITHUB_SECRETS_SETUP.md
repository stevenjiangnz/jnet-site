# GitHub Secrets Setup for Supabase Integration

## Required Secrets to Add

You need to add these secrets to your GitHub repository for the API service to work with Supabase in Cloud Run:

### 1. Navigate to GitHub Secrets
1. Go to your repository: https://github.com/[your-username]/jnet-site
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### 2. Add These Secrets

| Secret Name | Description | How to Get It |
|------------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | `https://lwksceirjogxlhohbkcs.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key that bypasses RLS | Run: `supabase projects api-keys --project-ref lwksceirjogxlhohbkcs` and copy the service_role key |

### 3. Optional: Environment-Specific Secrets

If you want different Supabase projects for development and production, you can use environment-specific secrets:

#### For Development Environment:
- Go to **Settings** → **Environments** → **development**
- Add environment-specific secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### For Production Environment:
- Go to **Settings** → **Environments** → **production**
- Add environment-specific secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Security Best Practices

⚠️ **IMPORTANT**: 
- Never commit these keys to your repository
- The service role key bypasses all Row Level Security
- Only use it in backend services (Cloud Run), never in frontend code
- Rotate keys immediately if compromised

## Verification

After adding the secrets, you can verify they're set by:
1. Triggering a deployment
2. Checking the Cloud Run service environment variables in GCP Console
3. Testing the API endpoints that interact with Supabase