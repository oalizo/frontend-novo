"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api/api-client"

interface InventoryStatusProps {
  asin: string
}

interface InventoryInfo {
  inStock: boolean
  quantity: number
}

// Cache for inventory status to prevent duplicate requests
const inventoryCache = new Map<string, {
  data: InventoryInfo
  timestamp: number
}>()
const CACHE_TTL = 60000 // 1 minute client-side cache
const BATCH_SIZE = 10 // Process ASINs in batches
const pendingChecks = new Set<string>()

export function InventoryStatus({ asin }: InventoryStatusProps) {
  const [inventoryInfo, setInventoryInfo] = useState<InventoryInfo | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const checkInventory = useCallback(async () => {
    if (!asin || pendingChecks.has(asin)) return
    
    // Check client-side cache first
    const cached = inventoryCache.get(asin)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (mounted.current) {
        setInventoryInfo(cached.data)
      }
      return
    }

    pendingChecks.add(asin)

    try {
      const response = await api.get(`/inventory/check/${asin}`)
      const data = response.data
      
      // Update cache
      inventoryCache.set(asin, {
        data,
        timestamp: Date.now()
      })
      if (mounted.current) {
        setInventoryInfo(data)
      }
    } catch (error) {
      console.error('Error checking inventory:', error)
      if (mounted.current) {
        setInventoryInfo(null)
      }
    } finally {
      pendingChecks.delete(asin)
    }
  }, [asin])

  useEffect(() => {
    if (asin) {
      const delay = pendingChecks.size * 100 // Stagger requests
      const timeoutId = setTimeout(checkInventory, delay)
      return () => clearTimeout(timeoutId)
    }
  }, [asin, checkInventory])

  // Only render if we have stock
  if (!inventoryInfo?.inStock) {
    return null
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      className="gap-2 shadow-none hover:bg-transparent border-none p-0"
    >
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <span className="font-medium">{inventoryInfo.quantity}</span>
      <span className="text-muted-foreground">in stock</span>
    </Button>
  )
}