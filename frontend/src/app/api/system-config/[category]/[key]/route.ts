import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getApiConfig } from '@/utils/api-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; key: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { category, key } = await params

  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = getApiConfig();
    } catch (error) {
      console.error('API configuration error:', error);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const response = await fetch(
      `${apiConfig.baseUrl}/api/v1/system-config/${category}/${key}`,
      {
        headers: apiConfig.headers,
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      }
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching system config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; key: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Add admin role check here
  // For now, we'll allow any authenticated user

  const { category, key } = await params

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
    
    const response = await fetch(
      `${apiConfig.baseUrl}/api/v1/system-config/${category}/${key}`,
      {
        method: 'PUT',
        headers: {
          ...apiConfig.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.detail || 'Failed to update configuration' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating system config:', error)
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; key: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Add admin role check here
  // For now, we'll allow any authenticated user

  const { category, key } = await params

  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = getApiConfig();
    } catch (error) {
      console.error('API configuration error:', error);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const response = await fetch(
      `${apiConfig.baseUrl}/api/v1/system-config/${category}/${key}`,
      {
        method: 'DELETE',
        headers: apiConfig.headers,
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      }
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting system config:', error)
    return NextResponse.json(
      { error: 'Failed to delete system configuration' },
      { status: 500 }
    )
  }
}