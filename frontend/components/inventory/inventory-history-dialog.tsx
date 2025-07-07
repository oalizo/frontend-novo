"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDateTime } from "@/lib/utils"
import { useState, useEffect } from "react"
import { getInventoryHistory, type InventoryHistoryEntry } from "@/lib/api/inventory-history"
import { logger } from "@/lib/utils/logger"

interface InventoryHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryId: number | null
}

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  inventoryId
}: InventoryHistoryDialogProps) {
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadHistory() {
      if (!inventoryId) return
      
      setLoading(true)
      try {
        const data = await getInventoryHistory(inventoryId)
        setHistory(data)
      } catch (error) {
        logger.error('Error loading history:', error)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }

    if (open && inventoryId) {
      loadHistory()
    }
  }, [open, inventoryId])

  const getActionDescription = (entry: InventoryHistoryEntry) => {
    switch (entry.action_type) {
      case 'in':
        return `Quantity increased from ${entry.previous_quantity} to ${entry.new_quantity}`
      case 'out':
        return `Quantity decreased from ${entry.previous_quantity} to ${entry.new_quantity}`
      case 'status_change':
        return `Status changed from ${entry.previous_status} to ${entry.new_status}`
      default:
        return entry.notes || 'No description available'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inventory History</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] rounded-md border p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <p className="font-medium">{getActionDescription(entry)}</p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">
                          Note: {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(entry.changed_at)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Changed by: {entry.changed_by}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No history available
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}