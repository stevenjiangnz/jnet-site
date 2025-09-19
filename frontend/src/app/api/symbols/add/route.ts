import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const API_KEY = process.env.API_KEY || 'dev-api-key';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get symbol from query params
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Call the API service with server-side API key
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/add?symbol=${symbol}`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to add symbol' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding symbol:', error);
    return NextResponse.json(
      { error: 'Failed to add symbol' },
      { status: 500 }
    );
  }
}