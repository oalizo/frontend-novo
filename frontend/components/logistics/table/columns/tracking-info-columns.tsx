"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import type { LogisticsEntry } from "@/lib/api/logistics"
import type { TableColumnProps } from "./types"

export function getTrackingInfoColumns(props: TableColumnProps): ColumnDef<LogisticsEntry>[] {
  return [
    {
      id: "provider",
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">{row.original.provider || "-"}</div>
      ),
      size: 120,
    },
    {
      id: "date_time",
      accessorKey: "date_time",
      header: "Date Time",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {formatDateTime(row.original.date_time) || "-"}
        </div>
      ),
      size: 150,
    },
    {
      id: "current_status",
      accessorKey: "current_status",
      header: "Current Status",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {row.original.current_status || "-"}
        </div>
      ),
      size: 200,
    },
    {
      id: "expected_date",
      accessorKey: "expected_date",
      header: "Expected",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          {formatDateTime(row.original.expected_date) || "-"}
        </div>
      ),
      size: 150,
    },
    {
      id: "url_carrier",
      accessorKey: "url_carrier",
      header: "URL Carrier",
      cell: ({ row }) => {
        const url = row.original.url_carrier;
        if (!url) return "-";
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-blue-500 hover:text-blue-700"
            onClick={() => window.open(url, '_blank')}
          >
            Track Package
          </Button>
        );
      },
      size: 120,
    }
  ]
}