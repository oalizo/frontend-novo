import { NextResponse } from 'next/server'
import { supabase } from '@/lib/auth/supabase'

export async function GET() {
  try {
    // Obter pedidos recentes
    const { data, error } = await supabase
      .from('orders')
      .select('order_item_id, order_id, sku, asin, amazon_price, source')
      .not('purchase_date', 'is', null)
      .order('purchase_date', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching recent orders:', error)
      return NextResponse.json({ error: 'Failed to fetch recent orders' }, { status: 500 })
    }

    // Formatar para o formato esperado pelo frontend
    const formattedData = data.map(order => ({
      id: order.order_id,
      sku: order.sku,
      asin: order.asin,
      amount: Number(order.amazon_price) || 0,
      store: order.source || 'Unknown'
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Error in recent orders API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
