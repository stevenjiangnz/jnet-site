import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const API_KEY = process.env.API_KEY || 'dev-api-key';

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the API service with server-side API key
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/list`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}