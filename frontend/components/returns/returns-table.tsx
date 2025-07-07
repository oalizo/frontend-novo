"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { getReturns, updateReturnTracking, archiveReturns, type Return } from "@/lib/api/returns"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import { RefreshCw, Archive, Loader2 } from "lucide-react"

interface ReturnsTableProps {
  selectedRows: string[]
  setSelectedRows: (rows: string[]) => void
  filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }
  onDataChange: (total: number, filtered: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  isArchived?: boolean
}

export function ReturnsTable({ 
  selectedRows, 
  setSelectedRows, 
  filters,
  onDataChange,
  pageSize,
  onPageSizeChange,
  isArchived = false
}: ReturnsTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingTracking, setUpdatingTracking] = useState<Record<string, boolean>>({})
  const [lastUpdate, setLastUpdate] = useState<Record<string, number>>({})
  const [archiving, setArchiving] = useState<Record<string, boolean>>({})
  const [processingArchive, setProcessingArchive] = useState(false)
  const [processingRestore, setProcessingRestore] = useState(false)

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getReturns({
        page: currentPage,
        size: pageSize,
        ...filters,
        archived: isArchived
      })
      
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load returns data"
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
    loadReturns()
  }, [loadReturns])

  // Auto-update tracking for non-delivered items
  useEffect(() => {
    const updateInterval = 15 * 60 * 1000 // 15 minutes
    const processDelay = 5000 // 5 seconds between updates

    const updateTracking = async () => {
      const now = Date.now()
      
      for (const item of data) {
        // Skip if:
        // 1. No tracking number
        // 2. Already delivered
        // 3. Currently updating
        // 4. Updated in last 12 hours
        if (!item.tracking_id || 
            item.tracking_status?.toLowerCase().includes('delivered') ||
            updatingTracking[item.amazon_rma_id] ||
            (lastUpdate[item.amazon_rma_id] && now - lastUpdate[item.amazon_rma_id] < 12 * 60 * 60 * 1000)) {
          continue
        }

        try {
          setUpdatingTracking(prev => ({ ...prev, [item.amazon_rma_id]: true }))
          await updateReturnTracking(item.amazon_rma_id, item.tracking_id)
          setLastUpdate(prev => ({ ...prev, [item.amazon_rma_id]: now }))
          await new Promise(resolve => setTimeout(resolve, processDelay))
        } catch (error) {
          console.error(`Failed to update tracking for ${item.amazon_rma_id}:`, error)
        } finally {
          setUpdatingTracking(prev => ({ ...prev, [item.amazon_rma_id]: false }))
        }
      }
      
      await loadReturns()
    }

    const intervalId = setInterval(updateTracking, updateInterval)
    return () => clearInterval(intervalId)
  }, [data, loadReturns])

  const handleManualUpdate = async (item: Return) => {
    if (!item.tracking_id || updatingTracking[item.amazon_rma_id]) return
    
    try {
      setUpdatingTracking(prev => ({ ...prev, [item.amazon_rma_id]: true }))
      await updateReturnTracking(item.amazon_rma_id, item.tracking_id)
      setLastUpdate(prev => ({ ...prev, [item.amazon_rma_id]: Date.now() }))
      await loadReturns()
      
      toast({
        title: "Success",
        description: "Tracking status updated"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update tracking status"
      })
    } finally {
      setUpdatingTracking(prev => ({ ...prev, [item.amazon_rma_id]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading returns...</p>
        </div>
      </div>
    )
  }

  const handleArchive = async (ids: string[]) => {
    if (processingArchive) return
    
    try {
      setProcessingArchive(true)
      await archiveReturns(ids)
      await loadReturns()
      setSelectedRows([])
      
      toast({
        title: "Success",
        description: `${ids.length} ${ids.length === 1 ? 'return' : 'returns'} archived successfully`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive returns"
      })
    } finally {
      setProcessingArchive(false)
    }
  }
  const handleRestore = async (ids: string[]) => {
    if (processingRestore) return
    
    try {
      setProcessingRestore(true)
      await restoreReturns(ids)
      await loadReturns()
      setSelectedRows([])
      
      toast({
        title: "Success",
        description: `${ids.length} ${ids.length === 1 ? 'return' : 'returns'} restored successfully`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore returns"
      })
    } finally {
      setProcessingRestore(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      {selectedRows.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => isArchived ? handleRestore(selectedRows) : handleArchive(selectedRows)}
            disabled={isArchived ? processingRestore : processingArchive}
          >
            {(isArchived ? processingRestore : processingArchive) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {isArchived ? 'Restore' : 'Archive'} Selected ({selectedRows.length})
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRows.length === data.length}
                  onCheckedChange={(checked) => {
                    setSelectedRows(checked ? data.map(r => r.amazon_rma_id) : [])
                  }}
                />
              </TableHead>
              <TableHead>Return Date</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>RMA ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead className="min-w-[250px]">Tracking Status</TableHead>
              <TableHead>Label Cost</TableHead>
              <TableHead>Order Amount</TableHead>
              <TableHead>Refunded</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.amazon_rma_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(item.amazon_rma_id)}
                      onCheckedChange={(checked) => {
                        setSelectedRows(prev => 
                          checked 
                            ? [...prev, item.amazon_rma_id]
                            : prev.filter(id => id !== item.amazon_rma_id)
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(item.return_request_date)}</TableCell>
                  <TableCell>{item.order_id}</TableCell>
                  <TableCell>{item.amazon_rma_id}</TableCell>
                  <TableCell>{item.return_request_status}</TableCell>
                  <TableCell>{item.asin}</TableCell>
                  <TableCell>{item.merchant_sku}</TableCell>
                  <TableCell>{item.return_quantity}</TableCell>
                  <TableCell>{item.return_reason}</TableCell>
                  <TableCell>{item.return_carrier}</TableCell>
                  <TableCell>{item.tracking_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium flex-1 text-center",
                        {
                          "bg-green-100 text-green-800": item.tracking_status?.toLowerCase().includes('delivered'),
                          "bg-blue-100 text-blue-800": item.tracking_status?.toLowerCase().includes('transit'),
                          "bg-yellow-100 text-yellow-800": !item.tracking_status || item.tracking_status?.toLowerCase() === 'pending'
                        }
                      )} style={{ minWidth: '200px' }}>
                        {item.tracking_status || 'No status'}
                      </div>
                      {item.tracking_id && !item.tracking_status?.toLowerCase().includes('delivered') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 ml-2"
                          disabled={updatingTracking[item.amazon_rma_id]}
                          onClick={() => handleManualUpdate(item)}
                        >
                          {updatingTracking[item.amazon_rma_id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(item.label_cost)}</TableCell>
                  <TableCell>{formatCurrency(Number(item.order_amount))}</TableCell>
                  <TableCell>{formatCurrency(Number(item.refunded_amount))}</TableCell>
                  <TableCell>
                    {!isArchived && (
                      <Button
                        title={isArchived ? "Restore return" : "Archive return"}
                        disabled={archiving[item.amazon_rma_id]}
                        variant="ghost"
                        size="icon"
                        onClick={() => isArchived ? handleRestore([item.amazon_rma_id]) : handleArchive([item.amazon_rma_id])}
                      >
                        {archiving[item.amazon_rma_id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={15} className="h-24 text-center">
                  No returns found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        {selectedRows.length > 0 && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              try {
                await archiveReturns(selectedRows)
                toast({
                  title: "Success",
                  description: `${selectedRows.length} returns archived successfully`
                })
                await loadReturns()
                setSelectedRows([])
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to archive returns"
                })
              }
            }}
          >
            <Archive className="h-4 w-4" />
            Archive Selected ({selectedRows.length})
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
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
      </div>
    </div>
  )
}