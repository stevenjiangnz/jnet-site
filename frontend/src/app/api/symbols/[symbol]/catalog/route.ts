import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!API_BASE_URL || !API_KEY) {
    console.error('API configuration missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { symbol } = await params;
    const response = await fetch(`${API_BASE_URL}/api/v1/stock/catalog/symbol/${symbol}`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch symbol catalog info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbol information' },
      { status: 500 }
    );
  }
}