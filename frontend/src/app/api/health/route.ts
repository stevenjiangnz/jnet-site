import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface Diagnostics {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: {
    NODE_ENV: string | undefined;
    runtime: string;
    availableEnvVars?: string[];
  };
  supabase: {
    url: string;
    hasAnonKey: boolean;
    configured: boolean;
    urlLength?: number;
    keyLength?: number;
  };
  checks: Record<string, unknown>;
  responseTime?: string;
  error?: {
    message: string;
    stack?: string;
  };
  request?: {
    url: string;
    headers: Record<string, string>;
    host: string | null;
    xForwardedHost: string | null;
    xForwardedProto: string | null;
  };
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // Capture request headers to debug URL construction
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('host') || 
        key.toLowerCase().includes('forward') || 
        key.toLowerCase().includes('origin') ||
        key.toLowerCase().includes('referer')) {
      headers[key] = value;
    }
  });
  
  const diagnostics: Diagnostics = {
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
    checks: {},
    request: {
      url: request.url,
      headers,
      host: request.headers.get('host'),
      xForwardedHost: request.headers.get('x-forwarded-host'),
      xForwardedProto: request.headers.get('x-forwarded-proto'),
    }
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
      } catch (e) {
        diagnostics.checks.session = {
          error: e instanceof Error ? e.message : 'Unknown error getting session',
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
      } catch (e) {
        diagnostics.checks.allowedUsersTable = {
          error: e instanceof Error ? e.message : 'Unknown error querying allowed_users',
        };
      }
    } catch (e) {
      diagnostics.checks.supabaseClient = `failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }

    diagnostics.status = 'completed';
    diagnostics.responseTime = `${Date.now() - startTime}ms`;

  } catch (error) {
    diagnostics.status = 'error';
    diagnostics.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
    };
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}