import { NextResponse } from 'next/server'
import { supabase } from '@/lib/auth/supabase'
import { format, subMonths } from 'date-fns'

export async function GET(request: Request) {
  try {
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    // Obter estatísticas do período atual
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('amazon_price, profit, order_status, quantity_sold')
      .gte('purchase_date', dateFrom)
      .lte('purchase_date', dateTo)

    if (ordersError) {
      console.error('Error fetching orders data:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }

    // Calcular estatísticas atuais
    const currentStats = {
      total_revenue: ordersData.reduce((sum, order) => {
        // Verificar se o pedido não está cancelado/reembolsado
        if (!['canceled', 'refunded', 'Canceled'].includes(order.order_status)) {
          // Multiplicar pelo quantity_sold se disponível
          return sum + (Number(order.amazon_price) * (order.quantity_sold || 1));
        }
        return sum;
      }, 0),
      total_orders: ordersData.length,
      total_profit: ordersData.reduce((sum, order) => sum + (Number(order.profit) || 0), 0)
    }

    // Calcular período anterior para comparação
    const prevDateFrom = format(subMonths(new Date(dateFrom), 1), 'yyyy-MM-dd')
    const prevDateTo = format(subMonths(new Date(dateTo), 1), 'yyyy-MM-dd')

    // Obter estatísticas do período anterior
    const { data: prevOrdersData, error: prevOrdersError } = await supabase
      .from('orders')
      .select('amazon_price, profit, order_status, quantity_sold')
      .gte('purchase_date', prevDateFrom)
      .lte('purchase_date', prevDateTo)

    if (prevOrdersError) {
      console.error('Error fetching previous orders data:', prevOrdersError)
      return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }

    // Calcular estatísticas anteriores
    const previousStats = {
      total_revenue: prevOrdersData.reduce((sum, order) => {
        // Aplicar a mesma lógica do período atual
        if (!['canceled', 'refunded', 'Canceled'].includes(order.order_status)) {
          return sum + (Number(order.amazon_price) * (order.quantity_sold || 1));
        }
        return sum;
      }, 0),
      total_orders: prevOrdersData.length,
      total_profit: prevOrdersData.reduce((sum, order) => sum + (Number(order.profit) || 0), 0)
    }

    // Obter estatísticas de inventário da tabela 'produtos' em vez de 'inventory'
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('produtos')
      .select('quantity')

    if (inventoryError) {
      console.error('Error fetching inventory data:', inventoryError)
      return NextResponse.json({ error: 'Failed to fetch inventory stats' }, { status: 500 })
    }

    const inventoryStats = {
      total_items: inventoryData.length,
      out_of_stock: inventoryData.filter(item => item.quantity === 0 || item.quantity === null).length
    }

    // Calcular mudanças percentuais
    const calculateChange = (current: number, previous: number) => 
      previous ? ((current - previous) / previous) * 100 : 0

    // Formatar resposta
    const response = {
      totalRevenue: currentStats.total_revenue,
      totalOrders: currentStats.total_orders,
      totalProfit: currentStats.total_profit,
      inventoryItems: inventoryStats.total_items,
      outOfStock: inventoryStats.out_of_stock,
      inTransit: 0, // Valor fixo para manter compatibilidade
      deliveredToday: 0, // Valor fixo para manter compatibilidade
      returnsPending: 8, // Valor fixo para manter compatibilidade
      revenueChange: calculateChange(
        currentStats.total_revenue, 
        previousStats.total_revenue
      ),
      ordersChange: calculateChange(
        currentStats.total_orders, 
        previousStats.total_orders
      ),
      profitChange: calculateChange(
        currentStats.total_profit, 
        previousStats.total_profit
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in dashboard stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
