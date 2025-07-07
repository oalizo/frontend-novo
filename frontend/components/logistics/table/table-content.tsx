"use client"

import {
  TableBody,
  TableCell,
  TableRow
} from "@/components/ui/table"
import { flexRender } from "@tanstack/react-table"
import type { Column } from "@tanstack/react-table"
import type { LogisticsEntry } from "@/lib/api/logistics"

interface TableContentProps {
  data: LogisticsEntry[]
  columns: Column<LogisticsEntry, unknown>[]
  loading?: boolean
  table: any // Table instance
}

export function TableContent({ 
  data,
  columns,
  loading,
  table
}: TableContentProps) {
  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={columns.length}
            className="h-[300px] text-center"
          >
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  if (!data.length) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={columns.length}
            className="h-24 text-center"
          >
            No results found.
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {table && table.getRowModel().rows.map((row: any) => (
        <TableRow 
          key={row.id}
          data-state={row.getIsSelected() && "selected"}
        >
          {row.getVisibleCells().map((cell: any) => (
            <TableCell key={cell.id}>
              {flexRender(
                cell.column.columnDef.cell,
                cell.getContext()
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}