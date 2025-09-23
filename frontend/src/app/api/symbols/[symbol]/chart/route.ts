import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getApiConfig } from '@/utils/api-config';

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

  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = getApiConfig();
    } catch (error) {
      console.error('API configuration error:', error);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const period = searchParams.get('period') || '1y';
    const indicators = searchParams.get('indicators') || 'chart_basic';
    
    // Build query string
    const queryParams = new URLSearchParams({
      period,
      indicators
    });
    
    // Fetch chart data with indicators from api-service
    const response = await fetch(
      `${apiConfig.baseUrl}/api/v1/stock/${symbol}/chart?${queryParams}`,
      {
        headers: apiConfig.headers,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }
      throw new Error(`API service returned ${response.status}`);
    }

    const chartData = await response.json();
    
    // Return the chart data with indicators
    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}