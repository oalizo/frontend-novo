import { OrderStatus } from './order-status'

interface StatusStyle {
  background: string
  text: string
}

// Color mapping for order statuses
export const STATUS_COLORS: Record<OrderStatus, StatusStyle> = {
  // Red Group (Urgent/Problems)
  action_required: { background: '#FEE2E2', text: '#991B1B' },
  canceled: { background: '#B22222', text: '#FFFFFF' },
  fulfillment_error: { background: '#FF4500', text: '#FFFFFF' },
  late_ship: { background: '#FF6347', text: '#FFFFFF' },
  oos: { background: '#FF7F7F', text: '#FFFFFF' },
  
  // Blue Group (Operational)
  ordered: { background: '#1E90FF', text: '#FFFFFF' },
  physical_stock: { background: '#0000CD', text: '#FFFFFF' },
  picked_up: { background: '#87CEFA', text: '#111827' },
  ready_pickup: { background: '#4682B4', text: '#FFFFFF' },
  to_pick_up: { background: '#5F9EA0', text: '#FFFFFF' },
  to_inventory: { background: '#2E8B57', text: '#FFFFFF' },
  
  // Green Group (Completed)
  shipped: { background: '#32CD32', text: '#FFFFFF' },
  replacement: { background: '#228B22', text: '#FFFFFF' },
  
  // Yellow Group (Waiting)
  unshipped: { background: '#FFD700', text: '#111827' },
  pending: { background: '#FFFACD', text: '#111827' },
  
  // Gray Group (Neutral/Processing)
  received_w: { background: '#D3D3D3', text: '#111827' },
  refunded: { background: '#A9A9A9', text: '#FFFFFF' },
  requested_return: { background: '#696969', text: '#FFFFFF' }
}

// Get style for a status
export function getStatusStyle(status: unknown): StatusStyle {
  const defaultStyle: StatusStyle = {
    background: '#E5E7EB',
    text: '#111827'
  }

  if (!status || typeof status !== 'string') {
    return defaultStyle
  }

  const normalizedStatus = status.toLowerCase().trim() as OrderStatus
  return STATUS_COLORS[normalizedStatus] || defaultStyle
}