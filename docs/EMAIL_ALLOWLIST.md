# Email Allowlist Access Control

## Overview

The application uses an email allowlist to control access. Only users with emails in the `allowed_users` table can access protected routes.

## How It Works

1. **Authentication**: Users authenticate via Supabase (Email/Password or Google OAuth)
2. **Middleware Check**: After authentication, middleware checks if the user's email is in the allowlist
3. **Access Control**: 
   - Allowed users → Continue to requested page
   - Not allowed → Redirect to `/unauthorized` page and clear session

## Managing Allowed Users

### View All Allowed Users
```sql
SELECT email, created_at FROM public.allowed_users ORDER BY created_at DESC;
```

### Add a Single User
```sql
INSERT INTO public.allowed_users (email) 
VALUES ('newuser@company.com') 
ON CONFLICT (email) DO NOTHING;
```

### Add Multiple Users
```sql
INSERT INTO public.allowed_users (email) VALUES 
  ('user1@company.com'),
  ('user2@company.com'),
  ('user3@company.com')
ON CONFLICT (email) DO NOTHING;
```

### Remove a User
```sql
DELETE FROM public.allowed_users WHERE email = 'user@company.com';
```
Note: Removed users will be logged out on their next navigation.

### Check if User is Allowed
```sql
SELECT * FROM public.allowed_users WHERE email = 'user@company.com';
```

### Count Total Allowed Users
```sql
SELECT COUNT(*) as total_users FROM public.allowed_users;
```

## Technical Details

### Database Schema
- **Table**: `public.allowed_users`
- **Columns**:
  - `email` (text, primary key)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `added_by` (text, optional)

### RLS Policies
- Anonymous users can READ the table (required for middleware checks)
- Only authenticated users can modify the table

### Excluded Paths
The following paths bypass allowlist checking:
- `/` (root)
- `/login`
- `/auth/*`
- `/unauthorized`

### Implementation Files
- **Middleware**: `frontend/src/utils/supabase/middleware.ts`
- **TypeScript Types**: `frontend/src/types/auth.ts`
- **Unauthorized Page**: `frontend/src/app/unauthorized/page.tsx`

## Troubleshooting

### User Can't Access After Being Added
1. Verify the email matches exactly (case-sensitive)
2. Ask user to sign out and sign in again
3. Check Supabase logs for any errors

### Middleware Not Working
1. Check if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. Verify RLS policies allow anonymous read access
3. Check middleware logs in development

### Production Issues
The application uses a URL helper to ensure proper redirects in Cloud Run environments. This prevents `localhost` or `0.0.0.0` URLs from appearing in production OAuth flows.