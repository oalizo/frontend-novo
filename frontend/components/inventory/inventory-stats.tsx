"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import axios from 'axios'

interface InventoryStats {
  total_items: number
  resealable_amazon: number
  resealable_ebay: number
  like_new: number
  broken_damaged: number
  return_to_store: number
}

interface InventoryStatsProps {
  filters: {
    search: string
    status: string
    store: string
  }
}

const initialStats: InventoryStats = {
  total_items: 0,
  resealable_amazon: 0,
  resealable_ebay: 0,
  like_new: 0,
  broken_damaged: 0,
  return_to_store: 0
}

export function InventoryStats({ filters }: InventoryStatsProps) {
  const [stats, setStats] = useState<InventoryStats>(initialStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadStats() {
      try {
        setLoading(true)
        const { data } = await axios.get('/api/inventory/stats', { params: filters })
        if (mounted) {
          // Ensure we have valid numbers or default to 0
          setStats({
            total_items: Number(data?.total_items) || 0,
            resealable_amazon: Number(data?.resealable_amazon) || 0,
            resealable_ebay: Number(data?.resealable_ebay) || 0,
            like_new: Number(data?.like_new) || 0,
            broken_damaged: Number(data?.broken_damaged) || 0,
            return_to_store: Number(data?.return_to_store) || 0
          })
        }
      } catch (error) {
        console.error('Error loading stats:', error)
        if (mounted) {
          setStats(initialStats)
        }
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
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Total Items</div>
        <div className="text-2xl font-bold">{stats.total_items}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Resealable - Amazon</div>
        <div className="text-2xl font-bold text-blue-600">{stats.resealable_amazon}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Resealable - Ebay</div>
        <div className="text-2xl font-bold text-purple-600">{stats.resealable_ebay}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Like New</div>
        <div className="text-2xl font-bold text-green-600">{stats.like_new}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Broken/Damaged</div>
        <div className="text-2xl font-bold text-red-600">{stats.broken_damaged}</div>
      </Card>
      
      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Return To Store</div>
        <div className="text-2xl font-bold text-yellow-600">{stats.return_to_store}</div>
      </Card>
    </div>
  )
}