"use client"

import { useState, useRef, useCallback } from "react"
import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useIntersectionObserver } from "../../../hooks/use-intersection-observer"
import { TableHeader } from "./table-header"
import { TableContent } from "./table-content"
import { TableFooter } from "./table-footer"
import type { Column } from "@tanstack/react-table"
import type { LogisticsEntry } from "@/lib/api/logistics"

interface ProgressiveTableProps {
  data: LogisticsEntry[]
  columns: Column<LogisticsEntry, unknown>[]
  loading?: boolean
  pageCount: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  totalItems: number
  className?: string
  table: any // Table instance
}

const INITIAL_COLUMNS = 5
const COLUMNS_PER_LOAD = 3

export function ProgressiveTable({
  data,
  columns,
  loading,
  pageCount,
  pageSize,
  currentPage,
  onPageChange,
  totalItems,
  className,
  table
}: ProgressiveTableProps) {
  const [visibleColumns, setVisibleColumns] = useState(INITIAL_COLUMNS)
  const [loadingMore, setLoadingMore] = useState(false)
  const endMarkerRef = useRef<HTMLDivElement>(null)
  
  const onIntersect = useCallback(() => {
    if (loadingMore || visibleColumns >= columns.length) return
    
    setLoadingMore(true)
    setTimeout(() => {
      setVisibleColumns(prev => Math.min(prev + COLUMNS_PER_LOAD, columns.length))
      setLoadingMore(false)
    }, 500)
  }, [loadingMore, visibleColumns, columns.length])

  useIntersectionObserver(endMarkerRef, onIntersect)

  const currentColumns = columns.slice(0, visibleColumns)

  return (
    <div className={cn("table-wrapper")}>
      <div className="table-content">
        <div className="table-scroll-container">
          <Table>
            <TableHeader columns={currentColumns} table={table} />
            <TableContent 
              data={data}
              columns={currentColumns}
              loading={loading}
              table={table}
            />
          </Table>
          
          {!loading && visibleColumns < columns.length && (
            <div
              ref={endMarkerRef}
              className="loading-indicator"
            >
              {loadingMore && (
                <div className="loading-dot" />
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}