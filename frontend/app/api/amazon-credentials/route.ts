import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('amazon_credentials')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching Amazon credentials:', error)
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id } = body

    // Validate required fields
    if (!store_id || !seller_id || !client_id || !client_secret || !refresh_token || !marketplace_id) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('amazon_credentials')
      .insert([
        {
          store_id,
          seller_id,
          client_id,
          client_secret,
          refresh_token,
          marketplace_id,
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error creating Amazon credentials:', error)
      return NextResponse.json({ error: 'Failed to create credentials' }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
