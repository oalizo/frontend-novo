"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InventoryFiltersProps {
  onFiltersChange: (filters: {
    search: string
    status: string
    store: string
  }) => void
  totalItems: number
  filteredItems: number
  pageSize: number
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const INVENTORY_STATUSES = [
  { value: "resealable_amazon", label: "Resealable - Amazon" },
  { value: "resealable_ebay", label: "Resealable - Ebay" },
  { value: "like_new", label: "Like New" },
  { value: "broken_damaged", label: "Broken/Damaged" },
  { value: "return_to_store", label: "Return To Store" }
]

const STORES = [
  { value: "best_buy", label: "Best Buy" },
  { value: "zoro", label: "Zoro" },
  { value: "home_depot", label: "Home Depot" },
  { value: "acme_tools", label: "Acme Tools" },
  { value: "vitacost", label: "Vitacost" },
  { value: "webstaurant", label: "Webstaurant" },
  { value: "bjs", label: "BJs" }
]

export function InventoryFilters({
  onFiltersChange,
  totalItems,
  filteredItems,
  pageSize,
  onPageSizeChange
}: InventoryFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    store: "all"
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange(filters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, onFiltersChange])

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      store: "all"
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== "all"
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search inventory..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {INVENTORY_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.store}
          onValueChange={(value) => setFilters(prev => ({ ...prev, store: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {STORES.map((store) => (
              <SelectItem key={store.value} value={store.value}>
                {store.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredItems === totalItems ? (
          `Total Items: ${totalItems}`
        ) : (
          `Showing ${filteredItems} of ${totalItems} items`
        )}
      </div>
    </div>
  )
}