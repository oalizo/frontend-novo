"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"
import { ExpandableProductTitle } from "../../expandable-product-title"

export function getProductColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "title",
    id: "title",
    header: "Product",
    cell: ({ row }) => (
      <div className="min-w-[400px] max-w-[400px]">
        <ExpandableProductTitle title={row.original.title} />
      </div>
    ),
    size: 400
  }
}