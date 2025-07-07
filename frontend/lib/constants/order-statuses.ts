export const ORDER_STATUSES = [
  // Red Category (Urgent/Problems)
  // Critical States
  { value: "action_required", label: "Action Required", color: "bg-rose-200 text-rose-900" },
  { value: "oos", label: "OOS", color: "bg-red-200 text-red-900" },
  { value: "canceled", label: "Canceled", color: "bg-pink-200 text-pink-900" },
  { value: "fulfillment_error", label: "Fulfillment Error", color: "bg-orange-200 text-orange-900" },
  { value: "late_ship", label: "Late Ship", color: "bg-amber-200 text-amber-900" },
  { value: "fake_ship", label: "Fake Ship", color: "bg-yellow-200 text-yellow-900" },
  
  // Processing States
  { value: "ordered", label: "Ordered", color: "bg-lime-200 text-lime-900" },
  { value: "unshipped", label: "Unshipped", color: "bg-green-200 text-green-900" },
  { value: "pick_up", label: "Pick up", color: "bg-emerald-200 text-emerald-900" },
  { value: "to_inventory", label: "To Inventory", color: "bg-teal-200 text-teal-900" },
  { value: "physical_stock", label: "Physical Stock", color: "bg-cyan-200 text-cyan-900" },
  { value: "shipped", label: "Shipped", color: "bg-sky-200 text-sky-900" },
  { value: "store", label: "Store", color: "bg-yellow-200 text-yellow-900" },
  
  // Special States
  { value: "replacement", label: "Replacement", color: "bg-blue-200 text-blue-900" },
  { value: "pending", label: "Pending", color: "bg-indigo-200 text-indigo-900" },
  { value: "refunded", label: "Refunded", color: "bg-violet-200 text-violet-900" },
  { value: "requested_return", label: "Requested Return", color: "bg-purple-200 text-purple-900" }
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number]["value"];

export function getStatusColor(status: string): string {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status?.toLowerCase());
  return statusConfig?.color || "bg-gray-200 text-gray-900";
}

export function getStatusLabel(status: string): string {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status?.toLowerCase());
  return statusConfig?.label || status;
}

export function validateOrderStatus(status: unknown): OrderStatus {
  if (!status || typeof status !== 'string') {
    return 'ordered';
  }

  const normalizedStatus = status.toLowerCase().trim();
  const validStatus = ORDER_STATUSES.find(s => s.value === normalizedStatus);
  return validStatus ? validStatus.value : 'ordered';
}

export function isValidOrderStatus(status: unknown): boolean {
  if (!status || typeof status !== 'string') return false;
  return ORDER_STATUSES.some(s => s.value === status.toLowerCase().trim());
}