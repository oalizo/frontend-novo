import { NextResponse } from 'next/server'
import { supabase } from '@/lib/auth/supabase'
import { format } from 'date-fns'

export async function GET(request: Request) {
  try {
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    // Obter dados de receita por dia
    const { data, error } = await supabase
      .from('orders')
      .select('purchase_date, amazon_price, order_status, quantity_sold')
      .gte('purchase_date', dateFrom)
      .lte('purchase_date', dateTo)
      .order('purchase_date', { ascending: true })

    if (error) {
      console.error('Error fetching revenue data:', error)
      return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 })
    }

    // Agrupar por data e calcular receita total por dia
    const revenueByDate = data.reduce((acc, order) => {
      const date = format(new Date(order.purchase_date), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = 0
      }
      
      // Verificar se o pedido não está cancelado/reembolsado
      if (!['canceled', 'refunded', 'Canceled'].includes(order.order_status)) {
        // Multiplicar pelo quantity_sold se disponível
        acc[date] += Number(order.amazon_price) * (order.quantity_sold || 1)
      }
      
      return acc
    }, {} as Record<string, number>)

    // Formatar para o formato esperado pelo frontend
    const formattedData = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date: format(new Date(date), 'MMM dd'),
      revenue
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Error in revenue API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
