"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { getReturnsStats, type ReturnsStats } from "@/lib/api/returns"
import { formatCurrency } from "@/lib/utils"

interface ReturnsStatsProps {
  filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }
}

export function ReturnsStats({ filters }: ReturnsStatsProps) {
  const [stats, setStats] = useState<ReturnsStats>({
    total_returns: 0,
    total_refunded: 0,
    total_in_transit: 0,
    total_received: 0,
    total_pending: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadStats() {
      try {
        setLoading(true)
        const data = await getReturnsStats(filters)
        if (mounted) {
          setStats(data)
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

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-3">
            <div className="h-4 bg-muted/30 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-muted/30 rounded animate-pulse"></div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Total Returns</div>
        <div className="text-2xl font-bold">{stats.total_returns}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Refunded</div>
        <div className="text-2xl font-bold text-red-600">{stats.total_refunded}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">In Transit</div>
        <div className="text-2xl font-bold text-blue-600">{stats.total_in_transit}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Received</div>
        <div className="text-2xl font-bold text-green-600">{stats.total_received}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Pending</div>
        <div className="text-2xl font-bold text-yellow-600">{stats.total_pending}</div>
      </Card>
    </div>
  )
}