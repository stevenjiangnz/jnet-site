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
    const interval = searchParams.get('interval') || '1d';
    let startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    let limit = searchParams.get('limit') || '500';
    
    // If use_config is true, fetch configuration values
    if (searchParams.get('use_config') === 'true') {
      try {
        // Fetch both configurations in parallel
        const [yearsResponse, limitResponse] = await Promise.all([
          !startDate ? fetch(
            `${apiConfig.baseUrl}/api/v1/system-config/data_loading/symbol_years_to_load`,
            { headers: apiConfig.headers }
          ) : Promise.resolve(null),
          fetch(
            `${apiConfig.baseUrl}/api/v1/system-config/data_loading/chart_max_data_points`,
            { headers: apiConfig.headers }
          )
        ]);
        
        // Process years config if needed
        if (yearsResponse && yearsResponse.ok) {
          const yearsData = await yearsResponse.json();
          const yearsConfig = yearsData.config?.value?.default || 5;
          
          // Calculate start date based on config
          const endDateObj = endDate ? new Date(endDate) : new Date();
          const startDateObj = new Date(endDateObj);
          startDateObj.setFullYear(startDateObj.getFullYear() - yearsConfig);
          startDate = startDateObj.toISOString().split('T')[0];
        }
        
        // Process limit config
        if (limitResponse && limitResponse.ok) {
          const limitData = await limitResponse.json();
          limit = String(limitData.config?.value?.default || 2500);
        }
      } catch (error) {
        console.error('Failed to fetch configuration, using defaults:', error);
      }
    }
    
    // Build query string
    const queryParams = new URLSearchParams({
      interval,
      limit,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    });
    
    
    // Fetch data from API service
    const response = await fetch(
      `${apiConfig.baseUrl}/api/v1/stock/${symbol}/data?${queryParams}`,
      {
        headers: apiConfig.headers,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }
      throw new Error(`API returned ${response.status}`);
    }

    const responseData = await response.json();
    
    // Return the full response object (includes data, metadata, etc)
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch price data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price data' },
      { status: 500 }
    );
  }
}