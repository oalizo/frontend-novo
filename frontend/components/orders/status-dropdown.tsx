"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ORDER_STATUSES = [
  // Critical States
  { value: "action_required", label: "Action Required", color: "bg-rose-200 text-rose-900" },
  { value: "oos", label: "OOS", color: "bg-[#DC2626] text-white" },
  { value: "canceled", label: "Canceled", color: "bg-pink-200 text-pink-900" },
  { value: "fulfillment_error", label: "Fulfillment Error", color: "bg-orange-200 text-orange-900" },
  { value: "late_ship", label: "Late Ship", color: "bg-amber-200 text-amber-900" },
  { value: "fake_ship", label: "Fake Ship", color: "bg-[#7C3AED] text-white" },
  
  // Processing States
  { value: "ordered", label: "Ordered", color: "bg-lime-200 text-lime-900" },
  { value: "unshipped", label: "Unshipped", color: "bg-green-200 text-green-900" },
  { value: "pick_up", label: "Pick up", color: "bg-[#0EA5E9] text-white" },
  { value: "to_inventory", label: "To Inventory", color: "bg-teal-200 text-teal-900" },
  { value: "physical_stock", label: "Physical Stock", color: "bg-cyan-200 text-cyan-900" },
  { value: "shipped", label: "Shipped", color: "bg-sky-200 text-sky-900" },
  { value: "store", label: "Store", color: "bg-yellow-200 text-yellow-900" },
  
  // Special States
  { value: "replacement", label: "Replacement", color: "bg-blue-200 text-blue-900" },
  { value: "pending", label: "Pending", color: "bg-indigo-200 text-indigo-900" },
  { value: "refunded", label: "Refunded", color: "bg-gray-200 text-gray-900" },
  { value: "requested_return", label: "Requested Return", color: "bg-purple-200 text-purple-900" }
]

interface StatusDropdownProps {
  value: string
  onValueChange: (value: string) => Promise<void>
}

export function StatusDropdown({ value, onValueChange }: StatusDropdownProps) {
  const currentStatus = ORDER_STATUSES.find(s => s.value === value?.toLowerCase()) || ORDER_STATUSES[0]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-full border-0 bg-transparent p-0 justify-center">
        <SelectValue className="text-center">
          <div className={cn(
            "inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium w-full",
            currentStatus.color
          )}>
            {currentStatus.label}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent 
        align="start" 
        className="w-[160px] max-h-[300px] overflow-y-auto border rounded-md"
        sideOffset={4}
      >
        {ORDER_STATUSES.map(status => (
          <SelectItem 
            key={status.value} 
            value={status.value}
            className="px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-accent/50 text-center"
          >
            <div className={cn(
              "inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium w-full",
              status.color
            )}>
              {status.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}