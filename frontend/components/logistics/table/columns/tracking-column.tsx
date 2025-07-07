"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { useState, useCallback } from "react"
import { EditableTrackingNumber } from "../../editable-tracking-number"
import { getTrackingInfo } from "@/lib/api/tracking"
import { updateLogistics } from "@/lib/api/logistics"
import { useToast } from "@/components/ui/use-toast"
import type { LogisticsEntry } from "@/lib/api/logistics"
import type { TableColumnProps } from "./types"

export function getTrackingColumn({ onTrackingUpdate }: TableColumnProps): ColumnDef<LogisticsEntry> {
  const RefreshButton = ({ entry }: { entry: LogisticsEntry }) => {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const { toast } = useToast()

    const handleRefresh = useCallback(async (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      
      if (!entry.supplier_tracking_number || isRefreshing) return
      
      setIsRefreshing(true)
      try {
        const trackingInfo = await getTrackingInfo(entry.supplier_tracking_number)
        
        const updates = {
          provider: trackingInfo.provider,
          date_time: trackingInfo.dateTime,
          current_status: trackingInfo.currentStatus,
          shipping_status: trackingInfo.shippingStatus,
          delivered_date: trackingInfo.delivered ? trackingInfo.dateTime : null,
          delivery_info: trackingInfo.deliveryInfo,
          expected_date: trackingInfo.expectedDate,
          url_carrier: trackingInfo.urlCarrier,
          origin_city: trackingInfo.originCity,
          destination_city: trackingInfo.destinationCity
        }

        await updateLogistics(entry.id, updates)
        onTrackingUpdate(entry.id, updates)
        
        toast({
          title: "Success",
          description: "Tracking information updated successfully"
        })
      } catch (error) {
        console.error('Failed to refresh tracking:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to refresh tracking"
        })
      } finally {
        setIsRefreshing(false)
      }
    }, [entry, isRefreshing, onTrackingUpdate, toast])

    if (!entry.supplier_tracking_number) return null

    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh tracking information"
      >
        {isRefreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    )
  }

  return {
    accessorKey: "supplier_tracking_number",
    header: "Tracking Number",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <EditableTrackingNumber
          value={row.getValue("supplier_tracking_number")}
          logisticsId={row.original.id}
          onUpdate={onTrackingUpdate}
        />
        <RefreshButton entry={row.original} />
      </div>
    ),
    size: 180
  }
}