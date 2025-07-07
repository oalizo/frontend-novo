"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { updateLogistics } from "@/lib/api/logistics"
import { getTrackingInfo } from "@/lib/api/tracking"

interface EditableTrackingNumberProps {
  value: string | null
  logisticsId: number
  onUpdate: (id: number, updates: any) => void
}

export function EditableTrackingNumber({ 
  value, 
  logisticsId,
  onUpdate 
}: EditableTrackingNumberProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (isProcessing || !editValue.trim()) return
    
    if (editValue === value) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    console.log('🔄 Starting tracking number update process...')
    
    try {
      // Try to fetch tracking info first
      console.log('📦 Fetching tracking info for:', editValue)
      try {
        const trackingInfo = await getTrackingInfo(editValue)
        console.log('✅ Received tracking info:', trackingInfo)

        const updates = {
          supplier_tracking_number: editValue,
          provider: trackingInfo.provider || '',
          date_time: trackingInfo.dateTime || null,
          current_status: trackingInfo.currentStatus || '',
          shipping_status: trackingInfo.shippingStatus || null,
          delivered_date: trackingInfo.delivered ? trackingInfo.dateTime : null,
          delivery_info: trackingInfo.deliveryInfo || '',
          expected_date: trackingInfo.expectedDate || null,
          url_carrier: trackingInfo.urlCarrier || '',
          origin_city: trackingInfo.originCity || '',
          destination_city: trackingInfo.destinationCity || ''
        }

        console.log('📝 Updating logistics entry with:', updates)
        await updateLogistics(logisticsId, updates)
        onUpdate(logisticsId, updates)
        setEditing(false)
        
        toast({
          title: "Success",
          description: "Tracking information updated successfully"
        })
      } catch (trackingError) {
        console.error('❌ Error fetching tracking info:', trackingError)
        
        // Update with just the tracking number if API fails
        const fallbackUpdate = {
          supplier_tracking_number: editValue,
          provider: '',
          date_time: null,
          current_status: '',
          shipping_status: null,
          delivered_date: null,
          delivery_info: '',
          expected_date: null,
          url_carrier: '',
          origin_city: '',
          destination_city: ''
        }

        await updateLogistics(logisticsId, fallbackUpdate)
        onUpdate(logisticsId, fallbackUpdate)
        setEditing(false)

        toast({
          title: "Notice",
          description: "Tracking number saved. No tracking information available."
        })
      }
    } catch (error) {
      console.error('❌ Update error:', error)
      
      // Revert to original value on error
      onUpdate(logisticsId, { supplier_tracking_number: value })
      setEditValue(value || "")
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tracking number"
      })
    } finally {
      setIsProcessing(false)
      console.log('✨ Update process completed')
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave(e)
            } else if (e.key === 'Escape') {
              setEditing(false)
              setEditValue(value || "")
            }
          }}
          className="h-7 w-[180px]"
          autoFocus
          disabled={isProcessing}
          placeholder="Enter tracking number"
        />
        {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      className="h-auto p-0 text-sm font-normal"
      onClick={() => setEditing(true)}
    >
      {value || "Click to add"}
    </Button>
  )
}