# Supabase Multi-Environment Configuration

## ✅ Configuration Completed Successfully

All environments are now properly configured and working:
- **Local development** (port 3100) - Working
- **Docker development** (port 3110) - Working 
- **Production** (Cloud Run) - Working

## Site URL Configuration

The **Site URL** field should be set to your **primary production URL**. This is used in email templates and as the default redirect.

### Recommended Setup:

1. **Site URL** (single value):
   ```
   https://frontend-506487697841.us-central1.run.app
   ```

2. **Redirect URLs** (add all these):
   ```
   http://localhost:3100/auth/callback
   http://localhost:3110/auth/callback
   https://frontend-506487697841.us-central1.run.app/auth/callback
   ```

## Important Notes:

- The **Site URL** is used in email templates (password reset, magic links, etc.)
- The **Redirect URLs** list allows OAuth to redirect to any of these URLs
- Always use your production URL as the Site URL
- Add ALL your development and production URLs to the Redirect URLs list

## Step-by-Step Configuration:

1. **Change Site URL**:
   - Click "Save changes" after changing from `http://localhost:3000` to `https://frontend-506487697841.us-central1.run.app`

2. **Add Redirect URLs**:
   - Click "Add URL" button
   - Add each URL one by one:
     - `http://localhost:3100/auth/callback` (local dev)
     - `http://localhost:3110/auth/callback` (Docker dev)
     - `https://frontend-506487697841.us-central1.run.app/auth/callback` (production)

3. **Save All Changes**:
   - Make sure to save after adding all URLs
   - Changes typically take effect within 1-2 minutes

## Testing After Configuration:

1. **Clear browser cache and cookies**
2. **Test from each environment**:
   - Local: `http://localhost:3100`
   - Docker: `http://localhost:3110`
   - Production: `https://frontend-506487697841.us-central1.run.app`

Each environment should now redirect back to its own domain after OAuth authentication.

## Troubleshooting:

If you still see redirects to localhost:3000:
1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Clear all cookies for your Supabase domain
3. Try in an incognito/private browser window
4. Wait a few minutes for changes to propagate