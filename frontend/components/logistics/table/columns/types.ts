import type { LogisticsEntry } from "@/lib/api/logistics"

export interface TableColumnProps {
  onDeleteClick: (entry: LogisticsEntry) => void
  onArchiveClick: (entry: LogisticsEntry) => void
  onRestoreClick: ((entry: LogisticsEntry) => void) | undefined
  onStatusChange: (id: number, status: string) => void
  onTrackingUpdate: (id: number, updates: Partial<LogisticsEntry>) => void
  isArchived?: boolean
}