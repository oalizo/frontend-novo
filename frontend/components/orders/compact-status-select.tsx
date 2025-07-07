"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STATUSES, getStatusColor } from "@/lib/constants/order-statuses"

interface CompactStatusSelectProps {
  value: string
  onValueChange: (value: string) => Promise<void>
}

export function CompactStatusSelect({ value, onValueChange }: CompactStatusSelectProps) {
  const currentStatus = ORDER_STATUSES.find(s => s.value === value)

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent p-0 hover:bg-accent/50">
        <SelectValue>
          <div className={getStatusColor(value)}>
            {currentStatus?.label || value}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent 
        align="start" 
        className="w-[160px] p-1"
        sideOffset={4}
      >
        {ORDER_STATUSES.map(status => (
          <SelectItem 
            key={status.value} 
            value={status.value}
            className="rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground cursor-pointer"
          >
            <div className={getStatusColor(status.value)}>
              {status.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}