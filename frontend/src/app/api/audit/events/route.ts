import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const API_KEY = process.env.API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    
    // Add all query parameters
    if (searchParams.get('start_date')) queryParams.append('start_date', searchParams.get('start_date')!);
    if (searchParams.get('end_date')) queryParams.append('end_date', searchParams.get('end_date')!);
    if (searchParams.get('operation_type')) queryParams.append('operation_type', searchParams.get('operation_type')!);
    if (searchParams.get('result')) queryParams.append('result', searchParams.get('result')!);
    if (searchParams.get('source')) queryParams.append('source', searchParams.get('source')!);
    if (searchParams.get('limit')) queryParams.append('limit', searchParams.get('limit')!);
    if (searchParams.get('offset')) queryParams.append('offset', searchParams.get('offset')!);

    // Call API service
    const response = await fetch(
      `${API_BASE_URL}/api/v1/audit/events?${queryParams.toString()}`,
      {
        headers: {
          'X-API-Key': API_KEY,
          'X-User-Email': user.email || '',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch audit events' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in audit events route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}