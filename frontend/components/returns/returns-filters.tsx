"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, X, Archive } from "lucide-react"
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

interface ReturnsFiltersProps {
  onFiltersChange: (filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }) => void
  totalReturns: number
  filteredReturns: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  isArchived?: boolean
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const RETURN_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In Transit" },
  { value: "received", label: "Received" },
  { value: "refunded", label: "Refunded" },
  { value: "closed", label: "Closed" }
]

export function ReturnsFilters({
  onFiltersChange,
  totalReturns,
  filteredReturns,
  pageSize,
  onPageSizeChange,
  isArchived = false
}: ReturnsFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: ""
  })

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        ...filters,
        dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters, dateRange, onFiltersChange])

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      dateFrom: "",
      dateTo: ""
    })
    setDateRange({ from: undefined, to: undefined })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== "all"
  ) || dateRange.from || dateRange.to

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by Order ID, RMA, ASIN..."
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
            {RETURN_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-[280px] justify-start text-left font-normal ${
                !dateRange.from && !dateRange.to && "text-muted-foreground"
              }`}
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

        <div className="flex items-center gap-2 ml-auto">
          <Link href={isArchived ? "/returns" : "/returns/archived"}>
            <Button variant="outline" size="sm" className="gap-2">
              <Archive className="h-4 w-4" />
              {isArchived ? "View Active Returns" : "View Archived"}
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
        {filteredReturns === totalReturns ? (
          `Total Returns: ${totalReturns}`
        ) : (
          `Showing ${filteredReturns} of ${totalReturns} returns`
        )}
      </div>
    </div>
  )
}