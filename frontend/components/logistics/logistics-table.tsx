"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LogisticsEntry, getLogistics, updateLogistics, archiveLogistics, restoreLogistics, searchLogistics } from "@/lib/api/logistics"
import { getColumns } from "./table/columns"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { DeleteLogisticsDialog } from "./delete-logistics-dialog"
import { Archive, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface LogisticsTableProps {
  selectedRows: string[]
  setSelectedRows: (rows: string[]) => void
  filters: {
    search: string
    status: string
    store: string
    dateFrom: string
    dateTo: string
    hasTracking: string
  }
  onDataChange: (total: number, filtered: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  isArchived?: boolean
}

export function LogisticsTable({ 
  selectedRows, 
  setSelectedRows, 
  filters,
  onDataChange,
  pageSize,
  onPageSizeChange,
  isArchived = false
}: LogisticsTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<LogisticsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entriesToDelete, setEntriesToDelete] = useState<LogisticsEntry[]>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const handleSelectionChange = useCallback((updater: any) => {
    if (typeof updater === 'function') {
      const newSelection = updater(rowSelection)
      setRowSelection(newSelection)
      
      const selectedIds = Object.entries(newSelection)
        .filter(([_, selected]) => selected)
        .map(([index]) => data[parseInt(index)].id.toString())
      
      setSelectedRows(selectedIds)
    }
  }, [data, rowSelection, setSelectedRows])

  const loadLogistics = useCallback(async () => {
    try {
      setLoading(true)
      
      
      let response;
      if (filters.search) {
        // Use search endpoint when searching
        response = await searchLogistics({
          page: currentPage,
          size: pageSize,
          ...filters
        })
      } else {
        // Use regular logistics endpoint
        response = await getLogistics({
          page: currentPage,
          size: pageSize,
          ...filters,
          archived: isArchived
        })
      }
      
      if (response?.data) {
        setData(response.data)
        setTotalItems(response.total)
        onDataChange(response.total, response.data.length)
      } else {
        setData([])
        setTotalItems(0)
        onDataChange(0, 0)
      }
    } catch (error) {
      console.error("Failed to load logistics:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load logistics data. Please try again."
      })
      setData([])
      setTotalItems(0)
      onDataChange(0, 0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filters, onDataChange, toast, isArchived])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, pageSize])

  useEffect(() => {
    loadLogistics()
  }, [loadLogistics])

  const handleDeleteClick = useCallback((entry: LogisticsEntry) => {
    setEntriesToDelete([entry])
    setDeleteDialogOpen(true)
  }, [])

  const handleBatchDelete = useCallback(() => {
    const selectedEntries = data.filter((_, index) => rowSelection[index])
    setEntriesToDelete(selectedEntries)
    setDeleteDialogOpen(true)
  }, [data, rowSelection])

  const handleBatchArchive = useCallback(async () => {
    try {
      const selectedIds = Object.entries(rowSelection)
        .filter(([_, selected]) => selected)
        .map(([index]) => data[parseInt(index)].id.toString())

      await Promise.all(
        selectedIds.map(id => archiveLogistics(Number(id)))
      )
      
      toast({
        title: "Success",
        description: `${selectedIds.length} items archived successfully`
      })
      
      loadLogistics()
      setRowSelection({})
      setSelectedRows([])
    } catch (error) {
      console.error('Error archiving items:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive selected items"
      })
    }
  }, [data, rowSelection, loadLogistics, setSelectedRows, toast])

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateLogistics(id, { order_status: status })
      setData(prevData => 
        prevData.map(entry => 
          entry.id === id ? { ...entry, order_status: status } : entry
        )
      )
      toast({
        title: "Success",
        description: "Status updated successfully"
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      })
    }
  }

  const handleTrackingUpdate = async (id: number, updates: Partial<LogisticsEntry>) => {
    try {
      await updateLogistics(id, updates)
      setData(prevData => 
        prevData.map(entry => 
          entry.id === id ? { ...entry, ...updates } : entry
        )
      )
    } catch (error) {
      console.error('Error updating tracking:', error)
      throw error
    }
  }

  const handleArchiveClick = async (entry: LogisticsEntry) => {
    try {
      await archiveLogistics(entry.id)
      loadLogistics() // Reload current page data
      toast({
        title: "Success",
        description: "Entry archived successfully"
      })
    } catch (error) {
      console.error('Error archiving entry:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive entry"
      })
    }
  }

  const handleRestoreClick = async (entry: LogisticsEntry) => {
    try {
      await restoreLogistics(entry.id)
      loadLogistics() // Reload current page data
      toast({
        title: "Success", 
        description: "Entry restored successfully"
      })
    } catch (error) {
      console.error('Error restoring entry:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore entry"
      })
    }
  }

  const table = useReactTable({
    data,
    columns: getColumns({
      onDeleteClick: handleDeleteClick,
      onArchiveClick: handleArchiveClick,
      onRestoreClick: handleRestoreClick,
      onStatusChange: handleStatusChange,
      onTrackingUpdate: handleTrackingUpdate,
      isArchived
    }),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      rowSelection
    },
    onRowSelectionChange: handleSelectionChange,
    pageCount: Math.ceil(totalItems / pageSize),
    manualPagination: true,
    enableRowSelection: true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading logistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-end gap-2">
          {!isArchived && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleBatchArchive}
            >
              <Archive className="h-4 w-4" />
              Archive Selected ({Object.keys(rowSelection).length})
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleBatchDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({Object.keys(rowSelection).length})
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className="w-full min-w-max">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    row.original.archived_at && "bg-muted/30 hover:bg-muted/40"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loading}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {Math.ceil(totalItems / pageSize)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={currentPage * pageSize >= totalItems || loading}
        >
          Next
        </Button>
      </div>

      <DeleteLogisticsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entries={entriesToDelete}
        onDelete={loadLogistics}
      />
    </div>
  )
}