"use client"

import { api } from '../api-client'
import { logger } from '@/lib/utils/logger'
import type { OrderExistsResponse } from './types'

export async function checkOrderExists(orderId: string, asin?: string): Promise<OrderExistsResponse> {
  try {
    const { data } = await api.get(`/logistics/check-exists`, {
      params: { 
        order_id: orderId,
        asin: asin 
      }
    })
    
    logger.debug('Order check response:', data)
    
    return {
      exists: data?.exists || false,
      hasSameAsin: data?.has_same_asin || false
    }
  } catch (error) {
    logger.error('Error checking order existence:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to check order existence')
  }
}