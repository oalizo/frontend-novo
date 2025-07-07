"use client"

import { ColumnDef } from "@tanstack/react-table"
import { EditableNotesCell } from "../../editable-notes-cell"
import type { LogisticsEntry } from "@/lib/api/logistics"
import type { TableColumnProps } from "./types"

export function getNotesColumn({ onTrackingUpdate }: TableColumnProps): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <EditableNotesCell
        value={row.original.notes}
        logisticsId={row.original.id}
        onUpdate={onTrackingUpdate}
      />
    ),
    size: 300
  }
}