"use client"

import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const lowercaseStatus = status.toLowerCase()
    
    switch (lowercaseStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in transit':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'delayed':
        return 'bg-orange-100 text-orange-800'
      case 'exception':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      getStatusColor(status)
    )}>
      {status}
    </span>
  )
}