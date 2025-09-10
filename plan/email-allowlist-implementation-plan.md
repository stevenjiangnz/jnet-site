# Email Allowlist Access Control - Implementation Plan

## Overview
This implementation plan details the step-by-step process to add email-based access control to the JNet Solution application. The system will restrict access to pre-approved email addresses using Supabase authentication.

## Pre-Implementation Checklist
- [x] Docker environment running (`./scripts/docker-up.sh`)
- [x] Supabase project configured with Google OAuth
- [x] Frontend accessible at localhost:3110 (Docker) or localhost:3100 (local)
- [x] Existing authentication flow working

## Phase 1: Database Setup (30 minutes)

### 1.1 Create Allowed Users Table
```sql
-- Create the migration file first
-- File: /home/sjiang/devlocal/jnet-site/migrations/001_create_allowed_users.sql

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

-- IMPORTANT: Create policy for anon users to read the allowlist
-- This is required for the middleware to check if users are allowed
CREATE POLICY "Anon users can read allowed_users" ON public.allowed_users
  FOR SELECT USING (true);
```

**Implementation Steps:**
1. Use `mcp__supabase__apply_migration` to create the table
2. Verify table creation with `mcp__supabase__list_tables`
3. Check table structure with `mcp__supabase__execute_sql` query: `SELECT * FROM allowed_users LIMIT 0;`

### 1.2 Add Initial Admin Users
```sql
-- Add your admin emails
INSERT INTO public.allowed_users (email) VALUES 
  ('admin@jnetsolution.com'),
  ('your-email@domain.com')  -- Replace with actual admin email
ON CONFLICT (email) DO NOTHING;
```

**Implementation Steps:**
1. Use `mcp__supabase__execute_sql` to add initial users
2. Verify with query: `SELECT * FROM allowed_users ORDER BY created_at DESC;`

## Phase 2: Code Implementation (1-2 hours)

### 2.1 Create TypeScript Types
**File:** `frontend/src/types/auth.ts`

```typescript
export interface AllowedUser {
  email: string;
  created_at: string;
  updated_at: string;
  added_by: string;
}

export interface AuthError {
  code: 'NOT_ALLOWLISTED' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthorized: boolean;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}
```

### 2.2 Enhance Existing Middleware
**File:** `frontend/src/utils/supabase/middleware.ts`

Key changes to implement:
1. Import necessary types
2. Add allowlist verification after successful authentication
3. Handle unauthorized users by clearing session and redirecting
4. Add proper error logging
5. Implement fail-open behavior for database errors

**Critical Implementation Notes:**
- The middleware already exists, so we need to carefully enhance it without breaking existing functionality
- Use `maybeSingle()` instead of `single()` to avoid throwing errors
- Always fail-open (allow access) if database check fails to prevent lockouts

### 2.3 Create Unauthorized Page
**File:** `frontend/src/app/unauthorized/page.tsx`

Key features:
1. Professional design using Tailwind CSS v4
2. Clear messaging about why access was denied
3. Contact information for requesting access
4. Button to return to login page
5. Mobile-responsive layout
6. Dark mode support (if implemented)

### 2.4 Update Middleware Configuration
**File:** `frontend/src/middleware.ts` (if it exists at root level)

Ensure the middleware matcher excludes:
- `/unauthorized` route
- Static assets
- Auth routes
- API routes

## Phase 3: UI/UX Implementation (30 minutes)

### 3.1 Create Unauthorized Page Component
```
frontend/src/app/unauthorized/
├── page.tsx          # Main component
└── loading.tsx       # Loading state (optional)
```

### 3.2 Update Existing Components (if needed)
- Review `/app/login/page.tsx` - likely no changes needed
- Review `/app/auth/callback/route.ts` - likely no changes needed
- Check auth provider for any necessary updates

## Phase 4: Testing (1 hour)

### 4.1 Local Testing Setup
```bash
# 1. Start Docker environment
./scripts/docker-up.sh

# 2. Watch frontend logs
./scripts/docker-logs.sh frontend
```

### 4.2 Test Scenarios

#### Scenario 1: Authorized User Flow
1. Add test email to allowlist: `test.allowed@example.com`
2. Access http://localhost:3110/login
3. Sign in with Google using allowed email
4. Verify redirect to /dashboard
5. Verify can access all protected routes
6. Verify session persists on page refresh

#### Scenario 2: Unauthorized User Flow
1. Access http://localhost:3110/login
2. Sign in with Google using non-allowed email
3. Verify redirect to /unauthorized
4. Verify clear error message displayed
5. Click "Back to Login" and verify redirect
6. Verify cannot access protected routes directly

#### Scenario 3: Edge Cases
1. **User Removed While Logged In:**
   - Login with allowed email
   - Remove email from allowlist
   - Navigate to new page
   - Verify redirect to unauthorized

2. **Database Connection Failure:**
   - Temporarily break database connection
   - Attempt login
   - Verify fail-open behavior (user allowed in)

3. **Direct URL Access:**
   - Try accessing /dashboard directly without auth
   - Try accessing /unauthorized directly
   - Verify appropriate redirects

### 4.3 Testing Commands
```bash
# Add test user
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES ('test.user@example.com');"

# View all allowed users
mcp__supabase__execute_sql
query: "SELECT * FROM public.allowed_users ORDER BY created_at DESC;"

# Remove test user
mcp__supabase__execute_sql
query: "DELETE FROM public.allowed_users WHERE email = 'test.user@example.com';"

# Check logs for errors
docker-compose exec frontend tail -f /var/log/app.log
```

## Phase 5: Documentation & Deployment (30 minutes)

### 5.1 Update Documentation
1. Add allowlist management section to CLAUDE.md
2. Create admin guide for managing allowed users
3. Document testing procedures
4. Add troubleshooting guide

### 5.2 Admin Guide Content
```markdown
## Managing Allowed Users

### Adding Users
```bash
# Single user
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES ('new.user@company.com');"

# Multiple users
mcp__supabase__execute_sql
query: "INSERT INTO public.allowed_users (email) VALUES 
  ('user1@company.com'),
  ('user2@company.com'),
  ('user3@company.com')
ON CONFLICT (email) DO NOTHING;"
```

### Viewing Users
```bash
mcp__supabase__execute_sql
query: "SELECT email, created_at FROM public.allowed_users ORDER BY created_at DESC;"
```

### Removing Users
```bash
mcp__supabase__execute_sql
query: "DELETE FROM public.allowed_users WHERE email = 'user@company.com';"
```

### 5.3 Production Deployment
1. Apply migration to production Supabase
2. Add production admin emails to allowlist
3. Deploy code changes via GitHub Actions
4. Test in staging environment first
5. Monitor logs after deployment

## Rollback Plan

If issues arise, rollback steps:

1. **Remove Middleware Enhancement:**
   - Revert middleware.ts to previous version
   - Deploy immediately

2. **Keep Database Table:**
   - No need to drop table
   - Can be reused for future implementation

3. **Communication:**
   - Notify team of rollback
   - Document issues encountered

## Success Metrics

### Technical Metrics
- [ ] Zero unauthorized access to protected routes
- [ ] Middleware execution time < 200ms
- [ ] 100% test coverage for auth flows
- [ ] No performance degradation

### User Experience Metrics
- [ ] Clear feedback for unauthorized users
- [ ] Smooth login experience for authorized users
- [ ] No false denials for authorized users
- [ ] Professional error handling

## Timeline Estimate

- **Phase 1:** 30 minutes (Database Setup)
- **Phase 2:** 1-2 hours (Code Implementation)
- **Phase 3:** 30 minutes (UI/UX)
- **Phase 4:** 1 hour (Testing)
- **Phase 5:** 30 minutes (Documentation)

**Total:** 3-4 hours

## Risk Mitigation

### Risk 1: Lockout Scenario
**Mitigation:** 
- Fail-open behavior in middleware
- Keep at least 2 admin emails in allowlist
- Document recovery procedures

### Risk 2: Performance Impact
**Mitigation:**
- Efficient database queries
- Consider caching for future enhancement
- Monitor response times

### Risk 3: User Confusion
**Mitigation:**
- Clear error messages
- Contact information on unauthorized page
- Admin documentation

## Next Steps

1. Review this plan with team
2. Get approval for implementation
3. Start with Phase 1 (Database Setup)
4. Proceed through phases sequentially
5. Document any deviations from plan

## Future Enhancements

After successful implementation, consider:
1. Admin UI for allowlist management
2. Email notifications for access requests
3. Temporary access tokens
4. Role-based access control
5. Audit logging