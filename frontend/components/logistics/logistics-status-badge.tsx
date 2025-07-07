"use client"

import { cn } from "@/lib/utils"
import { getStatusColor } from "@/lib/constants/logistics-statuses"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      getStatusColor(status)
    )}>
      {status}
    </span>
  )
}