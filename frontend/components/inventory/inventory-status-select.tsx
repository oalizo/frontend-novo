"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const INVENTORY_STATUSES = [
  { value: "broken_damaged", label: "Broken/Damaged", color: "bg-red-200 text-red-900" },
  { value: "return_to_store", label: "Return To Store", color: "bg-orange-200 text-orange-900" },
  { value: "replacement", label: "Replacement", color: "bg-amber-200 text-amber-900" },
  { value: "resealable_amazon", label: "Resealable - Amazon", color: "bg-emerald-200 text-emerald-900" },
  { value: "resealable_ebay", label: "Resealable - Ebay", color: "bg-teal-200 text-teal-900" },
  { value: "like_new", label: "Like New", color: "bg-cyan-200 text-cyan-900" }
]

interface InventoryStatusSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function InventoryStatusSelect({ value, onValueChange }: InventoryStatusSelectProps) {
  const currentStatus = INVENTORY_STATUSES.find(s => s.value === value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger 
        className="h-8 w-[180px] border-0 bg-transparent p-0 hover:bg-accent/50 focus:ring-0"
        style={{ boxShadow: 'none' }}
      >
        <SelectValue>
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-full",
            currentStatus?.color || "bg-gray-100 text-gray-800"
          )}>
            {currentStatus?.label || value}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent 
        align="start" 
        className="w-[180px] p-1 border-0"
        sideOffset={4}
      >
        {INVENTORY_STATUSES.map(status => (
          <SelectItem 
            key={status.value} 
            value={status.value}
            className="rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground cursor-pointer"
          >
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-full",
              status.color
            )}>
              {status.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}