"use client"

import { api } from './api-client'
import { getTrackingInfo } from './tracking'
import { logger } from '@/lib/utils/logger'

export interface Return {
  order_id: string
  order_date: string
  return_request_date: string
  return_request_status: string
  amazon_rma_id: string
  label_cost: number
  return_carrier: string
  tracking_id: string
  label_to_be_paid_by: string
  a_to_z_claim: string
  tracking_status: string | null
  asin: string
  merchant_sku: string
  return_quantity: number
  return_reason: string
  order_amount: string
  order_quantity: number
  refunded_amount: string
}

export interface ReturnsResponse {
  data: Return[]
  total: number
}

export interface ReturnsStats {
  total_returns: number
  total_refunded: number
  total_in_transit: number
  total_received: number
  total_pending: number
}

export interface ReturnsParams {
  page?: number
  size?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  archived?: boolean
}

export async function getReturns(params: ReturnsParams): Promise<ReturnsResponse> {
  try {
    const endpoint = params.archived ? '/returns/archived' : '/returns'
    const queryParams = {
      ...params,
      archived: undefined // Remove archived from params since it's in the endpoint
    }
    const { data } = await api.get<ReturnsResponse>(endpoint, { params: queryParams })
    return data
  } catch (error) {
    logger.error('Error fetching returns:', error)
    throw error
  }
}

export async function updateReturnTracking(id: string, trackingId: string): Promise<void> {
  try {
    const trackingInfo = await getTrackingInfo(trackingId)
    logger.info('Tracking info received:', trackingInfo)

    if (!trackingInfo) {
      throw new Error('No tracking information available')
    }

    // Always update tracking info regardless of status
    const currentStatus = trackingInfo.currentStatus?.toUpperCase() || 'PENDING'
    const isDelivered = currentStatus.includes('DELIVERED') || 
                       currentStatus.includes('COMPLETED') ||
                       currentStatus.includes('FINAL DELIVERY')

    const updates = {
      tracking_status: currentStatus,
      provider: trackingInfo.provider || '',
      delivery_info: trackingInfo.deliveryInfo || '',
      expected_date: trackingInfo.expectedDate || null,
      url_carrier: trackingInfo.urlCarrier || '',
      return_request_status: isDelivered
        ? 'received' 
        : currentStatus.includes('TRANSIT')
          ? 'in_transit'
          : 'pending'
    }

    logger.info('Sending updates:', updates)
    await api.put(`/returns/${id}/tracking`, updates)
  } catch (error) {
    logger.error('Failed to update tracking:', { error, id, trackingId })
    throw error
  }
}

export async function archiveReturns(ids: string[]): Promise<void> {
  try {
    await api.post('/returns/archive', { ids })
  } catch (error) {
    logger.error('Error archiving returns:', error)
    throw error
  }
}

export async function restoreReturns(ids: string[]): Promise<void> {
  try {
    await api.post('/returns/restore', { ids })
  } catch (error) {
    logger.error('Error restoring returns:', error)
    throw error
  }
}

export async function getReturnsStats(params: Omit<ReturnsParams, 'page' | 'size'>): Promise<ReturnsStats> {
  try {
    const { data } = await api.get<ReturnsStats>('/returns/stats', { params })
    return data
  } catch (error) {
    logger.error('Error fetching returns stats:', error)
    throw error
  }
}