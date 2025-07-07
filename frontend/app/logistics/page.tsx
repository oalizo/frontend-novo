"use client"

import { useState, useEffect } from "react"
import { LogisticsTable } from "@/components/logistics/logistics-table"
import { LogisticsFilters } from "@/components/logistics/logistics-filters"
import { LogisticsStats } from "@/components/logistics/logistics-stats"
import { startAutomaticTrackingUpdates } from "@/lib/utils/tracking-updater"

export default function LogisticsPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [filteredEntries, setFilteredEntries] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    store: "all",
    dateFrom: "",
    dateTo: "",
    hasTracking: "all"
  })

  // Start automatic tracking updates when the page loads
  useEffect(() => {
    startAutomaticTrackingUpdates()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Logistics Dashboard</h1>
      
        <LogisticsStats filters={filters} />
      
        <LogisticsFilters 
          onFiltersChange={setFilters}
          totalEntries={totalEntries}
          filteredEntries={filteredEntries}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      
        <LogisticsTable 
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          filters={filters}
          onDataChange={(total, filtered) => {
            setTotalEntries(total)
            setFilteredEntries(filtered)
          }}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}