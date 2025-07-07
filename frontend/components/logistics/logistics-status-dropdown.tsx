"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LOGISTICS_STATUSES } from "@/lib/constants/logistics-statuses"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

interface LogisticsStatusDropdownProps {
  value: string
  onValueChange: (value: string) => Promise<void>
}

export function LogisticsStatusDropdown({ value, onValueChange }: LogisticsStatusDropdownProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  
  const currentStatus = LOGISTICS_STATUSES.find(s => s.value === value) || 
                       LOGISTICS_STATUSES.find(s => s.value === 'ordered') || 
                       LOGISTICS_STATUSES[0]

  const handleChange = async (newValue: string) => {
    if (isUpdating) return
    
    try {
      setIsUpdating(true)
      await onValueChange(newValue)
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={isUpdating}>
        <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent p-0">
          <SelectValue>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-full",
              currentStatus.color
            )}>
              {currentStatus.label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          align="start" 
          className="w-[160px] max-h-[300px] overflow-y-auto"
          sideOffset={4}
        >
          {LOGISTICS_STATUSES.map(status => (
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
    </div>
  )
}