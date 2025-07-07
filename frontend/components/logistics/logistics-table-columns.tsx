```typescript
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDateTime } from "@/lib/utils"
import { ExternalLink, RefreshCw, Archive, Trash2, RotateCcw } from "lucide-react"
import { getStoreLabel } from "@/lib/constants/logistics-statuses"
import { ExpandableProductTitle } from "./expandable-product-title"
import { LogisticsStatusDropdown } from "./logistics-status-dropdown"
import { EditableTrackingNumber } from "./editable-tracking-number"
import { EditableNotesCell } from "./editable-notes-cell"
import { getTrackingInfo } from "@/lib/api/tracking"
import { StyledShipDate } from "./styled-ship-date"
import { useToast } from "@/components/ui/use-toast"
import { updateLogistics } from "@/lib/api/logistics"
import type { LogisticsEntry } from "@/lib/api/logistics"

interface GetColumnsProps {
  onDeleteClick: (entry: LogisticsEntry) => void
  onArchiveClick: (entry: LogisticsEntry) => void
  onRestoreClick?: (entry: LogisticsEntry) => void
  onStatusChange: (id: number, status: string) => void
  onTrackingUpdate: (id: number, updates: Partial<LogisticsEntry>) => void
  isArchived?: boolean
}

export function getColumns({
  onDeleteClick,
  onArchiveClick,
  onRestoreClick,
  onStatusChange,
  onTrackingUpdate,
  isArchived = false
}: GetColumnsProps): ColumnDef<LogisticsEntry>[] {
  
  const handleTrackingRefresh = async (entry: LogisticsEntry) => {
    if (!entry.supplier_tracking_number) return
    
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
    } catch (error) {
      console.error('Error refreshing tracking:', error)
      
      // Clear all tracking-related fields while keeping the tracking number
      const clearedUpdates = {
        provider: '',
        date_time: null,
        current_status: null,
        shipping_status: null,
        delivered_date: null,
        delivery_info: '',
        expected_date: null,
        url_carrier: null,
        origin_city: '',
        destination_city: ''
      }

      // Update both UI and database with cleared values
      await updateLogistics(entry.id, clearedUpdates)
      onTrackingUpdate(entry.id, clearedUpdates)

      const { toast } = useToast()
      toast({
        title: "Notice",
        description: "No tracking information available for this number."
      })
    }
  }

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "purchase_date",
      header: "Ship Date",
      cell: ({ row }) => (
        <StyledShipDate date={row.getValue("purchase_date")} />
      ),
      size: 150,
    },
    // ... rest of the columns remain the same
    {
      accessorKey: "supplier_tracking_number",
      header: "Tracking Number",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <EditableTrackingNumber
            value={row.getValue("supplier_tracking_number")}
            logisticsId={row.original.id}
            onUpdate={onTrackingUpdate}
          />
          {row.getValue("supplier_tracking_number") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleTrackingRefresh(row.original)}
              title="Refresh tracking"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      size: 180,
    },
    // ... remaining columns
  ]
}
```