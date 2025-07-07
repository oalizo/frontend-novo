import { api } from './api-client'
import { logger } from '@/lib/utils/logger'

export interface InventoryHistoryEntry {
  id: number
  inventory_id: number
  action_type: 'in' | 'out' | 'status_change' | 'quantity_change'
  previous_quantity?: number
  new_quantity?: number
  previous_status?: string
  new_status?: string
  notes: string | null
  changed_by: string
  changed_at: string
}

export async function getInventoryHistory(inventoryId: number): Promise<InventoryHistoryEntry[]> {
  try {
    const { data } = await api.get<InventoryHistoryEntry[]>(`/inventory/${inventoryId}/history`)
    return data
  } catch (error) {
    logger.error('Error fetching inventory history:', error)
    throw error
  }
}