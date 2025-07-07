"use client"

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://167.114.223.83:3007/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

// Implementação de cache separada
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
const cache = new Map<string, {data: any, timestamp: number}>()

const getCacheKey = (endpoint: string, params: any) => {
  return `${endpoint}:${JSON.stringify(params)}`
}

export interface Order {
  order_item_id: number
  purchase_date: string
  order_id: string
  order_status: string
  fulfillment_channel: string
  latest_ship_date: string
  title: string
  sku: string
  asin: string
  amazon_price: number
  quantity_sold: number
  supplier_order_id: string | null
  supplier_tracking_number: string | null
  amazon_fee: number
  bundle_qty: number | null
  supplier_price: number | null
  supplier_tax: number | null
  supplier_shipping: number | null
  customer_shipping: number | null
  profit: number | null
  customer_track_id: string | null
  customer_track_status: string | null
  source: string | null
  notes: string | null
  margin: number | null
  roi: number | null
}

export interface OrdersResponse {
  data: Order[]
  total: number
}

export interface OrderStats {
  total_orders: number
  total_amazon_price: number
  total_quantity_sold: number
  total_profit: number
  average_roi: number
  average_margin: number
}

export interface OrdersParams {
  page?: number
  size?: number
  search?: string
  status?: string | string[]
  dateFrom?: string
  dateTo?: string
}

export async function getOrders(params: OrdersParams): Promise<OrdersResponse> {
  try {
    // Prepare clean parameters
    const requestParams = { ...params };
    
    // Se status for "all", não envie esse parâmetro
    if (requestParams.status === "all") {
      delete requestParams.status;
    } else if (requestParams.status && typeof requestParams.status === 'string' && requestParams.status.includes(',')) {
      // Se tiver múltiplos status, usar a nova API
      console.log("Usando API de múltiplos status");
      
      // Construir URL com todos os parâmetros
      const queryParams = new URLSearchParams();
      Object.entries(requestParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      // Adicionar parâmetros padrão
      queryParams.append('sort', 'purchase_date');
      queryParams.append('order', 'desc');
      
      // Fazer requisição para a nova API
      const response = await fetch(`/api/orders-multi-status?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    }
    
    // Adicionar parâmetros padrão
    const finalParams = {
      ...requestParams,
      sort: 'purchase_date',
      order: 'desc'
    };
    
    // TEMPORÁRIO: Limpar cache para forçar dados frescos
    cache.clear();
    
    // Gerar chave de cache
    const cacheKey = getCacheKey('/orders', finalParams);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fazer requisição
    const { data } = await api.get<OrdersResponse>('/orders', { 
      params: finalParams
    });

    // Armazenar em cache
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
}

export async function getOrderStats(params: Omit<OrdersParams, 'page' | 'size'>): Promise<OrderStats> {
  try {
    // Preparar parâmetros limpos, removendo status=all
    const requestParams = { ...params };
    if (requestParams.status === "all") {
      delete requestParams.status;
    }

    const cacheKey = getCacheKey('/orders/stats', requestParams) // Usar requestParams limpos para cache
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    const { data } = await api.get<OrderStats>('/orders/stats', { params: requestParams }) // Usar requestParams limpos na requisição
    
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
    
    return data
  } catch (error) {
    console.error('Error fetching order stats:', error)
    throw error
  }
}

export async function updateOrder(orderItemId: number, updates: Partial<Order>): Promise<Order> {
  try {
    const { data } = await api.patch<Order>(`/orders/${orderItemId}`, updates)
    
    // Invalidate cache
    cache.clear()
    
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to update order')
    }
    throw error
  }
}

export async function deleteOrder(orderItemId: number): Promise<void> {
  try {
    const response = await api.delete(`/orders/${orderItemId}`)
    
    // Invalidate cache
    cache.clear()
    
    if (response.status !== 200) {
      throw new Error(`Failed to delete order ${orderItemId}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to delete order ${orderItemId}`
    throw new Error(message)
  }
}

export async function getCustomerShipping(asin: string): Promise<number> {
  try {
    const cacheKey = getCacheKey('/produto/customer-price-shipping', { asin })
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    const { data } = await api.get(`/produto/customer-price-shipping/${asin}`)
    
    const shipping = data && data.length > 0 ? data[0].customer_price_shipping || 0 : 0
    
    cache.set(cacheKey, {
      data: shipping,
      timestamp: Date.now()
    })
    
    return shipping
  } catch (error) {
    console.error('Error fetching customer shipping:', error)
    return 0
  }
}