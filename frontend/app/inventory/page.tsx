"use client"

import { useState } from "react"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { InventoryFilters } from "@/components/inventory/inventory-filters"
import { AddInventoryDialog } from "@/components/inventory/add-inventory-dialog"

export default function InventoryPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [filteredItems, setFilteredItems] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    store: "all"
  })

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
      
      <div className="flex justify-between items-center">
        <AddInventoryDialog onSuccess={() => {
          // Refresh data after adding new item
          setTotalItems(0)
          setFilteredItems(0)
        }} />
      </div>
      
      <InventoryFilters 
        onFiltersChange={setFilters}
        totalItems={totalItems}
        filteredItems={filteredItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      
      <InventoryTable 
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        filters={filters}
        onDataChange={(total, filtered) => {
          setTotalItems(total)
          setFilteredItems(filtered)
        }}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}