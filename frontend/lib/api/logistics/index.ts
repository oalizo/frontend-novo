"use client"

import { api } from '../api-client'
import { logger } from '@/lib/utils/logger'
import { checkOrderExists } from './utils'
import type { 
  LogisticsEntry,
  LogisticsResponse,
  LogisticsStats,
  LogisticsParams
} from './types'

export * from './types'
export * from './utils'
export * from './validation'

export async function getLogistics(params: LogisticsParams): Promise<LogisticsResponse> {
  try {
    const endpoint = params.archived ? '/logistics/archived' : '/logistics'
    const queryParams = {
      ...params,
      page: params.page || 1,
      size: params.size || 50
    }
    
    const { data } = await api.get<LogisticsResponse>(endpoint, { params: queryParams })
    return data
  } catch (error) {
    logger.error('Error fetching logistics:', error)
    throw error
  }
}

export async function createLogisticsEntry(entry: Omit<LogisticsEntry, 'id' | 'created_at' | 'updated_at'>): Promise<LogisticsEntry> {
  try {
    // Check if order exists with same ASIN
    const validation = await checkOrderExists(entry.order_id, entry.asin);
    logger.info('Order existence check result:', validation);
    
    if (validation.exists) {
      if (validation.hasSameAsin) {
        const error = new Error('Order with same ASIN already exists in logistics');
        logger.error('Duplicate order/ASIN:', error);
        throw error;
      }
    }
    
    // Create entry with forced status and null values
    const entryData = {
      ...entry,
      order_status: 'ordered',
      dead_line: null,
      date_time: null,
      current_status: null,
      shipping_status: null,
      delivered_date: null,
      expected_date: null,
      url_carrier: null,
      notes: entry.notes || null
    }

    const { data } = await api.post<LogisticsEntry>('/logistics', entryData)
    return data
  } catch (error) {
    logger.error('Error creating logistics entry:', {
      error,
      entry
    })
    throw error
  }
}

export async function updateLogistics(id: number, updates: Partial<LogisticsEntry>): Promise<LogisticsEntry> {
  try {
    const { data } = await api.put<LogisticsEntry>(`/logistics/${id}`, updates)
    return data
  } catch (error) {
    logger.error('Error updating logistics:', error)
    throw error
  }
}

export async function deleteLogistics(id: number): Promise<void> {
  try {
    await api.delete(`/logistics/${id}`)
  } catch (error) {
    logger.error('Error deleting logistics:', error)
    throw error
  }
}

export async function archiveLogistics(id: number): Promise<void> {
  try {
    await api.post(`/logistics/${id}/archive`)
  } catch (error) {
    logger.error('Error archiving logistics:', error)
    throw error
  }
}

export async function restoreLogistics(id: number): Promise<void> {
  try {
    await api.post(`/logistics/${id}/restore`)
  } catch (error) {
    logger.error('Error restoring logistics:', error)
    throw error
  }
}

export async function getLogisticsStats(params: Omit<LogisticsParams, 'page' | 'size'>): Promise<LogisticsStats> {
  try {
    const endpoint = params.archived ? '/logistics/archived/stats' : '/logistics/stats'
    const { data } = await api.get<LogisticsStats>(endpoint, { params })
    return data
  } catch (error) {
    logger.error('Error fetching logistics stats:', error)
    throw error
  }
}