# Supabase OAuth Configuration Guide

## Important: OAuth Redirect URLs

When using OAuth providers (like Google) with Supabase, you must configure the redirect URLs in multiple places:

### 1. Supabase Dashboard Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. **Update Site URL**:
   - Change from `http://localhost:3000` to `https://frontend-506487697841.us-central1.run.app`
   - This is your primary production URL used in email templates
4. **Add to Redirect URLs** list (click "Add URL" for each):
   - `http://localhost:3100/auth/callback` (for local development)
   - `http://localhost:3110/auth/callback` (for Docker development)
   - `https://frontend-506487697841.us-central1.run.app/auth/callback` (for production)
5. Click "Save changes" after adding all URLs

**Important**: You must add ALL URLs that your application might use for OAuth callbacks.

### 2. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add the following to **Authorized redirect URIs**:
   - `https://lwksceirjogxlhohbkcs.supabase.co/auth/v1/callback`

### 3. Environment Variables

Ensure these are set correctly in all environments:

**Local Development** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**GitHub Secrets** (for CI/CD):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Troubleshooting OAuth Redirects

If OAuth callbacks are redirecting to localhost:3000 instead of your production URL:

1. **Check Supabase Dashboard**: Ensure your production URL is in the Redirect URLs list
2. **Clear Browser Cache**: OAuth redirect URLs can be cached
3. **Check OAuth Flow**: The auth provider should use `window.location.origin` for dynamic redirects
4. **Verify Headers**: The callback handler checks for `x-forwarded-host` header in production

### 5. Testing OAuth Flow

1. **Local Testing**:
   ```bash
   npm run dev  # Access at http://localhost:3100
   ```

2. **Docker Testing**:
   ```bash
   ./scripts/docker-up.sh  # Access at http://localhost:3110
   ```

3. **Production Testing**:
   - Visit https://frontend-506487697841.us-central1.run.app
   - Click "Sign in with Google"
   - Should redirect back to the same domain after authentication

### Common Issues

**Issue**: OAuth redirects to localhost:3000
**Solution**: 
- Add your production URL to Supabase Dashboard Redirect URLs
- Clear browser cache and cookies
- Ensure the auth provider uses dynamic redirect URLs

**Issue**: "Redirect URL not allowed" error
**Solution**: 
- Add the exact URL (including /auth/callback) to Supabase Dashboard
- Wait a few minutes for changes to propagate

**Issue**: OAuth works locally but not in production
**Solution**:
- Verify environment variables are set in Cloud Run
- Check that production URL is in Supabase Dashboard
- Ensure HTTPS is used for production URLs