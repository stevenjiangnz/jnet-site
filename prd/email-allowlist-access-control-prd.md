# PRD: Email-Based Access Control System for JNet Solution

## 1. Overview

### 1.1 Product Description
Implement an email allowlist-based access control system that restricts application access to pre-approved users. Users can authenticate via Google OAuth through Supabase Auth, but only those whose email addresses are in a predefined allowlist can access the application.

### 1.2 Core Problem
The application currently allows any user with a valid Google account to authenticate and access the system. We need to restrict access to only authorized users based on their email addresses, while maintaining a simple and manageable system.

### 1.3 Success Criteria
- Only users with allowlisted email addresses can access the application
- Unauthorized users receive clear feedback about access denial
- Admin can easily manage the allowlist via Supabase dashboard
- System is secure and performs well
- User experience is smooth for authorized users

## 2. Technical Requirements

### 2.1 Technology Stack
- **Frontend**: Next.js 15.4 with React 19 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth with Google OAuth (already integrated)
- **Database**: Supabase PostgreSQL
- **Middleware**: Next.js middleware for route protection (existing at src/utils/supabase/middleware.ts)
- **Deployment**: Docker (port 3110) / Local development (port 3100)

### 2.2 Core Components

#### 2.2.1 Database Schema
```sql
-- Allowlist table
CREATE TABLE public.allowed_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT DEFAULT 'system'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_allowed_users_updated_at BEFORE UPDATE
  ON allowed_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2.2 Middleware Enhancement
- **File**: `src/utils/supabase/middleware.ts` (existing - needs enhancement)
- **Purpose**: Add allowlist verification to existing middleware
- **Scope**: Protect all routes except auth, static files, and unauthorized page

#### 2.2.3 Pages/Components
- **Unauthorized Page**: `/app/unauthorized/page.tsx` - Display access denied message
- **Auth Callback**: `/app/auth/callback/route.ts` (existing - needs enhancement)
- **Login Page**: `/app/login/page.tsx` (existing - may need minor updates)
- **Dashboard**: `/app/dashboard/page.tsx` (existing protected route example)

## 3. Functional Requirements

### 3.1 User Authentication Flow

#### 3.1.1 Authorized User Journey
1. User accesses application at localhost:3100 (or production URL)
2. User clicks "Sign in with Google" on /login page
3. Google OAuth flow completes successfully
4. User redirected to `/auth/callback`
5. Middleware checks user email against allowlist
6. Email found in allowlist → User gains access to application
7. User redirected to /dashboard or originally requested page

#### 3.1.2 Unauthorized User Journey
1. User accesses application at localhost:3100 (or production URL)
2. User clicks "Sign in with Google" on /login page
3. Google OAuth flow completes successfully
4. User redirected to `/auth/callback`
5. Middleware checks user email against allowlist
6. Email NOT found in allowlist → User session cleared
7. User redirected to `/unauthorized` page with clear error message
8. User can return to login page to try different account

### 3.2 Access Control Logic

#### 3.2.1 Middleware Behavior
- **Leverage existing middleware**: Enhance `src/utils/supabase/middleware.ts`
- **Check session existence**: If no session, allow request (for public pages)
- **Verify allowlist**: If session exists, check email against `allowed_users` table
- **Handle unauthorized access**: Clear session and redirect to unauthorized page
- **Allow authorized access**: Continue to requested page

#### 3.2.2 Route Protection
**Protected Routes** (require allowlist verification):
- `/dashboard/*` - User dashboard and related pages
- `/profile/*` - User profile pages
- `/admin/*` - Admin panel (if applicable)
- Any future authenticated routes

**Excluded Routes** (bypass middleware):
- Static files (`/_next/static/*`, `/_next/image/*`)
- Auth pages (`/auth/*`, `/login`)
- API auth routes (`/api/auth/*`)
- Unauthorized page (`/unauthorized`)
- Public pages (home, about, etc.)
- Assets and favicon

### 3.3 Allowlist Management

#### 3.3.1 Adding Users via Supabase MCP Tools
```bash
# Using MCP tool to add user
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES ('newuser@company.com');"

# Add multiple users
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES 
  ('user1@company.com'),
  ('user2@company.com'),
  ('user3@company.com');"
```

#### 3.3.2 Removing Users via Supabase MCP Tools
```bash
# Remove single user
mcp__supabase__execute_sql
query: "DELETE FROM public.allowed_users WHERE email = 'user@company.com';"

# View all allowed users
mcp__supabase__execute_sql
query: "SELECT * FROM public.allowed_users ORDER BY created_at DESC;"
```

## 4. Technical Implementation Details

### 4.1 File Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── unauthorized/
│   │   │   └── page.tsx          # New: Access denied page
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts      # Existing: Needs enhancement
│   │   │   └── auth-code-error/
│   │   │       └── page.tsx      # Existing
│   │   ├── login/
│   │   │   └── page.tsx          # Existing
│   │   └── dashboard/
│   │       └── page.tsx          # Existing protected route
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.ts         # Existing
│   │       ├── server.ts         # Existing
│   │       └── middleware.ts     # Existing: Needs enhancement
│   └── providers/
│       └── auth-provider.tsx     # Existing
└── .env.local                    # Existing: Contains Supabase keys
```

### 4.2 Environment Variables (Already Configured)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://lwksceirjogxlhohbkcs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 TypeScript Types
```typescript
// types/auth.ts
export interface AllowedUser {
  email: string;
  created_at: string;
  updated_at: string;
  added_by: string;
}

export interface AuthError {
  code: string;
  message: string;
}
```

## 5. User Experience Specifications

### 5.1 Unauthorized Page Design
**Content Requirements**:
- Clear "Access Denied" heading
- Explanation: "Your email address is not authorized to access this application"
- Contact information for requesting access
- "Back to Login" button
- Professional, friendly tone consistent with existing design

**Visual Requirements**:
- Use existing Tailwind CSS v4 design system
- Consistent with application branding
- Mobile-responsive layout
- Dark mode support (if implemented)

### 5.2 Error Handling
- **Network errors**: Graceful fallback, allow access if allowlist check fails (fail-open)
- **Database errors**: Log errors via console, allow access to prevent lockout
- **Session errors**: Clear session and redirect to login

### 5.3 Loading States
- **Auth callback**: Use existing loading UI patterns
- **Middleware processing**: Seamless, no visible loading for authorized users

## 6. Performance Requirements

### 6.1 Response Time
- Middleware execution: < 200ms
- Allowlist database query: < 100ms
- Unauthorized redirect: < 300ms total

### 6.2 Caching Strategy
- Consider implementing Redis caching for allowlist (future enhancement)
- For now, rely on Supabase's built-in query caching

## 7. Security Requirements

### 7.1 Data Protection
- Email addresses stored securely in Supabase
- No allowlist data exposed to client-side code
- Leverage existing Supabase RLS policies

### 7.2 Access Control
- Server-side verification in middleware only
- No client-side allowlist checks
- Automatic session cleanup for unauthorized users

## 8. Testing Requirements

### 8.1 Test Scenarios
1. **Authorized user login**: Should gain full access
2. **Unauthorized user login**: Should be redirected to unauthorized page
3. **Direct URL access**: Unauthorized users blocked from protected routes
4. **Session persistence**: Authorized users stay logged in
5. **Allowlist changes**: Take effect on next authentication
6. **Network failures**: System fails safely (allows access)

### 8.2 Local Testing Commands
```bash
# Run frontend tests
docker-compose exec frontend npm test

# Test locally without Docker
cd frontend
npm test

# Manual testing URLs
# http://localhost:3100/login - Login page
# http://localhost:3100/dashboard - Protected route
# http://localhost:3100/unauthorized - Access denied page
```

## 9. Implementation Code Examples

### 9.1 Enhanced Middleware (TypeScript)
```typescript
// src/utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated
  if (user?.email) {
    try {
      // Check if user is in allowlist
      const { data: allowedUser, error } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();

      // If user is NOT in allowlist
      if (!allowedUser || error) {
        // Clear the session
        await supabase.auth.signOut();
        
        // Redirect to unauthorized page
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
        url.searchParams.set('reason', 'not-allowlisted');
        
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // Log error but allow access to prevent lockout
      console.error('Allowlist check failed:', error);
      // In production, you might want to send this to a monitoring service
    }
  }

  return supabaseResponse;
}
```

### 9.2 Unauthorized Page Component
```typescript
// app/unauthorized/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason(searchParams.get('reason') || 'access-denied');
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-gray-700 mb-2">
              {reason === 'not-allowlisted' 
                ? 'Your email address is not authorized to access this application.'
                : 'You do not have permission to access this application.'
              }
            </p>
            <p className="text-sm text-gray-600">
              Please contact your administrator to request access.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
            <p className="text-sm text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:admin@jnetsolution.com" className="text-blue-600 hover:underline">
                admin@jnetsolution.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 9.3 Database Migration
```sql
-- migrations/001_create_allowed_users.sql
-- Create the allowlist table
CREATE TABLE IF NOT EXISTS public.allowed_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT DEFAULT 'system'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_allowed_users_updated_at BEFORE UPDATE
  ON allowed_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage allowed_users" ON public.allowed_users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Insert initial admin users (update with your actual admin emails)
INSERT INTO public.allowed_users (email) VALUES 
  ('admin@jnetsolution.com'),
  ('sjiang@jnetsolution.com')
ON CONFLICT (email) DO NOTHING;
```

## 10. Deployment Considerations

### 10.1 Database Setup via Supabase MCP
```bash
# Create allowed_users table
mcp__supabase__apply_migration
name: "create_allowed_users_table"
query: <migration SQL from above>

# Verify table creation
mcp__supabase__list_tables
schemas: ["public"]

# Add initial users
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES ('your-email@domain.com');"
```

### 10.2 Deployment Steps
1. Deploy database migration to Supabase
2. Add initial allowed users
3. Update middleware.ts with allowlist check
4. Create unauthorized page
5. Deploy to Docker/production
6. Test with allowed and non-allowed accounts

### 10.3 Monitoring
- Track unauthorized access attempts in Supabase logs
- Monitor middleware performance
- Set up alerts for database connectivity issues

## 11. Future Enhancements

### 11.1 Potential Features
- Admin UI for managing allowlist (within the app)
- Role-based access control (admin, user, viewer)
- Temporary access with expiration dates
- Invitation system for new users
- Audit logging for allowlist changes
- Email notifications when users are added/removed

### 11.2 Performance Improvements
- Implement Redis caching for allowlist
- Add rate limiting for auth attempts
- Batch allowlist checks for better performance

## 12. Acceptance Criteria

### 12.1 Core Functionality
- [ ] Unauthorized users cannot access any protected routes
- [ ] Authorized users can access all application features
- [ ] Clear error messages for unauthorized access
- [ ] Admin can manage allowlist via Supabase MCP tools or dashboard

### 12.2 User Experience
- [ ] Smooth login flow for authorized users
- [ ] Professional unauthorized page design matching app theme
- [ ] No confusing error states
- [ ] Mobile-responsive design

### 12.3 Technical Implementation
- [ ] TypeScript types properly defined
- [ ] Middleware properly integrated
- [ ] Database migration successfully applied
- [ ] All tests passing

### 12.4 Security
- [ ] No client-side bypasses possible
- [ ] Secure session management
- [ ] Proper error handling without information leakage

## 13. Quick Start Guide

### 13.1 Implementation Steps
1. Apply database migration using Supabase MCP
2. Add initial allowed users to the database
3. Update existing middleware.ts with allowlist check
4. Create unauthorized page component
5. Test locally with Docker
6. Deploy to production

### 13.2 Testing Commands
```bash
# Start local development
./scripts/docker-up.sh

# Apply migration
# Use mcp__supabase__apply_migration with the migration SQL

# Add test users
# Use mcp__supabase__execute_sql to add allowed users

# Test authentication flow
# 1. Access http://localhost:3110
# 2. Login with allowed email
# 3. Verify access to /dashboard
# 4. Logout and login with non-allowed email
# 5. Verify redirect to /unauthorized

# View logs
./scripts/docker-logs.sh frontend
```

This PRD has been adapted for the JNet Solution project's specific architecture and requirements.