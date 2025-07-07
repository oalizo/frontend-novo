"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Download } from "lucide-react"
import { Product, getProducts } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TableHeaderProps {
  selectedRows: string[]
  data?: Product[]
  pageSize: number
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function TableHeader({ 
  selectedRows, 
  data, 
  pageSize, 
  onPageSizeChange,
}: TableHeaderProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = async () => {
    if (isExporting) return
    
    try {
      setIsExporting(true)
      let productsToExport: Product[] = []
      
      if (selectedRows.length > 0 && data) {
        productsToExport = data.filter(product => selectedRows.includes(product.sku2))
      } else {
        const response = await getProducts({ 
          page: 1, 
          size: 999999,
          search: "",
          asin: "",
          sku2: "",
          brand: "",
          availability: "all",
          source: "all"
        })
        productsToExport = response.data
      }

      if (!productsToExport.length) {
        console.error('No products to export')
        return
      }

      const headers = [
        "SKU",
        "SKU2",
        "ASIN",
        "Status",
        "Quantity",
        "Supplier Price",
        "Supplier Shipping",
        "Freight Cost",
        "Customer Shipping",
        "Total Price",
        "Lead Time",
        "Lead Time 2",
        "Handling Time",
        "Brand",
        "Source",
        "Tax",
        "Last Update"
      ]

      const rows = productsToExport.map(row => [
        row.sku,
        row.sku2,
        row.asin,
        row.availability,
        row.quantity,
        row.supplier_price,
        row.supplier_price_shipping,
        row.freight_cost,
        row.customer_price_shipping,
        row.total_price,
        row.lead_time,
        row.lead_time_2,
        row.handling_time_amz,
        row.brand,
        row.source,
        row.tax_supplier,
        row.last_update
      ].map(value => `"${value ?? ''}"`))

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revoObjectURL(url)
    } catch (error) {
      console.error('Failed to export products:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-4">
        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleExportCSV}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : `Export ${selectedRows.length ? 'Selected' : 'All'} to CSV`}
        </Button>
      </div>
    </div>
  )
}