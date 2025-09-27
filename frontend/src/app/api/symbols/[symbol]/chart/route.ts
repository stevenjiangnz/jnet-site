import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getApiConfig } from '@/utils/api-config';
import { getAppConfigFromApi } from '@/utils/app-config-v2';

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
    let period = searchParams.get('period');
    const indicators = searchParams.get('indicators') || 'chart_basic';
    
    // If period not specified, calculate based on configuration
    if (!period) {
      try {
        const config = await getAppConfigFromApi();
        if (config?.data_loading?.symbol_years_to_load) {
          const years = config.data_loading.symbol_years_to_load;
          period = `${years}y`;
        } else {
          period = '1y'; // fallback default
        }
      } catch (error) {
        console.error('Failed to fetch configuration, using default period:', error);
        period = '1y';
      }
    }
    
    // Build query string
    const queryParams = new URLSearchParams({
      period,
      indicators
    });
    
    // Fetch chart data with indicators from api-service
    const apiUrl = `${apiConfig.baseUrl}/api/v1/stock/${symbol}/chart?${queryParams}`;
    console.log('[Chart API] Fetching from:', apiUrl);
    console.log('[Chart API] Headers:', JSON.stringify(apiConfig.headers));
    
    const response = await fetch(
      apiUrl,
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
    console.log('[Chart API] Response indicators:', Object.keys(chartData.indicators || {}));
    console.log('[Chart API] Has ATR_14:', 'ATR_14' in (chartData.indicators || {}));
    
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