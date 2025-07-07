import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    error: 'API routes are not supported in static exports' 
  }, { status: 404 })
}