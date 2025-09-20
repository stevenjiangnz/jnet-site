import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Check Supabase authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Get symbol from params
    const { symbol } = await params;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Call api-service incremental download endpoint
    const apiResponse = await fetch(
      `${process.env.API_BASE_URL}/api/v1/stock/download/${symbol}/incremental`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.API_KEY!,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`API error (${apiResponse.status}):`, errorText);
      
      // Handle specific error codes
      if (apiResponse.status === 404) {
        return NextResponse.json(
          { error: `Symbol ${symbol} not found` },
          { status: 404 }
        );
      } else if (apiResponse.status === 400) {
        return NextResponse.json(
          { error: `Invalid symbol format: ${symbol}` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to download incremental data' },
        { status: apiResponse.status }
      );
    }

    // Parse and return the result
    const result = await apiResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Incremental download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}