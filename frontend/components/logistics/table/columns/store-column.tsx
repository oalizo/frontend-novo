"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"
import { getStoreLabel } from "@/lib/constants/logistics-statuses"

export function getStoreColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "store",
    id: "store",
    header: "Store",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {getStoreLabel(row.original.store)}
      </div>
    ),
    size: 120
  }
}