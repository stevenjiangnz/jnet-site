import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const startTime = Date.now();
  const diagnostics: any = {
    status: 'checking',
    service: 'frontend',
    version: process.env.VERSION || 'unknown',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      runtime: 'edge' in globalThis ? 'edge' : 'nodejs',
    },
    supabase: {
      url: 'NOT_SET',
      hasAnonKey: false,
      configured: false,
    },
    checks: {}
  };

  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    diagnostics.supabase = {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT_SET',
      hasAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-key',
      configured: !!supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co',
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0,
    };

    // Check available env vars (without exposing sensitive data)
    diagnostics.environment.availableEnvVars = Object.keys(process.env)
      .filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC'))
      .map(k => k);

    // Try to create Supabase client
    try {
      diagnostics.checks.supabaseClient = 'attempting';
      const supabase = await createClient();
      diagnostics.checks.supabaseClient = 'created';

      // Try to get current session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        diagnostics.checks.session = {
          hasSession: !!session,
          error: error?.message || null,
        };
      } catch (e: any) {
        diagnostics.checks.session = {
          error: e.message || 'Unknown error getting session',
        };
      }

      // Try to query allowed_users table
      try {
        const { count, error } = await supabase
          .from('allowed_users')
          .select('*', { count: 'exact', head: true });
        
        diagnostics.checks.allowedUsersTable = {
          exists: !error,
          count: count || 0,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          } : null,
        };
      } catch (e: any) {
        diagnostics.checks.allowedUsersTable = {
          error: e.message || 'Unknown error querying allowed_users',
        };
      }
    } catch (e: any) {
      diagnostics.checks.supabaseClient = `failed: ${e.message}`;
    }

    diagnostics.status = 'completed';
    diagnostics.responseTime = `${Date.now() - startTime}ms`;

  } catch (error: any) {
    diagnostics.status = 'error';
    diagnostics.error = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}