"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowRight, Trash2, Save } from "lucide-react"
import axios from "axios"
import { Order, updateOrder } from "@/lib/api/orders"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { EditableNumberCell } from "./editable-number-cell"
import { EditableNotesCell } from "./editable-notes-cell"
import { InventoryStatus } from "./inventory-status"
import { StatusDropdown } from "./status-dropdown"
import { CollapsibleProductInfo } from "./collapsible-product-info"
import { useToast } from "@/components/ui/use-toast"
import { createLogisticsEntry } from "@/lib/api/logistics"
import { StyledShipDate } from "@/components/logistics/styled-ship-date"
import React from "react"
import { calculateProfit } from "./profit-calculator"
import { calculateFinancialMetrics } from "@/lib/utils/financial"
import { AVAILABLE_COLUMNS } from "./column-selector"

export const getColumns = (
  onDeleteClick: (order: Order) => void,
  onFieldUpdate: (orderId: number, field: string, value: any) => Promise<void>,
  visibleColumns: string[] = []
): ColumnDef<Order>[] => {
  const allColumns: ColumnDef<Order>[] = [
    {
      id: "date_status",
      header: "Date & Status",
      cell: ({ row }) => {
        return (
          <div className="flex flex-col items-center justify-center w-full gap-3">
            <div className="text-sm font-medium">
              <StyledShipDate 
                date={row.original.purchase_date} 
                status={row.original.order_status}
                showTime={true}
                disableStyle={true}
              />
            </div>
            <div className="w-[160px]">
              <StatusDropdown
              value={row.original.order_status}
              onValueChange={(value) => onFieldUpdate(row.original.order_item_id, "order_status", value)}
              />
            </div>
          </div>
        )
      },
    },
    {
      id: "product",
      header: "Product",
      cell: ({ row }) => (
        <div className="space-y-2">
          <CollapsibleProductInfo
            order={row.original}
            onUpdate={onFieldUpdate}
          />
          <InventoryStatus asin={row.original.asin} />
        </div>
      ),
    },
    {
      id: "amazon_price",
      accessorKey: "amazon_price",
      header: "Amazon Price",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled' || status === 'refunded';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("amazon_price")}
            field="amazon_price"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "amazon_fee",
      accessorKey: "amazon_fee",
      header: "Amazon Fee",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("amazon_fee")}
            field="amazon_fee"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "supplier_price",
      accessorKey: "supplier_price",
      header: "Supplier Price",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("supplier_price")}
            field="supplier_price"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "supplier_tax",
      accessorKey: "supplier_tax",
      header: "Supplier Tax",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("supplier_tax")}
            field="supplier_tax"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "supplier_shipping",
      accessorKey: "supplier_shipping",
      header: "Supplier Shipping",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("supplier_shipping")}
            field="supplier_shipping"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "customer_shipping",
      accessorKey: "customer_shipping",
      header: "Customer Shipping",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroPrice = status === 'canceled';
        return isZeroPrice ? (
          <span className="text-muted-foreground">$0.00</span>
        ) : (
          <EditableNumberCell
            value={row.getValue("customer_shipping")}
            field="customer_shipping"
            orderId={row.original.order_item_id}
            order={row.original}
            onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
          />
        );
      },
    },
    {
      id: "quantity",
      accessorKey: "quantity_sold",
      header: "Quantity",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        const isZeroQuantity = status === 'canceled';
        return isZeroQuantity ? (
          <span className="text-muted-foreground">0</span>
        ) : row.getValue("quantity");
      },
    },
    {
      accessorKey: "profit",
      id: "profit",
      header: "Profit",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        
        // DEBUG: Log para verificar os dados
        if (row.original.order_id === '111-0168052-2615441') {
          console.log('DEBUG PROFIT COLUMN:', {
            order_id: row.original.order_id,
            status: status,
            profit_from_db: row.original.profit,
            profit_type: typeof row.original.profit,
            full_order: row.original
          });
        }
        
        if (status === 'canceled') {
          return <span className="text-muted-foreground">$0.00</span>;
        }
        
        // Usar o valor do estado se disponível, senão calcular
        let calculatedProfit = row.original.profit;
        
        if (calculatedProfit === null || calculatedProfit === undefined) {
          // Para refunded, usar a função nova, para outros usar a antiga
          if (status === 'refunded') {
            calculatedProfit = calculateFinancialMetrics(row.original).profit;
          } else {
            calculatedProfit = calculateProfit({
              amazonPrice: row.original.amazon_price,
              amazonFee: row.original.amazon_fee,
              supplierPrice: row.original.supplier_price,
              supplierTax: row.original.supplier_tax,
              supplierShipping: row.original.supplier_shipping,
              customerShipping: row.original.customer_shipping,
              quantitySold: row.original.quantity_sold,
              bundleQty: row.original.bundle_qty
            }).profit;
          }
        } else {
          // Converter string para number se necessário
          calculatedProfit = typeof calculatedProfit === 'string' ? parseFloat(calculatedProfit) : calculatedProfit;
        }
        
        // DEBUG: Log do valor final calculado
        if (row.original.order_id === '111-0168052-2615441') {
          console.log('DEBUG FINAL PROFIT:', calculatedProfit);
        }
        
        // Show negative values in red
        if (calculatedProfit < 0) {
          return <span className="text-red-500">{formatCurrency(calculatedProfit)}</span>;
        }
        
        return formatCurrency(calculatedProfit);
      },
    },
    {
      accessorKey: "margin",
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        
        if (status === 'canceled') {
          return <span className="text-muted-foreground">0%</span>;
        }
        
        // Usar o valor do estado se disponível, senão calcular
        let calculatedMargin = row.original.margin;
        
        if (calculatedMargin === null || calculatedMargin === undefined) {
          // Para refunded, usar a função nova, para outros usar a antiga
          if (status === 'refunded') {
            calculatedMargin = calculateFinancialMetrics(row.original).margin;
          } else {
            calculatedMargin = calculateProfit({
              amazonPrice: row.original.amazon_price,
              amazonFee: row.original.amazon_fee,
              supplierPrice: row.original.supplier_price,
              supplierTax: row.original.supplier_tax,
              supplierShipping: row.original.supplier_shipping,
              customerShipping: row.original.customer_shipping,
              quantitySold: row.original.quantity_sold,
              bundleQty: row.original.bundle_qty
            }).margin;
          }
        } else {
          // Converter string para number se necessário
          calculatedMargin = typeof calculatedMargin === 'string' ? parseFloat(calculatedMargin) : calculatedMargin;
        }
        
        // Garantir que não exibimos NaN
        if (isNaN(calculatedMargin) || !isFinite(calculatedMargin)) {
          return "0%";
        }
        
        return `${calculatedMargin.toFixed(2)}%`;
      },
    },
    {
      accessorKey: "roi",
      id: "roi",
      header: "ROI",
      cell: ({ row }) => {
        const status = row.original.order_status?.toLowerCase() || '';
        
        if (status === 'canceled') {
          return <span className="text-muted-foreground">0%</span>;
        }
        
        // Usar o valor do estado se disponível, senão calcular
        let calculatedRoi = row.original.roi;
        
        if (calculatedRoi === null || calculatedRoi === undefined) {
          // Para refunded, usar a função nova, para outros usar a antiga
          if (status === 'refunded') {
            calculatedRoi = calculateFinancialMetrics(row.original).roi;
          } else {
            calculatedRoi = calculateProfit({
              amazonPrice: row.original.amazon_price,
              amazonFee: row.original.amazon_fee,
              supplierPrice: row.original.supplier_price,
              supplierTax: row.original.supplier_tax,
              supplierShipping: row.original.supplier_shipping,
              customerShipping: row.original.customer_shipping,
              quantitySold: row.original.quantity_sold,
              bundleQty: row.original.bundle_qty
            }).roi;
          }
        } else {
          // Converter string para number se necessário
          calculatedRoi = typeof calculatedRoi === 'string' ? parseFloat(calculatedRoi) : calculatedRoi;
        }
        
        // Garantir que não exibimos NaN
        if (isNaN(calculatedRoi) || !isFinite(calculatedRoi)) {
          return "0%";
        }
        
        return `${calculatedRoi.toFixed(2)}%`;
      },
    },
    {
      accessorKey: "notes",
      id: "notes",
      header: "Notes",
      size: 300,
      cell: ({ row }) => (
        <EditableNotesCell
          value={row.original.notes}
          orderId={row.original.order_item_id}
          onUpdate={(orderId, field, value) => onFieldUpdate(orderId, field, value)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const { toast } = useToast()
        
        const handleTransferToLogistics = async () => {
          if (!row.original) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Invalid order data"
            })
            return
          }

          // Skip if order is canceled
          if (row.original.order_status?.toLowerCase() === 'canceled') {
            toast({
              variant: "destructive", 
              title: "Error",
              description: "Cannot transfer canceled orders to logistics"
            })
            return
          }
          try {
            // Mapear os campos do objeto Order para o formato esperado pela função createLogisticsEntry
            const logisticsEntry = {
              purchase_date: row.original.purchase_date,
              store: row.original.source || 'Unknown',
              supplier_order_id: row.original.supplier_order_id || '',
              asin: row.original.asin,
              quantity_sold: row.original.quantity_sold,
              title: row.original.title,
              order_id: row.original.order_id,
              latest_ship_date: row.original.latest_ship_date,
              order_status: row.original.order_status,
              handling_omd: 'pending', // valor padrão
              dead_line: null,
              supplier_tracking_number: row.original.supplier_tracking_number || '',
              provider: 'Unknown', // valor padrão
              date_time: null,
              current_status: null,
              shipping_status: null,
              delivered_date: null,
              delivery_info: '',
              expected_date: null,
              url_carrier: null,
              origin_city: '',
              destination_city: '',
              notes: row.original.notes,
              ship_estimate: row.original.customer_shipping || 0,
              received_date: null,
              customer_shipping: row.original.customer_shipping
            };

            await createLogisticsEntry(logisticsEntry)
            toast({
              title: "Success",
              description: "Order transferred to logistics successfully"
            })
          } catch (error) {
            let errorMessage = "Failed to transfer order to logistics"
            
            if (axios.isAxiosError(error) && error.response?.data?.message) {
              errorMessage = error.response.data.message
            } else if (error instanceof Error && error.message) {
              errorMessage = error.message
            }
            
            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage
            })
          }
        }
        
        // Função para atualizar os valores financeiros (profit, margin, ROI) no banco de dados
        const handleUpdateFinancials = async () => {
          if (!row.original) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Invalid order data"
            })
            return
          }
          
          try {
            // Calcular os valores financeiros com base no status e outros campos
            const { profit, margin, roi } = calculateFinancialMetrics(row.original)
            
            // Atualizar o banco de dados
            await updateOrder(row.original.order_item_id, { profit, margin, roi })
            
            // Atualizar a UI
            onFieldUpdate(row.original.order_item_id, "profit", profit)
            onFieldUpdate(row.original.order_item_id, "margin", margin)
            onFieldUpdate(row.original.order_item_id, "roi", roi)
            
            toast({
              title: "Success",
              description: "Financial values updated successfully"
            })
          } catch (error) {
            let errorMessage = "Failed to update financial values"
            
            if (axios.isAxiosError(error) && error.response?.data?.message) {
              errorMessage = error.response.data.message
            } else if (error instanceof Error && error.message) {
              errorMessage = error.message
            }
            
            toast({
              variant: "destructive",
              title: "Error",
              description: errorMessage
            })
          }
        }
        
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleUpdateFinancials()
              }}
              title="Update financial values"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleTransferToLogistics()
              }}
              title="Transfer to logistics"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(row.original)
              }}
              title="Delete order"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
    // Order Information Fields
    {
      id: "order_id",
      accessorKey: "order_id",
      header: "Order ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("order_id")}</div>
      ),
    },
    {
      id: "sku",
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("sku")}</div>
      ),
    },
    {
      id: "asin",
      accessorKey: "asin",
      header: "ASIN",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("asin")}</div>
      ),
    },
    {
      id: "fulfillment_channel",
      accessorKey: "fulfillment_channel",
      header: "Fulfillment Channel",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("fulfillment_channel")}</div>
      ),
    },
    {
      id: "latest_ship_date",
      accessorKey: "latest_ship_date",
      header: "Latest Ship Date",
      cell: ({ row }) => {
        const date = row.getValue("latest_ship_date") as string;
        return date ? formatDateTime(date) : "-";
      },
    },
    {
      id: "bundle_qty",
      accessorKey: "bundle_qty",
      header: "Bundle Qty",
      cell: ({ row }) => {
        const qty = row.getValue("bundle_qty") as number;
        return qty || "-";
      },
    },
    {
      id: "source",
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("source") || "-"}</div>
      ),
    },
    // Supplier Tracking Fields
    {
      id: "supplier_order_id",
      accessorKey: "supplier_order_id",
      header: "Supplier Order ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("supplier_order_id") || "-"}</div>
      ),
    },
    {
      id: "supplier_tracking_number",
      accessorKey: "supplier_tracking_number",
      header: "Supplier Tracking",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("supplier_tracking_number") || "-"}</div>
      ),
    },
    // Customer Tracking Fields
    {
      id: "customer_track_id",
      accessorKey: "customer_track_id",
      header: "Customer Track ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("customer_track_id") || "-"}</div>
      ),
    },
    {
      id: "customer_track_status",
      accessorKey: "customer_track_status",
      header: "Customer Track Status",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("customer_track_status") || "-"}</div>
      ),
    },
  ];

  // If no visible columns are specified, return default visible columns
  if (visibleColumns.length === 0) {
    // Default visible columns when none are specified
    const defaultColumns = ["date_status", "product", "amazon_price", "amazon_fee", "quantity", "supplier_price", "supplier_shipping", "customer_shipping", "profit", "margin", "roi", "actions"];
    return allColumns.filter(column => defaultColumns.includes(column.id as string));
  }

  // Filter columns based on visibility
  return allColumns.filter(column => visibleColumns.includes(column.id as string));
}
