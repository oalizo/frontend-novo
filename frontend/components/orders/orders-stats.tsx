"use client"

import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useEffect, useState } from "react"
import { getOrderStats, type OrderStats } from "@/lib/api/orders"

interface OrdersStatsProps {
  filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }
}

export function OrdersStats({ filters }: OrdersStatsProps) {
  const [stats, setStats] = useState<OrderStats>({
    total_orders: 0,
    total_amazon_price: 0,
    total_quantity_sold: 0,
    total_profit: 0,
    average_roi: 0,
    average_margin: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadStats() {
      try {
        setLoading(true)
        const data = await getOrderStats(filters)
        if (mounted) {
          setStats({
            total_orders: Number(data.total_orders) || 0,
            total_amazon_price: Number(data.total_amazon_price) || 0,
            total_quantity_sold: Number(data.total_quantity_sold) || 0,
            total_profit: Number(data.total_profit) || 0,
            average_roi: Number(data.average_roi) || 0,
            average_margin: Number(data.average_margin) || 0
          })
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      mounted = false
    }
  }, [filters])

  const formatNumber = (value: number) => {
    return Number.isFinite(value) ? value.toFixed(2) : "0.00"
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-3">
            <div className="h-4 bg-muted/30 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-muted/30 rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Orders</div>
        <div className="text-2xl font-bold">{stats.total_orders.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Total Orders</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Amazon Price</div>
        <div className="text-2xl font-bold">{formatCurrency(stats.total_amazon_price)}</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Total Revenue</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Quantity</div>
        <div className="text-2xl font-bold">{stats.total_quantity_sold.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Items Sold</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Profit</div>
        <div className="text-2xl font-bold">{formatCurrency(stats.total_profit)}</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Total Profit</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">ROI</div>
        <div className="text-2xl font-bold">{formatNumber(stats.average_roi)}%</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Average ROI</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Margin</div>
        <div className="text-2xl font-bold">{formatNumber(stats.average_margin)}%</div>
        <div className="text-xs text-muted-foreground absolute top-3 right-3">Average Margin</div>
      </Card>
    </div>
  )
}