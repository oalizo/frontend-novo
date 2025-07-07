"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const ORDER_STATUSES = [
  { value: "ordered", label: "Ordered", color: "default" },
  { value: "fisico", label: "Fisico", color: "warning" },
  { value: "shipped", label: "Shipped", color: "success" },
  { value: "recebido_w", label: "Recebido W", color: "warning" },
  { value: "canceled", label: "Canceled", color: "destructive" },
  { value: "to_inventory", label: "To Inventory", color: "info" },
  { value: "dos", label: "DOS", color: "destructive" },
  { value: "to_pick_up", label: "To Pick up", color: "info" },
  { value: "ready_pickup", label: "Ready to Pick-up", color: "success" },
  { value: "picked_up", label: "Picked-up", color: "success" },
  { value: "pending", label: "Pending", color: "warning" },
  { value: "return_item", label: "Return Item", color: "purple" },
  { value: "replacement", label: "Replacement", color: "brown" },
  { value: "reship_lost", label: "Reship - Item Lost", color: "brown" },
  { value: "prod_review", label: "Prod Review", color: "purple" },
  { value: "stand_by", label: "Stand By", color: "yellow" },
  { value: "store", label: "Store", color: "yellow" }
]

interface OrderStatusSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function OrderStatusSelect({ value, onValueChange }: OrderStatusSelectProps) {
  const currentStatus = ORDER_STATUSES.find(status => status.value === value) || ORDER_STATUSES[0]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <Badge
            variant={currentStatus.color as any}
            className="font-normal"
          >
            {currentStatus.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map(status => (
          <SelectItem key={status.value} value={status.value}>
            <Badge
              variant={status.color as any}
              className="font-normal"
            >
              {status.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}