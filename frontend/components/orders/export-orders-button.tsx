import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Order } from "@/lib/api/orders"

interface ExportOrdersButtonProps {
  orders: Order[]
  isFiltered: boolean
}

export function ExportOrdersButton({ orders, isFiltered }: ExportOrdersButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    if (isExporting || !orders.length) return
    
    try {
      setIsExporting(true)
      
      // Define CSV headers
      const headers = [
        "Purchase Date",
        "Order ID",
        "Status",
        "SKU",
        "ASIN",
        "Title",
        "Amazon Price",
        "Amazon Fee",
        "Supplier Order ID",
        "Supplier Price",
        "Supplier Tax", 
        "Supplier Shipping",
        "Customer Shipping",
        "Quantity",
        "Profit",
        "ROI",
        "Margin",
        "Notes"
      ]

      // Map orders to CSV rows
      const rows = orders.map(order => [
        order.purchase_date,
        order.order_id,
        order.order_status,
        order.sku,
        order.asin,
        `"${order.title?.replace(/"/g, '""') || ''}"`, // Escape quotes in title
        order.amazon_price,
        order.amazon_fee,
        order.supplier_order_id,
        order.supplier_price,
        order.supplier_tax,
        order.supplier_shipping,
        order.customer_shipping,
        order.quantity_sold,
        order.profit,
        order.roi,
        order.margin,
        `"${order.notes?.replace(/"/g, '""') || ''}"` // Escape quotes in notes
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: `Exported ${orders.length} orders successfully`
      })
    } catch (error) {
      console.error('Failed to export orders:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export orders. Please try again."
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting || !orders.length}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export {isFiltered ? 'Filtered ' : ''}Orders
    </Button>
  )
}