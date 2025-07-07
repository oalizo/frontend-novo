"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatCurrency } from "@/lib/utils"
import type { LogisticsEntry } from "@/lib/api/logistics"

export function getCustomerShipEstimateColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "ship_estimate",
    header: "Customer Ship Estimate",
    cell: ({ row }) => {
      const value = row.getValue("ship_estimate")
      return formatCurrency(value || 0)
    },
    size: 150
  }
}