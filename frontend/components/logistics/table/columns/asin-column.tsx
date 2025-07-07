"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"

export function getAsinColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "asin",
    id: "asin",
    header: "ASIN",
    cell: ({ row }) => (
      <div className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
        {row.original.asin}
      </div>
    ),
    size: 120
  }
}