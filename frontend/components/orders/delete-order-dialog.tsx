"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { deleteOrder } from "@/lib/api/orders"
import { AlertTriangle } from "lucide-react"
import type { Order } from "@/lib/api/orders"

import { sanitizeError } from "@/lib/utils/error-handling"

interface DeleteOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onDelete: () => void
}

export function DeleteOrderDialog({
  open,
  onOpenChange,
  orders,
  onDelete,
}: DeleteOrderDialogProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!orders.length) return

    setIsDeleting(true)
    const failedOrders: number[] = [];
    
    try {
      // Delete each order sequentially
      for (const order of orders) {
        try {
          await deleteOrder(order.order_item_id)
        } catch (error) {
          failedOrders.push(order.order_item_id);
        }
      }
      
      const successCount = orders.length - failedOrders.length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} ${successCount > 1 ? 'orders' : 'order'} deleted successfully`,
        });
      }
      
      if (failedOrders.length > 0) {
        toast({
          variant: "destructive",
          title: "Warning",
          description: `Failed to delete ${failedOrders.length} order${failedOrders.length > 1 ? 's' : ''}: ${failedOrders.join(', ')}`
        });
      }
      
      onDelete()
      onOpenChange(false)
    } catch (error) {
      const errorMessage = sanitizeError(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Deletion failed: ${errorMessage}`
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle className="text-xl font-semibold">
              Delete {orders.length > 1 ? 'Orders' : 'Order'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Are you sure you want to delete {orders.length > 1 ? 'these orders' : 'this order'}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {orders.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {orders.map((order) => (
              <div key={order.order_item_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-8">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>{' '}
                    <span className="font-medium">{order.order_item_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <span className="font-medium capitalize">{order.order_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Order"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}