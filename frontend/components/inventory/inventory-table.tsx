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
import { useToast } from "@/components/ui/use-toast"
import { getInventory, updateInventoryItem, deleteInventoryItem, type InventoryItem } from "@/lib/api/inventory"
import { EditableField } from "./editable-field"
import { InventoryStatusSelect } from "./inventory-status-select"
import { EditableCostPrice } from "./editable-cost-price"
import { InventoryHistoryDialog } from "./inventory-history-dialog"
import { History, Trash2 } from "lucide-react"
import { getStoreLabel } from "@/lib/constants/logistics-statuses"
import { ExpandableProductTitle } from "@/components/logistics/expandable-product-title"
import { EditableNotesCell } from "./editable-notes-cell"

interface InventoryTableProps {
  selectedRows: string[]
  setSelectedRows: (rows: string[]) => void
  filters: {
    search: string
    status: string
    store: string
  }
  onDataChange: (total: number, filtered: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function InventoryTable({ 
  selectedRows, 
  setSelectedRows, 
  filters,
  onDataChange,
  pageSize,
  onPageSizeChange
}: InventoryTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const handleFieldUpdate = async (id: number, field: string, value: any) => {
    try {
      // Format numeric values
      if (field === 'quantity') {
        value = Number(value)
      }

      await updateInventoryItem(id, { [field]: value })
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? { ...item, [field]: value } : item
        )
      )
      toast({
        title: "Success",
        description: "Field updated successfully"
      })
    } catch (error) {
      console.error('Error updating field:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update field"
      })
    }
  }

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Loading inventory with filters:', filters)
      const response = await getInventory({
        page: currentPage,
        size: pageSize,
        ...filters
      })
      
      if (response?.data) {
        console.log('Loaded inventory data:', response.data)
        setData(response.data)
        setTotalItems(response.total)
        onDataChange(response.total, response.data.length)
      } else {
        console.log('No inventory data returned')
        setData([])
        setTotalItems(0)
        onDataChange(0, 0)
      }
    } catch (error) {
      console.error("Failed to load inventory:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory data. Please try again."
      })
      setData([])
      setTotalItems(0)
      onDataChange(0, 0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filters, onDataChange, toast])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, pageSize])

  useEffect(() => {
    console.log('Triggering inventory load')
    loadInventory()
  }, [loadInventory])

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateInventoryItem(id, { status })
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? { ...item, status } : item
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

  const handleCostPriceUpdate = async (id: number, cost_price: number) => {
    try {
      await updateInventoryItem(id, { cost_price })
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? { ...item, cost_price } : item
        )
      )
      toast({
        title: "Success",
        description: "Cost price updated successfully"
      })
    } catch (error) {
      console.error('Error updating cost price:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update cost price"
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      console.log('Deleting inventory item:', id)
      // Use the API function instead of direct axios call
      await deleteInventoryItem(id)
      
      // Update local state
      setData(prevData => prevData.filter(item => item.id !== id))
      
      // Show success message
      toast({
        title: "Success",
        description: "Item deleted successfully"
      })
      
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        variant: "destructive",
        title: "Error deleting item",
        description: error instanceof Error ? error.message : "Failed to delete item"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Supplier Order</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <EditableField
                      value={item.store}
                      onSave={async (value) => handleFieldUpdate(item.id, "store", value)}
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <EditableField
                      value={item.supplier_order_id}
                      onSave={async (value) => handleFieldUpdate(item.id, "supplier_order_id", value)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableField
                      value={item.asin}
                      onSave={async (value) => handleFieldUpdate(item.id, "asin", value)}
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <EditableField
                      value={item.quantity}
                      onSave={async (value) => handleFieldUpdate(item.id, "quantity", value)}
                      type="number"
                      min={0}
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCostPrice
                      value={item.cost_price}
                      onSave={(value) => handleCostPriceUpdate(item.id, value)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <EditableField
                      value={item.title}
                      onSave={async (value) => handleFieldUpdate(item.id, "title", value)}
                    />
                  </TableCell>
                  <TableCell>
                    <InventoryStatusSelect
                      value={item.status}
                      onValueChange={(value) => handleStatusChange(item.id, value)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableNotesCell
                      value={item.notes}
                      inventoryId={item.id}
                      onUpdate={(id, value) => handleFieldUpdate(id, "notes", value)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItemId(item.id)
                          setHistoryDialogOpen(true)
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No inventory items found.
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

      <InventoryHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        inventoryId={selectedItemId}
      />
    </div>
  )
}