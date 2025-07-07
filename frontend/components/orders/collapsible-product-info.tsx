"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Info, RefreshCw, Loader2 } from "lucide-react"
import { Order, updateOrder } from "@/lib/api/orders"
import { EditableField } from "./editable-field"
import { CopyButton } from "./copy-button"
import { TruncatedTitle } from "./truncated-title"
import { formatDateTime } from "@/lib/utils"
import { getTrackingInfo } from "@/lib/api/tracking"
import { useToast } from "@/components/ui/use-toast"

interface CollapsibleProductInfoProps {
  order: Order
  onUpdate: (orderId: number, field: string, value: string) => Promise<void>
}

export function CollapsibleProductInfo({ order: initialOrder, onUpdate }: CollapsibleProductInfoProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const { toast } = useToast()

  const updateTracking = async (value: string) => {
    try {
      setIsUpdating(true)
      setUpdateError(null)
      
      // Only update if value changed
      if (value.trim() !== order.customer_track_id) {
        // Update tracking number first
        await onUpdate(order.order_item_id, "customer_track_id", value.trim())
        
        // Update local state
        setOrder(prev => ({
          ...prev,
          customer_track_id: value.trim()
        }))
        
        // Then get tracking status if we have a number
        if (value.trim()) {
          await updateTrackingStatus(value.trim())
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tracking'
      setUpdateError(message)
      throw new Error(message) // Re-throw with clean error
    } finally {
      setIsUpdating(false)
    }
  }

  const updateTrackingStatus = async (trackingNumber: string) => {
    try {
      setIsUpdating(true)
      setUpdateError(null)
      
      // Get tracking info from the API
      const trackingInfo = await getTrackingInfo(trackingNumber)
      const trackStatus = trackingInfo.currentStatus || 'Pending'
      
      // First update local state immediately for responsive UI
      setOrder(prev => ({
        ...prev,
        customer_track_status: trackStatus
      }))
      
      // Then update the order with the tracking status in the backend
      await updateOrder(order.order_item_id, {
        customer_track_status: trackStatus
      })
      
      // Confirm to the user
      toast({
        title: "Tracking Updated",
        description: `Status: ${trackStatus}`
      })
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tracking status'
      setUpdateError(message)
      toast({
        variant: "destructive",
        title: "Error",
        description: message
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTrackingUpdate = async () => {
    if (isUpdating || !order.customer_track_id) return
    
    try {
      await updateTrackingStatus(order.customer_track_id)
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update tracking')
    }
  }

  return (
    <div className="space-y-1 min-w-[300px]">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <TruncatedTitle title={order.title} />
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            SKU: {order.sku}
            <CopyButton value={order.sku} label="Copiar SKU" />
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            ASIN: {order.asin}
            <CopyButton value={order.asin} label="Copiar ASIN" />
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            Order ID: {order.order_id}
            <CopyButton value={order.order_id} label="Copiar Order ID" />
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            Supplier Order ID: 
            <EditableField
              value={order.supplier_order_id}
              onSave={async (value) => {
                await onUpdate(order.order_item_id, "supplier_order_id", value)
                setOrder(prev => ({
                  ...prev,
                  supplier_order_id: value
                }))
              }}
              placeholder="+ Add"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Last Ship Date: {order.latest_ship_date ? formatDateTime(order.latest_ship_date, false) : '-'}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            Customer Ship: 
            <EditableField
              value={order.customer_track_id}
              onSave={async (value) => {
                await updateTracking(value)
              }}
              placeholder="+ Add"
            />
            {order.customer_track_id && (
              <CopyButton value={order.customer_track_id} label="Copy Tracking" />
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            Ship Status: <span className="font-medium">{order.customer_track_status || '-'}</span>
            {updateError && <span className="text-destructive text-xs ml-1">({updateError})</span>}
            {order.customer_track_id && !isUpdating && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 hover:bg-accent hover:text-accent-foreground"
                onClick={handleTrackingUpdate}
                title="Refresh tracking status"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
          </div>
        </div>
        {order.notes && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground"
            title={order.notes}
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}