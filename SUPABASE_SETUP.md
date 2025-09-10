# Supabase Authentication Setup Instructions

## Prerequisites
- Supabase project already created and linked to this repository
- Access to Supabase Dashboard

## 1. Enable Authentication Providers

### Email Authentication
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable "Email" provider (should be enabled by default)

### Google OAuth
1. In Authentication → Providers, find "Google" provider
2. You'll need to create a Google OAuth application:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs (see section 2 below)
3. Copy the Client ID and Client Secret to Supabase Google provider settings
4. Enable the Google provider

## 2. Configure Redirect URLs

In your Supabase Dashboard, go to Authentication → URL Configuration and add these redirect URLs:

### Site URL
- Development: `http://localhost:3100`
- Production: `https://frontend-506487697841.us-central1.run.app` (your Cloud Run URL)

### Redirect URLs (add all of these)
- `http://localhost:3100/auth/callback`
- `http://localhost:3110/auth/callback` (Docker development)
- `https://frontend-506487697841.us-central1.run.app/auth/callback`

## 3. Google OAuth Configuration

In your Google Cloud Console OAuth 2.0 settings, add these Authorized redirect URIs:
- `https://<your-project-ref>.supabase.co/auth/v1/callback`
- `http://localhost:3100/auth/callback`
- `http://localhost:3110/auth/callback`
- `https://frontend-506487697841.us-central1.run.app/auth/callback`

Your project reference is: `lwksceirjogxlhohbkcs`

So the Supabase callback URL is:
`https://lwksceirjogxlhohbkcs.supabase.co/auth/v1/callback`

## 4. Environment Variables

The following environment variables are already configured in the code:

### Development (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Production (Cloud Run)
These are automatically set during deployment via the deploy.sh script.

## 5. Testing

### Local Development
1. Start the frontend locally:
   ```bash
   cd frontend
   npm run dev
   ```
2. Visit http://localhost:3100
3. Try signing up with email and signing in with Google

### Docker Development
1. Start services with Docker:
   ```bash
   ./scripts/docker-up.sh
   ```
2. Visit http://localhost:3110
3. Test authentication flows

## Troubleshooting

### Google OAuth not working
- Verify all redirect URLs are added in both Google Console and Supabase
- Check that Google provider is enabled in Supabase
- Ensure Client ID and Secret are correctly copied

### Email sign-up not working
- Check email templates in Supabase (Authentication → Email Templates)
- Verify SMTP settings if using custom SMTP

### Redirect issues
- Ensure all URLs match exactly (including trailing slashes)
- Check browser console for specific error messages
- Verify the auth callback route is accessible