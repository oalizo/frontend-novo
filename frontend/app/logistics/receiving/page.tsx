"use client"

import { useState } from "react"
import { BarcodeScanner } from "@/components/logistics/receiving/barcode-scanner"
import { ReceivingConfirmation } from "@/components/logistics/receiving/receiving-confirmation"
import type { LogisticsEntry } from "@/lib/api/logistics"

export default function LogisticsReceivingPage() {
  const [selectedEntry, setSelectedEntry] = useState<LogisticsEntry | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const handleScan = (entry: LogisticsEntry) => {
    setSelectedEntry(entry)
    setConfirmationOpen(true)
  }

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Logistics Receiving</h1>
      
      <div className="max-w-md">
        <BarcodeScanner onScan={handleScan} />
      </div>

      <ReceivingConfirmation
        entry={selectedEntry}
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
      />
    </div>
  )
}