import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get configuration from app_config table
    const { data, error } = await supabase
      .from('app_config')
      .select('config')
      .single()

    if (error) {
      console.error('Error fetching app config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json(data?.config || {})
  } catch (error) {
    console.error('Error fetching app config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const newConfig = await request.json()
    
    // Create service role client for updating (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service configuration')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const serviceSupabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    
    // First, get the current record to update it
    const { data: currentData, error: fetchError } = await serviceSupabase
      .from('app_config')
      .select('id, version')
      .single()
    
    if (fetchError) {
      console.error('Error fetching current config:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch current configuration' },
        { status: 500 }
      )
    }
    
    // Update the configuration with incremented version
    const { data, error } = await serviceSupabase
      .from('app_config')
      .update({ 
        config: newConfig,
        version: (currentData?.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentData.id)
      .select('config')
      .single()

    if (error) {
      console.error('Error updating app config:', error)
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      config: data?.config 
    })
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}