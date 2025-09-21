import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getApiConfig } from '@/utils/api-config'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = getApiConfig();
    } catch (error) {
      console.error('API configuration error:', error);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const url = new URL('/api/v1/system-config', apiConfig.baseUrl)
    if (category) {
      url.searchParams.append('category', category)
    }

    const response = await fetch(url.toString(), {
      headers: apiConfig.headers,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching system configs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system configurations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Add admin role check here
  // For now, we'll allow any authenticated user

  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = getApiConfig();
    } catch (error) {
      console.error('API configuration error:', error);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const body = await request.json()
    
    const response = await fetch(`${apiConfig.baseUrl}/api/v1/system-config`, {
      method: 'POST',
      headers: {
        ...apiConfig.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to create configuration' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating system config:', error)
    return NextResponse.json(
      { error: 'Failed to create system configuration' },
      { status: 500 }
    )
  }
}