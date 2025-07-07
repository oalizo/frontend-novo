"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"
import { type TableColumnProps } from "./types"

import { getSelectColumn } from "./select-column"
import { getDateColumn } from "./date-column"
import { getStoreColumn } from "./store-column"
import { getSupplierOrderColumn } from "./supplier-order-column"
import { getAsinColumn } from "./asin-column"
import { getQuantitySoldColumn } from "./quantity-sold-column"
import { getCustomerShipEstimateColumn } from "./customer-ship-estimate-column"
import { getProductColumn } from "./product-column"
import { getAmazonOrderColumn } from "./amazon-order-column"
import { getStatusColumn } from "./status-column"
import { getTrackingColumn } from "./tracking-column"
import { getTrackingInfoColumns } from "./tracking-info-columns"
import { getNotesColumn } from "./notes-column"
import { getActionsColumn } from "./actions-column"

export interface TableColumnProps {
  onDeleteClick: (entry: LogisticsEntry) => void
  onArchiveClick: (entry: LogisticsEntry) => void
  onRestoreClick?: (entry: LogisticsEntry) => void
  onStatusChange?: (entry: LogisticsEntry) => void
  onTrackingUpdate?: (entry: LogisticsEntry) => void
  isArchived?: boolean
}

export function getColumns({
  onDeleteClick,
  onArchiveClick,
  onRestoreClick,
  onStatusChange,
  onTrackingUpdate,
  isArchived
}: TableColumnProps): ColumnDef<LogisticsEntry>[] {
  const props = {
    onDeleteClick,
    onArchiveClick,
    onRestoreClick,
    onStatusChange,
    onTrackingUpdate,
    isArchived
  }

  return [
    getSelectColumn(),
    getActionsColumn({ onDeleteClick, onArchiveClick, onRestoreClick, isArchived }),
    getDateColumn(),
    getStoreColumn(),
    getSupplierOrderColumn(),
    getAmazonOrderColumn(),
    getQuantitySoldColumn(),
    getProductColumn(),
    getStatusColumn({ onStatusChange }), // Status
    getTrackingColumn({ onTrackingUpdate }), // Tracking Number
    getTrackingInfoColumns({ onTrackingUpdate })[2], // Current Status
    // Get tracking info columns but exclude duplicates
    ...getTrackingInfoColumns({ onTrackingUpdate }).filter(col => 
      col.accessorKey !== 'current_status' && // Skip current_status since we added it above
      col.id !== 'current_status' && // Also check id to ensure we don't get duplicates
      col.accessorKey !== 'tracking_status' &&
      col.id !== 'tracking_status'
    ),
    getNotesColumn({ onTrackingUpdate }),
  ]
}

export * from "./types"