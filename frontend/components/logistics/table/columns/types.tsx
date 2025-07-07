"use client"

import type { LogisticsEntry } from "@/lib/api/logistics"

export interface TableColumnProps {
  onDeleteClick: (entry: LogisticsEntry) => void
  onArchiveClick: (entry: LogisticsEntry) => void
  onRestoreClick?: (entry: LogisticsEntry) => void
  onStatusChange: (id: number, status: string) => void
  onTrackingUpdate?: (id: number, updates: Partial<LogisticsEntry>) => void
  onTrackingRefresh?: (entry: LogisticsEntry) => void
  sortingState: Record<string, any>
  onSortingChange: (state: Record<string, any>) => void
  isArchived?: boolean
}