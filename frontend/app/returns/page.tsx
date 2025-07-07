"use client"

import { useState } from "react"
import { ReturnsTable } from "@/components/returns/returns-table"
import { ReturnsFilters } from "@/components/returns/returns-filters"
import { ReturnsStats } from "@/components/returns/returns-stats"

export default function ReturnsPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalReturns, setTotalReturns] = useState(0)
  const [filteredReturns, setFilteredReturns] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: ""
  })

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Returns Management</h1>
      
      <ReturnsStats filters={filters} />
      
      <ReturnsFilters 
        onFiltersChange={setFilters}
        totalReturns={totalReturns}
        filteredReturns={filteredReturns}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      
      <ReturnsTable 
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        filters={filters}
        onDataChange={(total, filtered) => {
          setTotalReturns(total)
          setFilteredReturns(filtered)
        }}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}