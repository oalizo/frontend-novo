"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"

export function getSupplierOrderColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "supplier_order_id",
    id: "supplier_order_id",
    header: "Supplier Order",
    cell: ({ row }) => (
      <div className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
        {row.original.supplier_order_id || "-"}
      </div>
    ),
    size: 150
  }
}