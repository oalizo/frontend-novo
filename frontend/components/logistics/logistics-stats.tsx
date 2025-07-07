"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { getLogisticsStats, type LogisticsStats } from "@/lib/api/logistics"

interface LogisticsStatsProps {
  filters: {
    search: string
    status: string
    store: string
    dateFrom: string
    dateTo: string
  }
}

export function LogisticsStats({ filters }: LogisticsStatsProps) {
  const [stats, setStats] = useState<LogisticsStats>({
    total_entries: 0,
    delivered_count: 0,
    in_transit_count: 0,
    pending_count: 0,
    delayed_count: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadStats() {
      try {
        setLoading(true)
        const data = await getLogisticsStats(filters)
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
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Total Entries</div>
        <div className="text-2xl font-bold">{stats.total_entries.toLocaleString()}</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Delivered</div>
        <div className="text-2xl font-bold text-green-600">{stats.delivered_count.toLocaleString()}</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">In Transit</div>
        <div className="text-2xl font-bold text-blue-600">{stats.in_transit_count.toLocaleString()}</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Pending</div>
        <div className="text-2xl font-bold text-yellow-600">{stats.pending_count.toLocaleString()}</div>
      </Card>
      
      <Card className="p-3 relative">
        <div className="text-sm font-medium mb-2">Delayed</div>
        <div className="text-2xl font-bold text-red-600">{stats.delayed_count.toLocaleString()}</div>
      </Card>
    </div>
  )
}