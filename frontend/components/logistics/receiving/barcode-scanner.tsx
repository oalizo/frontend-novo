"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { getLogistics } from "@/lib/api/logistics"
import { Loader2 } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (entry: any) => void
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const { toast } = useToast()
  const [manualInput, setManualInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const processTrackingNumber = async (trackingNumber: string) => {
    setIsLoading(true)
    try {
      const response = await getLogistics({
        search: trackingNumber,
        size: 1
      })

      if (response.data.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No logistics entry found for this tracking number"
        })
        return
      }

      onScan(response.data[0])
    } catch (error) {
      console.error("Error fetching logistics entry:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch logistics entry"
      })
    } finally {
      setIsLoading(false)
      setManualInput("")
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    await processTrackingNumber(manualInput)
  }

  return (
    <Card className="p-6 bg-card">
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Enter tracking number"
          className="bg-background text-foreground"
          disabled={isLoading}
          autoFocus
        />
        <Button type="submit" disabled={isLoading || !manualInput}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </Card>
  )
}