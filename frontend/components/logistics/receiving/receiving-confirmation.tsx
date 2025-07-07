"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { LogisticsEntry, updateLogistics } from "@/lib/api/logistics"
import { getStoreLabel } from "@/lib/constants/logistics-statuses"
import { ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"

interface ReceivingConfirmationProps {
  entry: LogisticsEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReceivingConfirmation({
  entry,
  open,
  onOpenChange,
  onSuccess
}: ReceivingConfirmationProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    if (!entry) return

    setIsProcessing(true)
    try {
      await updateLogistics(entry.id, {
        order_status: "received_w",
        received_date: new Date().toISOString(),
        shipping_status: "received"
      })

      toast({
        title: "Success",
        description: "Order received successfully"
      })

      // Call onSuccess callback to refresh the table
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating logistics:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Receiving</DialogTitle>
          <DialogDescription>
            Please verify the order details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="space-y-1">
              <p className="font-medium">Store</p>
              <p>{getStoreLabel(entry.store)}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Supplier Order ID</p>
              <p className="font-mono">{entry.supplier_order_id || '-'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">ASIN</p>
              <div className="flex items-center gap-2">
                <p>{entry.asin}</p>
                <a
                  href={`https://www.amazon.com/dp/${entry.asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-sm">Product</p>
            <p className="text-sm">{entry.title}</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-sm">Tracking Number</p>
            <p className="text-sm font-mono">{entry.supplier_tracking_number}</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirm Receiving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}