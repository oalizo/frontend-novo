export const LOGISTICS_STATUSES = [
  // Priority order
  { value: "ordered", label: "Ordered", color: "bg-yellow-200 text-yellow-900" },
  { value: "shipped", label: "Shipped", color: "bg-emerald-200 text-emerald-900" },
  { value: "oos", label: "OOS", color: "bg-red-200 text-red-900" },
  { value: "late_ship", label: "Late Ship", color: "bg-orange-200 text-orange-900" },
  { value: "to_pick_up", label: "To Pick up", color: "bg-sky-200 text-sky-900" },
  { value: "to_inventory", label: "To Inventory", color: "bg-teal-200 text-teal-900" },
  { value: "canceled", label: "Canceled", color: "bg-rose-200 text-rose-900" },
  { value: "replacement", label: "Replacement", color: "bg-violet-200 text-violet-900" },
  // Remaining statuses
  { value: "action_required", label: "Action Required", color: "bg-red-200 text-red-900" },
  { value: "fulfillment_error", label: "Fulfillment Error", color: "bg-orange-200 text-orange-900" },
  { value: "physical_stock", label: "Physical Stock", color: "bg-emerald-200 text-emerald-900" },
  { value: "picked_up", label: "Picked-up", color: "bg-emerald-200 text-emerald-900" },
  { value: "ready_pickup", label: "Ready to Pick-up", color: "bg-sky-200 text-sky-900" },
  { value: "unshipped", label: "Unshipped", color: "bg-yellow-200 text-yellow-900" },
  { value: "pending", label: "Pending", color: "bg-yellow-200 text-yellow-900" },
  { value: "received_w", label: "Received W", color: "bg-slate-200 text-slate-900" },
  { value: "refunded", label: "Refunded", color: "bg-slate-200 text-slate-900" },
  { value: "requested_return", label: "Requested Return", color: "bg-slate-200 text-slate-900" },
  { value: "in_transit", label: "In Transit", color: "bg-sky-200 text-sky-900" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-200 text-emerald-900" },
  { value: "delayed", label: "Delayed", color: "bg-orange-200 text-orange-900" },
  { value: "exception", label: "Exception", color: "bg-red-200 text-red-900" }
] as const

export const STORES = [
  { value: "best_buy", label: "Best Buy" },
  { value: "zoro", label: "Zoro" },
  { value: "home_depot", label: "Home Depot" },
  { value: "acme_tools", label: "Acme Tools" },
  { value: "vitacost", label: "Vitacost" },
  { value: "webstaurant", label: "Webstaurant" },
  { value: "bjs", label: "BJs" }
] as const

export type LogisticsStatus = typeof LOGISTICS_STATUSES[number]["value"]
export type Store = typeof STORES[number]["value"]

export function getStatusColor(status: string): string {
  const statusConfig = LOGISTICS_STATUSES.find(s => s.value === status)
  return statusConfig?.color || "bg-gray-100 text-gray-800"
}

export function getStatusLabel(value: string): string {
  const status = LOGISTICS_STATUSES.find(s => s.value === value)
  return status ? status.label : value
}

export function getStoreLabel(value: string): string {
  const store = STORES.find(s => s.value === value)
  return store ? store.label : value
}

export function determineLogisticsStatus(currentStatus: string | null, latestShipDate: string | null, deliveredDate: string | null): LogisticsStatus {
  // If delivered, return delivered status
  if (deliveredDate || (currentStatus && currentStatus.toLowerCase().includes('delivered'))) {
    return 'delivered'
  }

  // Check for delayed status
  if (latestShipDate) {
    const shipDate = new Date(latestShipDate)
    const now = new Date()
    if (now > shipDate && !deliveredDate) {
      return 'delayed'
    }
  }

  // Check for in transit status
  if (currentStatus) {
    const status = currentStatus.toLowerCase()
    if (status.includes('transit') || 
        status.includes('shipped') || 
        status.includes('pickup') || 
        status.includes('moving')) {
      return 'in_transit'
    }
  }

  // Default to ordered for any other case
  return 'ordered'
}