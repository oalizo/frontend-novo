"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { LogisticsEntry } from "@/lib/api/logistics"

export function getOrderColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "supplier_order_id",
    header: "Supplier Order",
    cell: ({ row }) => {
      const orderId = row.getValue("supplier_order_id")
      return (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
          {orderId || "-"}
        </div>
      )
    },
    size: 150
  }
}