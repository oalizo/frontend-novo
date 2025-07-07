import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjpgdwgbfcjqpuqvlnwl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGdkd2diZmNqcXB1cXZsbndsMiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc3NzA0MjE4LCJleHAiOjE5OTMyODAyMTh9.Jd1Gq8CWB_Vc1nKJDQKTGBQjNEGMZZKFCLkDdXdOFQs';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '50');
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    // Obter status - pode ser um único valor ou um array
    const statusParam = searchParams.get('status');
    let statusArray: string[] = [];
    
    if (statusParam && statusParam !== 'all') {
      // Se for uma string separada por vírgulas, dividir em array
      statusArray = statusParam.split(',');
    }
    
    // Calcular offset para paginação
    const offset = (page - 1) * size;
    
    // Construir a consulta base
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });
    
    // Aplicar filtros
    
    // Filtro de status
    if (statusArray.length > 0) {
      query = query.in('order_status', statusArray);
    }
    
    // Filtro de busca
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,sku.ilike.%${search}%,asin.ilike.%${search}%,order_id.ilike.%${search}%,supplier_order_id.ilike.%${search}%`
      );
    }
    
    // Filtro de data
    if (dateFrom) {
      query = query.gte('purchase_date', `${dateFrom}T00:00:00.000Z`);
    }
    
    if (dateTo) {
      query = query.lte('purchase_date', `${dateTo}T23:59:59.999Z`);
    }
    
    // Ordenação e paginação
    const { data, error, count } = await query
      .order('purchase_date', { ascending: false })
      .range(offset, offset + size - 1);
    
    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar pedidos' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: data || [],
      total: count || 0
    });
  } catch (error) {
    console.error('Erro na API de pedidos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
