"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
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
import { ORDER_STATUSES, getStatusColor } from "@/lib/constants/order-statuses"
import { cn } from "@/lib/utils"
import { ExportOrdersButton } from "./export-orders-button"
import type { Order } from "@/lib/api/orders"
import { MultiSelect, Option } from "@/components/ui/multi-select"
import { ColumnSelector } from "./column-selector"

interface OrdersFiltersProps {
  onFiltersChange: (filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }) => void
  totalOrders: number
  filteredOrders: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  orders: Order[]
  onColumnsChange?: (visibleColumns: string[]) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500]

export function OrdersFilters({ 
  onFiltersChange, 
  totalOrders, 
  filteredOrders,
  pageSize,
  onPageSizeChange,
  orders,
  onColumnsChange
}: OrdersFiltersProps) {
  // Estados para os filtros
  const [search, setSearch] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  
  // Estado para o date range
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  })

  // Extrair todos os status únicos dos pedidos para o filtro
  const uniqueOrderStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    
    // Adicionar todos os status definidos no ORDER_STATUSES
    ORDER_STATUSES.forEach(status => statusSet.add(status.value));
    
    // Adicionar status dos pedidos que podem não estar na lista padrão
    orders.forEach(order => {
      if (order.order_status) {
        statusSet.add(order.order_status.toLowerCase());
      }
    });
    
    return Array.from(statusSet).sort();
  }, [orders]);

  // Função para atualizar todos os filtros
  const updateFilters = useCallback(() => {
    onFiltersChange({
      search: search,
      status: selectedStatuses.length === 0 ? "all" : selectedStatuses.join(','),
      dateFrom: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
    });
  }, [onFiltersChange, search, selectedStatuses, dateRange]);

  // Aplicar debounce para o campo de busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFilters();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [search, updateFilters]);

  // Atualizar filtros imediatamente quando selectedStatuses ou dateRange mudam
  useEffect(() => {
    updateFilters();
  }, [selectedStatuses, dateRange, updateFilters]);

  // Função para resetar os filtros
  const resetFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setDateRange({ from: undefined, to: undefined });
  }

  const hasActiveFilters =
    search !== "" ||
    selectedStatuses.length > 0 ||
    dateRange.from ||
    dateRange.to;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Query/Filter controls */}
        <div className="flex items-center gap-3">
          {/* 1. Search */}
          <div className="w-[300px]">
            <Input
              placeholder="Search by Title, SKU, ASIN, Order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 2. Select Status */}
          <div className="w-[180px]">
            <MultiSelect
              options={uniqueOrderStatuses.map(statusValue => {
                const statusConfig = ORDER_STATUSES.find(s => s.value === statusValue);
                return {
                  value: statusValue,
                  label: statusConfig?.label || statusValue,
                  color: statusConfig?.color || "bg-gray-200 text-gray-900"
                };
              })}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Select status..."
              badgeClassName="text-xs"
              className="z-50 relative"
            />
          </div>

          {/* 3. Pick a Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, y")
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
        </div>

        {/* Right side: Action controls */}
        <div className="flex items-center gap-3">
          {/* 4. Export Filtered Orders */}
          <ExportOrdersButton 
            orders={orders}
            isFiltered={filteredOrders !== totalOrders}
          />

          {/* 5. Columns */}
          {onColumnsChange && (
            <ColumnSelector
              onColumnsChange={onColumnsChange}
            />
          )}

          {/* 6. View (Rows per page) */}
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters - only show when there are active filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredOrders === totalOrders ? (
          `Total Orders: ${totalOrders}`
        ) : (
          `Showing ${filteredOrders} of ${totalOrders} orders`
        )}
      </div>
    </div>
  )
}