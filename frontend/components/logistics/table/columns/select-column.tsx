"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import type { LogisticsEntry } from "@/lib/api/logistics"

export function getSelectColumn(): ColumnDef<LogisticsEntry> {
  return {
    id: "select",
    header: ({ table }) => (
      <div className="px-2">
        <Checkbox
          checked={
            table?.getIsAllPageRowsSelected() ||
            (table?.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table?.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-2">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40
  }
}