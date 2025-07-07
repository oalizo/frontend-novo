import { z } from 'zod'
import { logger } from '../utils/logger'

// Define valid order statuses
export const ORDER_STATUSES = [
  'ordered',
  'action_required', 
  'canceled',
  'fulfillment_error',
  'late_ship',
  'oos',
  'physical_stock',
  'picked_up',
  'ready_pickup',
  'to_pick_up',
  'to_inventory',
  'shipped',
  'replacement',
  'unshipped',
  'pending',
  'received_w',
  'refunded',
  'requested_return'
] as const

// Create type from valid statuses
export type OrderStatus = typeof ORDER_STATUSES[number]

// Zod schema for order status validation
export const orderStatusSchema = z.enum(ORDER_STATUSES)

// Validate and normalize order status
export function validateOrderStatus(status: unknown): OrderStatus {
  try {
    // Handle null/undefined
    if (!status) {
      logger.warn('Null/undefined order status, defaulting to "ordered"')
      return 'ordered'
    }

    // Normalize string input
    const normalizedStatus = String(status).toLowerCase().trim()

    // Validate against schema
    const result = orderStatusSchema.safeParse(normalizedStatus)
    
    if (!result.success) {
      logger.warn(`Invalid order status "${status}", defaulting to "ordered"`)
      return 'ordered'
    }

    return result.data
  } catch (error) {
    logger.error('Error validating order status:', error)
    return 'ordered'
  }
}

// Check if status is valid
export function isValidOrderStatus(status: unknown): boolean {
  try {
    orderStatusSchema.parse(status)
    return true
  } catch {
    return false
  }
}