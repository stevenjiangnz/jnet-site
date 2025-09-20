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
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = 'Failed to add symbol';
      
      // Provide more specific error messages based on status code
      if (response.status === 409) {
        errorMessage = `Symbol ${symbol} already exists in your list`;
      } else if (response.status === 400) {
        errorMessage = `Invalid symbol format. Use standard ticker symbols (e.g., AAPL, GOOGL)`;
      } else if (response.status === 404) {
        errorMessage = `Symbol ${symbol} not found or is not a valid ticker`;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // After successfully adding the symbol, download historical data
    try {
      const downloadResponse = await fetch(
        `${API_BASE_URL}/api/v1/stock/download/${symbol}?period=max`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
        }
      );

      if (downloadResponse.ok) {
        const downloadResult = await downloadResponse.json();
        // Include download information in the response
        return NextResponse.json({
          ...data,
          download: {
            success: true,
            records_downloaded: downloadResult.records || 0,
            start_date: downloadResult.start_date,
            end_date: downloadResult.end_date,
            message: `Downloaded ${downloadResult.records || 0} records from ${downloadResult.start_date} to ${downloadResult.end_date}`,
          }
        });
      } else {
        // Symbol was added but download failed - return partial success
        return NextResponse.json({
          ...data,
          download: {
            success: false,
            message: 'Symbol added but historical data download failed. You can download it later.'
          }
        });
      }
    } catch (downloadError) {
      console.error('Error downloading historical data:', downloadError);
      // Symbol was added but download failed - return partial success
      return NextResponse.json({
        ...data,
        download: {
          success: false,
          message: 'Symbol added but historical data download failed. You can download it later.'
        }
      });
    }
  } catch (error) {
    console.error('Error adding symbol:', error);
    return NextResponse.json(
      { error: 'Failed to add symbol' },
      { status: 500 }
    );
  }
}