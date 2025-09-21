import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call API service to get configuration
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8002'
    const apiKey = process.env.API_KEY

    if (!apiKey) {
      console.error('API_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const response = await fetch(`${apiBaseUrl}/api/v1/app-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-User-Token': user.id,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API service error:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch configuration: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching app config:', error)
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Call API service to update configuration
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8002'
    const apiKey = process.env.API_KEY

    if (!apiKey) {
      console.error('API_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const response = await fetch(`${apiBaseUrl}/api/v1/app-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-User-Token': user.id,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API service error:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to update configuration: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
  }
}