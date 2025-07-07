"use client"

import type { Product } from "@/lib/api"

export function calculateTotalPrice(values: {
  supplier_price?: number | null
  supplier_price_shipping?: number | null
  freight_cost?: number | null
  customer_price_shipping?: number | null
}): number {
  const total = Number(values.supplier_price || 0) +
                Number(values.supplier_price_shipping || 0) +
                Number(values.freight_cost || 0) +
                Number(values.customer_price_shipping || 0)
  
  return Number(total.toFixed(2))
}

export function getUpdatedPriceValues(
  row: Product,
  field: keyof Product,
  newValue: number
): {
  supplier_price: number
  supplier_price_shipping: number
  freight_cost: number
  customer_price_shipping: number
} {
  const values = {
    supplier_price: Number(field === 'supplier_price' ? newValue : (row.supplier_price || 0)),
    supplier_price_shipping: Number(field === 'supplier_price_shipping' ? newValue : (row.supplier_price_shipping || 0)),
    freight_cost: Number(field === 'freight_cost' ? newValue : (row.freight_cost || 0)),
    customer_price_shipping: Number(field === 'customer_price_shipping' ? newValue : (row.customer_price_shipping || 0))
  }

  return values
}

export const isPriceField = (field: string): boolean => {
  return ['supplier_price', 'supplier_price_shipping', 'freight_cost', 'customer_price_shipping'].includes(field)
}