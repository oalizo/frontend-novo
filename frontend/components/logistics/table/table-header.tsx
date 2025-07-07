"use client"

import {
  TableHead,
  TableHeader as UITableHeader,
  TableRow
} from "@/components/ui/table"
import { flexRender } from "@tanstack/react-table"
import type { Column } from "@tanstack/react-table"
import type { LogisticsEntry } from "@/lib/api/logistics"

interface TableHeaderProps {
  columns: Column<LogisticsEntry, unknown>[]
  table: any // Table instance
}

export function TableHeader({ columns, table }: TableHeaderProps) {
  return (
    <UITableHeader className="sticky-header">
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.id}
            style={{
              width: column.getSize?.(),
              minWidth: column.getSize?.(),
              position: 'sticky', 
              top: 0, 
              zIndex: 30,
              background: 'var(--background)'
            }}
          >
            {column.columnDef.header && 
              flexRender(
                column.columnDef.header, 
                { column, table }
              )}
          </TableHead>
        ))}
      </TableRow>
    </UITableHeader>
  )
}