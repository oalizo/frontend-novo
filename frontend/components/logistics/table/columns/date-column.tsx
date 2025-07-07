"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { type LogisticsEntry } from "@/lib/api/logistics"
import { StyledShipDate } from "../../styled-ship-date"

export function getDateColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: "purchase_date",
    header: "Ship Date",
    cell: ({ row }) => (
      <StyledShipDate 
        date={row.getValue("purchase_date")}
        status={row.original.order_status}
      />
    ),
    size: 150
  }
}