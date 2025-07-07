import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: Request) {
  try {
    // Obter parâmetros do corpo da requisição
    const body = await request.json()
    const { from, to } = body

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 })
    }

    // Redirecionar para o backend
    const apiBaseUrl = 'http://167.114.223.83:3007/api'
    const response = await axios.post(`${apiBaseUrl}/orders-by-source`, body)
    
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('📊 [Orders Chart] Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
