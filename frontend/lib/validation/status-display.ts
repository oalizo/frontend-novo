import { OrderStatus, validateOrderStatus } from './order-status'
import { getStatusStyle } from './status-colors'

interface StatusDisplay {
  label: string
  style: {
    background: string
    text: string
  }
  description: string
}

// Status display configuration
const STATUS_DISPLAY: Record<OrderStatus, Omit<StatusDisplay, 'style'>> = {
  ordered: {
    label: 'Ordered',
    description: 'Order has been placed'
  },
  action_required: {
    label: 'Action Required',
    description: 'Order needs attention'
  },
  canceled: {
    label: 'Canceled',
    description: 'Order has been canceled'
  },
  fulfillment_error: {
    label: 'Fulfillment Error',
    description: 'Error during fulfillment process'
  },
  late_ship: {
    label: 'Late Ship',
    description: 'Shipping is delayed'
  },
  oos: {
    label: 'Out of Stock',
    description: 'Item is out of stock'
  },
  physical_stock: {
    label: 'Physical Stock',
    description: 'Item is in physical stock'
  },
  picked_up: {
    label: 'Picked Up',
    description: 'Order has been picked up'
  },
  ready_pickup: {
    label: 'Ready for Pickup',
    description: 'Order is ready for pickup'
  },
  to_pick_up: {
    label: 'To Pick Up',
    description: 'Order needs to be picked up'
  },
  to_inventory: {
    label: 'To Inventory',
    description: 'Order needs to be added to inventory'
  },
  shipped: {
    label: 'Shipped',
    description: 'Order has been shipped'
  },
  replacement: {
    label: 'Replacement',
    description: 'Order is a replacement'
  },
  unshipped: {
    label: 'Unshipped',
    description: 'Order has not been shipped'
  },
  pending: {
    label: 'Pending',
    description: 'Order is pending processing'
  },
  received_w: {
    label: 'Received W',
    description: 'Order has been received at warehouse'
  },
  refunded: {
    label: 'Refunded',
    description: 'Order has been refunded'
  },
  requested_return: {
    label: 'Return Requested',
    description: 'Customer has requested a return'
  }
}

// Get full display info for a status
export function getStatusDisplay(status: unknown): StatusDisplay {
  const validStatus = validateOrderStatus(status)
  const style = getStatusStyle(validStatus)
  const display = STATUS_DISPLAY[validStatus]

  return {
    ...display,
    style
  }
}