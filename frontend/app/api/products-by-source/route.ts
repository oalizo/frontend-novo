import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    // Redirecionar para o backend
    const apiBaseUrl = 'http://167.114.223.83:3007/api'
    const response = await axios.get(`${apiBaseUrl}/products-by-source`)
    
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('🥧 [Products Chart] Error fetching products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 