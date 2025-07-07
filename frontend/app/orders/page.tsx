"use client"

import { useState, useCallback } from "react"
import { OrdersTable } from "@/components/orders/orders-table"
import { OrdersFilters } from "@/components/orders/orders-filters"
import { OrdersStats } from "@/components/orders/orders-stats"
import { Toaster } from "@/components/ui/toaster"
import type { Order } from "@/lib/api/orders"

export default function OrdersPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [filteredOrders, setFilteredOrders] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [currentOrders, setCurrentOrders] = useState<Order[]>([])
  
  // Initialize with default visible columns - hardcoded to avoid import issues
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "date_status", "product", "amazon_price", "amazon_fee", "quantity", 
    "supplier_price", "supplier_shipping", "customer_shipping", 
    "profit", "margin", "roi", "actions"
  ])
  
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: ""
  })

  // Função para lidar com a mudança de filtros
  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    console.log("Filtros alterados:", newFilters)
    setFilters(newFilters)
  }, [])

  // Função para lidar com a mudança de tamanho da página
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
  }, [])

  // Função para lidar com a mudança de dados
  const handleDataChange = useCallback((total: number, filtered: number, orders: Order[]) => {
    setTotalOrders(total)
    setFilteredOrders(filtered)
    setCurrentOrders(orders)
  }, [])

  // Função para lidar com a mudança de colunas visíveis
  const handleColumnsChange = useCallback((columns: string[]) => {
    setVisibleColumns(columns)
  }, [])

  return (
    <div className="flex flex-col p-6 gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      
      <OrdersStats filters={filters} />
      
      <OrdersFilters 
        onFiltersChange={handleFiltersChange}
        totalOrders={totalOrders}
        filteredOrders={filteredOrders}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        orders={currentOrders}
        onColumnsChange={handleColumnsChange}
      />
      
      <OrdersTable 
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        filters={filters}
        onDataChange={handleDataChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        visibleColumns={visibleColumns}
      />
      
      <Toaster />
    </div>
  )
}