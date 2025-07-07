"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, X, Archive, QrCode, Package2 } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  LOGISTICS_STATUSES, 
  STORES,
  getStatusColor,
  getStoreLabel 
} from "@/lib/constants/logistics-statuses"
import { cn } from "@/lib/utils"

interface LogisticsFiltersProps {
  onFiltersChange: (filters: {
    search: string
    status: string
    store: string
    dateFrom: string
    dateTo: string
    hasTracking: string
  }) => void
  totalEntries: number
  filteredEntries: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  isArchived?: boolean
}

const PAGE_SIZE_OPTIONS = [50, 100, 500]

export function LogisticsFilters({ 
  onFiltersChange, 
  totalEntries, 
  filteredEntries,
  pageSize,
  onPageSizeChange,
  isArchived = false
}: LogisticsFiltersProps) {
  const { toast } = useToast()
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    store: "all",
    dateFrom: "",
    dateTo: "",
    hasTracking: "all"
  })
  const [isSearching, setIsSearching] = useState(false)

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only show search notification if actually searching
      if (filters.search && !isSearching) {
        toast({
          title: "Searching all entries",
          description: "Results include both active and archived entries"
        })
        setIsSearching(true)
      } else if (!filters.search) {
        setIsSearching(false)
      }
      
      onFiltersChange({
        ...filters,
        dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, dateRange, onFiltersChange, isSearching, toast])

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      store: "all",
      dateFrom: "",
      dateTo: "",
      hasTracking: "all"
    })
    setDateRange({ from: undefined, to: undefined })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== "all"
  ) || dateRange.from || dateRange.to

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[150px] max-w-[200px]">
          <Input
            placeholder="Search..."
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
            {LOGISTICS_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-full",
                  status.color
                )}>
                  {status.label}
                </span>
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
              <SelectItem key={store.value} value={store.value}>{store.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.hasTracking}
          onValueChange={(value) => setFilters(prev => ({ ...prev, hasTracking: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tracking Number" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracking</SelectItem>
            <SelectItem value="yes">Has Tracking</SelectItem>
            <SelectItem value="no">No Tracking</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange.from && !dateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                "Pick a date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ 
                from: dateRange.from,
                to: dateRange.to
              }}
              onSelect={(range: any) => setDateRange({
                from: range?.from,
                to: range?.to
              })}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

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
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/logistics/receiving">
            <Button variant="outline" size="sm" className="gap-2">
              <QrCode className="h-4 w-4" />
              Receiving
            </Button>
          </Link>

          <Link href="/inventory">
            <Button variant="outline" size="sm" className="gap-2">
              <Package2 className="h-4 w-4" />
              Inventory
            </Button>
          </Link>

          <Link href={isArchived ? "/logistics" : "/logistics/archived"}>
            <Button variant="outline" size="sm" className="gap-2">
              <Archive className="h-4 w-4" />
              {isArchived ? "View Active Entries" : "View Archived"}
            </Button>
          </Link>
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
        {filteredEntries === totalEntries ? (
          `Total Entries: ${totalEntries}`
        ) : (
          `Showing ${filteredEntries} of ${totalEntries} entries`
        )}
      </div>
    </div>
  )
}