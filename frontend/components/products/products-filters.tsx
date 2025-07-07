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
import { getFilterOptions } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface ProductsFiltersProps {
  onFiltersChange: (filters: {
    search: string
    asin: string
    sku2: string
    brand: string
    availability: string
    source: string
  }) => void
  totalProducts: number
  filteredProducts: number
  pageSize: number
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500]

export function ProductsFilters({ 
  onFiltersChange, 
  totalProducts, 
  filteredProducts,
  pageSize,
  onPageSizeChange
}: ProductsFiltersProps) {
  const { toast } = useToast()
  const [filters, setFilters] = useState({
    search: "",
    asin: "",
    sku2: "",
    brand: "",
    availability: "all",
    source: "all"
  })

  const [filterOptions, setFilterOptions] = useState<{
    availabilityOptions: string[]
    sourceOptions: string[]
  }>({
    availabilityOptions: [],
    sourceOptions: []
  })

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const options = await getFilterOptions()
        setFilterOptions(options)
      } catch (error) {
        console.error('Error loading filter options:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load filter options. Please try again."
        })
      }
    }
    loadFilterOptions()
  }, [toast])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange(filters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, onFiltersChange])

  const resetFilters = () => {
    setFilters({
      search: "",
      asin: "",
      sku2: "",
      brand: "",
      availability: "all",
      source: "all"
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
            placeholder="Search across all fields..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <Input
          placeholder="ASIN"
          value={filters.asin}
          onChange={(e) => setFilters(prev => ({ ...prev, asin: e.target.value }))}
          className="w-32"
        />
        <Input
          placeholder="SKU2"
          value={filters.sku2}
          onChange={(e) => setFilters(prev => ({ ...prev, sku2: e.target.value }))}
          className="w-32"
        />
        <Input
          placeholder="Brand"
          value={filters.brand}
          onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
          className="w-32"
        />
        <Select
          value={filters.availability}
          onValueChange={(value) => setFilters(prev => ({ ...prev, availability: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {filterOptions.availabilityOptions.map((option) => (
              <SelectItem key={option} value={option || "none"}>{option || "None"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.source}
          onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {filterOptions.sourceOptions.map((option) => (
              <SelectItem key={option} value={option || "none"}>{option || "None"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
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
        {filteredProducts === totalProducts ? (
          `Total Products: ${totalProducts}`
        ) : (
          `Showing ${filteredProducts} of ${totalProducts} products`
        )}
      </div>
    </div>
  )
}