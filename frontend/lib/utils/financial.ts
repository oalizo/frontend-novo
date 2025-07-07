"use client"

import type { Order } from "@/lib/api/orders"

export function calculateFinancialMetrics(order: Order) {
  // Get base values and ensure they are numbers
  const amazonPrice = Number(order.amazon_price) || 0
  const amazonFee = Number(order.amazon_fee) || 0
  const supplierPrice = Number(order.supplier_price) || 0
  const supplierTax = Number(order.supplier_tax) || 0
  const supplierShipping = Number(order.supplier_shipping) || 0
  const customerShipping = Number(order.customer_shipping) || 0
  const quantitySold = Number(order.quantity_sold) || 1
  
  // Get order status (lowercase for consistent comparison)
  const orderStatus = order.order_status?.toLowerCase() || ''

  // Special case for canceled orders
  if (orderStatus === 'canceled') {
    return { profit: 0, roi: 0, margin: 0 }
  }
  
  // Special case for refunded orders
  // Profit = -(20% do Amazon Fee + Supplier Price + Supplier Shipping + Customer Shipping)
  if (orderStatus === 'refunded') {
    const refundedProfit = -((amazonFee * 0.2) + supplierPrice + supplierShipping + customerShipping)
    
    // For refunded orders, margin is based on amazon_price (revenue)
    const refundedMargin = amazonPrice !== 0 ? (refundedProfit / amazonPrice) * 100 : 0
    
    // For refunded orders, ROI is based on supplier cost
    const supplierCost = (supplierPrice * quantitySold) + (supplierTax * quantitySold) + supplierShipping
    const refundedRoi = supplierCost !== 0 ? (refundedProfit / supplierCost) * 100 : 0
    
    return {
      profit: Math.round(refundedProfit * 100) / 100,
      roi: Math.round(refundedRoi * 100) / 100,
      margin: Math.round(refundedMargin * 100) / 100
    }
  }

  // Regular calculation for other statuses
  // Calculate total revenue (amazon_price - amazon_fee)
  const totalRevenue = amazonPrice - amazonFee
  
  // Calculate total cost
  // supplier_price e supplier_tax são valores unitários, devem ser multiplicados pela quantidade
  // supplier_shipping e customer_shipping são valores totais
  const totalCost = 
    (supplierPrice * quantitySold) + 
    (supplierTax * quantitySold) + 
    supplierShipping + 
    customerShipping

  // Calculate profit
  const profit = totalRevenue - totalCost

  // Calculate margin (as percentage of revenue)
  const margin = totalRevenue !== 0 ? (profit / totalRevenue) * 100 : 0

  // Calculate ROI (as percentage of cost)
  // supplier_price e supplier_tax são valores unitários multiplicados pela quantidade
  // supplier_shipping e customer_shipping são valores totais
  const supplierCost = (supplierPrice * quantitySold) + (supplierTax * quantitySold) + supplierShipping
  const roi = supplierCost !== 0 ? (profit / supplierCost) * 100 : 0

  return {
    profit: Math.round(profit * 100) / 100,
    roi: Math.round(roi * 100) / 100, 
    margin: Math.round(margin * 100) / 100
  }
}