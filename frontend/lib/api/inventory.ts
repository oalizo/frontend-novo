import { api } from './api-client'
import { logger } from '@/lib/utils/logger'

export interface InventoryItem {
  id: number
  store: string
  supplier_order_id: string | null
  asin: string
  quantity: number
  title: string | null
  status: string
  cost_price: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryResponse {
  data: InventoryItem[]
  total: number
}

export interface InventoryParams {
  page?: number
  size?: number
  search?: string
  status?: string
  store?: string
}

export async function getInventory(params: InventoryParams): Promise<InventoryResponse> {
  try {
    const { data } = await api.get<InventoryResponse>('/inventory', { params })
    return data
  } catch (error) {
    logger.error('Error fetching inventory:', error)
    throw error
  }
}

export async function createInventoryItem(
  item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
): Promise<InventoryItem> {
  try {
    const { data } = await api.post<InventoryItem>('/inventory', item)
    return data
  } catch (error) {
    logger.error('Error creating inventory item:', error)
    throw error
  }
}

export async function updateInventoryItem(
  id: number, 
  updates: Partial<InventoryItem>
): Promise<InventoryItem> {
  try {
    logger.info('Updating inventory item:', { id, updates });
    const { data } = await api.put<InventoryItem>(`/inventory/${id}`, updates)
    logger.info('Successfully updated inventory item:', { id, updates, result: data });
    return data
  } catch (error) {
    logger.error('Error updating inventory item:', error)
    throw error
  }
}

export async function deleteInventoryItem(id: number): Promise<void> {
  try {
    await api.delete(`/inventory/${id}`)
  } catch (error) {
    logger.error('Error deleting inventory item:', error)
    throw error
  }
}