"use client"

import { useState } from "react"
import { ProductsTable } from "@/components/products/products-table"
import { ProductsFilters } from "@/components/products/products-filters"
import { Toaster } from "@/components/ui/toaster"

export default function ProductsPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [filteredProducts, setFilteredProducts] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState({
    search: "",
    asin: "",
    sku2: "",
    brand: "",
    availability: "all",
    source: "all"
  })

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      
      <ProductsFilters 
        onFiltersChange={setFilters}
        totalProducts={totalProducts}
        filteredProducts={filteredProducts}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      
      <ProductsTable 
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        filters={filters}
        onDataChange={(total, filtered) => {
          setTotalProducts(total)
          setFilteredProducts(filtered)
        }}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      
      <Toaster />
    </div>
  )
}