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
import { deleteProduct } from "@/lib/api"
import { AlertTriangle } from "lucide-react"

interface DeleteProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Array<{
    sku: string
    sku2: string
  }>
  onDelete: () => void
}

export function DeleteProductDialog({
  open,
  onOpenChange,
  products,
  onDelete,
}: DeleteProductDialogProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async (deleteFromAmazon: boolean) => {
    if (!products.length) return

    setIsDeleting(true)
    try {
      // Delete each product sequentially
      for (const product of products) {
        await deleteProduct(product.sku2, deleteFromAmazon)
      }
      
      toast({
        title: "Success",
        description: `${products.length} product${products.length > 1 ? 's' : ''} deleted successfully${deleteFromAmazon ? ' from Amazon and database' : ' from database'}`,
      })
      
      onDelete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting products:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete products. Please try again.",
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
              Delete {products.length > 1 ? 'Products' : 'Product'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            How would you like to delete {products.length > 1 ? 'these products' : 'this product'}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {products.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {products.map((product) => (
              <div key={product.sku2} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-8">
                  <div>
                    <span className="text-muted-foreground">SKU:</span>{' '}
                    <span className="font-medium">{product.sku}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SKU2:</span>{' '}
                    <span className="font-medium">{product.sku2}</span>
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
            variant="secondary"
            onClick={() => handleDelete(false)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete from Database Only"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDelete(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete from Amazon & Database"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}