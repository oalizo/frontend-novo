"use client"

import axios from 'axios'
import { LogisticsEntryInput } from '../validation/logistics'
import { logisticsEntrySchema } from '../validation/logistics'
import { logger } from '../utils/logger'
import { sanitizeError } from '../utils/error-handling'
import { checkOrderExists } from './logistics'

interface ValidationResponse {
  isValid: boolean
  error?: string
}

export async function validateLogisticsEntry(entry: LogisticsEntryInput): Promise<ValidationResponse> {
  try {
    // Basic validation first
    if (!entry || !entry.order_id || !entry.asin) {
      logger.warn('Missing required fields for logistics entry')
      return {
        isValid: false,
        error: 'Missing required fields'
      }
    }

    // Validate schema
    const result = logisticsEntrySchema.safeParse(entry)
    if (!result.success) {
      const errorMessage = result.error.errors[0].message
      logger.warn('Schema validation failed:', { error: errorMessage })
      return {
        isValid: false,
        error: errorMessage
      }
    }

    // Check for duplicate order/ASIN
    try {
      const check = await checkOrderExists(entry.order_id, entry.asin)
      if (check.exists) {
        if (check.hasSameAsin) {
          logger.warn('Duplicate order/ASIN combination found:', {
            orderId: entry.order_id,
            asin: entry.asin
          })
          return {
            isValid: false,
            error: 'Order with same ASIN already exists in logistics'
          }
        }
        logger.info('Order exists but with different ASIN:', {
          orderId: entry.order_id,
          asin: entry.asin
        })
        return {
          isValid: true
        }
      }
    } catch (error) {
      logger.error('Order check failed:', error)
      return {
        isValid: false,
        error: 'Failed to validate order'
      }
    }

    logger.info('Logistics entry validation successful')
    return { isValid: true }
  } catch (error) {
    const errorMessage = sanitizeError(error)
    logger.error('Validation error:', { error: errorMessage })
    return {
      isValid: false,
      error: errorMessage
    }
  }
}