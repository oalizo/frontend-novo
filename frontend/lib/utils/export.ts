import { Order } from "@/lib/api/orders"

export async function exportOrdersToCSV(orders: Order[], filename: string) {
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

  const rows = orders.map(order => [
    order.purchase_date,
    order.order_id,
    order.order_status,
    order.sku,
    order.asin,
    `"${order.title?.replace(/"/g, '""') || ''}"`,
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
    `"${order.notes?.replace(/"/g, '""') || ''}"` 
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}