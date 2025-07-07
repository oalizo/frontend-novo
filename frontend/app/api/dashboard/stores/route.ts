import { NextResponse } from 'next/server'
import { supabase } from '@/lib/auth/supabase'

export async function GET(request: Request) {
  try {
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    // Obter distribuição de status do inventário
    const { data: produtosData, error: produtosError } = await supabase
      .from('produtos')
      .select('availability')

    if (produtosError) {
      console.error('Error fetching inventory status distribution:', produtosError)
      return NextResponse.json({ error: 'Failed to fetch inventory status distribution' }, { status: 500 })
    }

    // Contar itens por status
    const statusCounts: Record<string, number> = {}
    produtosData.forEach(item => {
      const status = item.availability || 'other'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    // Cores para cada status
    const statusColors: Record<string, string> = {
      'inStock': '#22c55e', // verde
      'outOfStock': '#ef4444', // vermelho
      'limitedStock': '#eab308', // amarelo
      'dropship': '#a855f7', // roxo
      'other': '#94a3b8' // cinza
    }

    // Formatar para o formato esperado pelo frontend
    const formattedData = Object.entries(statusCounts).map(([status, count], index) => ({
      name: status,
      value: count,
      color: statusColors[status] || `hsl(${index * 45}, 70%, 50%)`
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Error in stores API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
