import { ColumnDef } from "@tanstack/react-table"
import type { LogisticsEntry } from "@/lib/api/logistics"

import { getSelectColumn } from "./select-column"
import { getDateColumn } from "./date-column"
import { getStoreColumn } from "./store-column"
import { getSupplierOrderColumn } from "./supplier-order-column"
import { getAmazonOrderColumn } from "./amazon-order-column"
import { getQuantitySoldColumn } from "./quantity-sold-column"
import { getProductColumn } from "./product-column"
import { getTrackingColumn } from "./tracking-column"
import { getStatusColumn } from "./status-column"
import { getNotesColumn } from "./notes-column"
import { getActionsColumn } from "./actions-column"

export interface TableColumnProps {
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
    getDateColumn(),
    getStoreColumn(),
    getSupplierOrderColumn(),
    getAmazonOrderColumn(),
    getQuantitySoldColumn(),
    getProductColumn(),
    getTrackingColumn({ onTrackingUpdate }),
    getStatusColumn({ onStatusChange }),
    getNotesColumn({ onTrackingUpdate }),
    getActionsColumn({ onDeleteClick, onArchiveClick, onRestoreClick, isArchived })
  ]
}