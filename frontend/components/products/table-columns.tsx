"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2, RefreshCw } from "lucide-react"
import { Product } from "@/lib/api"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { EditableNumberCell } from "./editable-number-cell"
import { ProductTableMeta } from "./table-types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function getColumns(
  onDeleteClick: (product: Product) => void,
  onRefreshClick: (product: Product) => void
): ColumnDef<Product>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "sku",
      header: "SKU",
    },
    {
      accessorKey: "sku2",
      header: "SKU2",
    },
    {
      accessorKey: "asin",
      header: "ASIN",
    },
    {
      accessorKey: "availability",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("availability") as string
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              status === "inStock" || status === "instock"
                ? "bg-green-50 text-green-700"
                : status === "backorder"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {status || "outofstock"}
          </span>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "supplier_price",
      header: "Supplier Price",
      cell: ({ row, table }) => (
        <EditableNumberCell
          value={row.getValue("supplier_price")}
          field="supplier_price"
          row={row.original}
          onUpdate={(table.options.meta as ProductTableMeta).updateData}
          rowIndex={row.index}
        />
      ),
    },
    {
      accessorKey: "supplier_price_shipping",
      header: "Supplier Shipping",
      cell: ({ row, table }) => (
        <EditableNumberCell
          value={row.getValue("supplier_price_shipping")}
          field="supplier_price_shipping"
          row={row.original}
          onUpdate={(table.options.meta as ProductTableMeta).updateData}
          rowIndex={row.index}
        />
      ),
    },
    {
      accessorKey: "freight_cost",
      header: "Freight Cost",
      cell: ({ row, table }) => (
        <EditableNumberCell
          value={row.getValue("freight_cost")}
          field="freight_cost"
          row={row.original}
          onUpdate={(table.options.meta as ProductTableMeta).updateData}
          rowIndex={row.index}
        />
      ),
    },
    {
      accessorKey: "customer_price_shipping",
      header: "Customer Shipping",
      cell: ({ row, table }) => (
        <EditableNumberCell
          value={row.getValue("customer_price_shipping")}
          field="customer_price_shipping"
          row={row.original}
          onUpdate={(table.options.meta as ProductTableMeta).updateData}
          rowIndex={row.index}
        />
      ),
    },
    {
      accessorKey: "total_price",
      header: "Total Price",
      cell: ({ row }) => formatCurrency(row.getValue("total_price")),
    },
    {
      accessorKey: "lead_time",
      header: "Lead Time",
    },
    {
      accessorKey: "lead_time_2",
      header: "Lead Time 2",
    },
    {
      accessorKey: "handling_time_amz",
      header: "Handling Time",
    },
    {
      accessorKey: "brand",
      header: "Brand",
    },
    {
      accessorKey: "source",
      header: "Source",
    },
    // Coluna Tax removida para melhorar o espaçamento
    {
      accessorKey: "last_update",
      header: "Last Update",
      cell: ({ row }) => formatDateTime(row.getValue("last_update")),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRefreshClick(row.original)
                    }}
                    aria-label="Refresh product"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar produto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteClick(row.original)
                    }}
                    aria-label="Delete product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir produto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
    },
  ]
}