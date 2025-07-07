"use client"

import { useState } from "react"
import { LogisticsTable } from "@/components/logistics/logistics-table"
import { LogisticsFilters } from "@/components/logistics/logistics-filters"
import { LogisticsStats } from "@/components/logistics/logistics-stats"

export default function ArchivedLogisticsPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [filteredEntries, setFilteredEntries] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    store: "all",
    dateFrom: "",
    dateTo: ""
  })

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Archived Logistics</h1>
      
      <LogisticsStats filters={filters} />
      
      <LogisticsFilters 
        onFiltersChange={setFilters}
        totalEntries={totalEntries}
        filteredEntries={filteredEntries}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        isArchived={true}
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
        isArchived={true}
      />
    </div>
  )
}