"use client"

import { ColumnDef } from "@tanstack/react-table"
import { LogisticsStatusDropdown } from "../../logistics-status-dropdown"
import type { LogisticsEntry } from "@/lib/api/logistics"
import type { TableColumnProps } from "./types"

export function getStatusColumn({ onStatusChange }: TableColumnProps): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "order_status",
    header: "Status",
    cell: ({ row }) => (
      <LogisticsStatusDropdown
        value={row.getValue("order_status")}
        onValueChange={async (value) => {
          await onStatusChange(row.original.id, value)
        }}
      />
    ),
    size: 160
  }
}