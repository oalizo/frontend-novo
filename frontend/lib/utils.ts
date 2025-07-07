import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '$0.00'
  const number = typeof value === "string" ? parseFloat(value) : Number(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(isNaN(number) ? 0 : number)
}

export function formatDateTime(date: string | Date, includeTime: boolean = true): string {
  if (!date) return ''
  const d = new Date(date)
  
  const dateStr = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  if (!includeTime) return dateStr

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return `${dateStr}\n${timeStr}`
}

export function calculateTotalPrice(values: Partial<Product>): number {
  const fields = [
    values.supplier_price,
    values.supplier_price_shipping,
    values.freight_cost,
    values.customer_price_shipping
  ]
  
  const total = fields.reduce((sum: number, value) => {
    if (value === null || value === undefined) return sum
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value)
    return sum + (isNaN(numValue) ? 0 : numValue)
  }, 0)

  return total
}

// Formatação de valores para o dashboard
export function formatCurrencyDashboard(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatNumberDashboard(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercentDashboard(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}