"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Order, getOrders, updateOrder } from "@/lib/api/orders"
import { getColumns } from "./table-columns"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { DeleteOrderDialog } from "./delete-order-dialog"
import { Trash2 } from "lucide-react"
import { calculateFinancialMetrics } from "@/lib/utils/financial"

interface OrdersTableProps {
  selectedRows: string[]
  setSelectedRows: (rows: string[]) => void
  filters: {
    search: string
    status: string
    dateFrom: string
    dateTo: string
  }
  onDataChange: (total: number, filtered: number, orders: Order[]) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  visibleColumns?: string[]
}

export function OrdersTable({ 
  selectedRows, 
  setSelectedRows, 
  filters,
  onDataChange,
  pageSize,
  onPageSizeChange,
  visibleColumns = []
}: OrdersTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ordersToDelete, setOrdersToDelete] = useState<Order[]>([])
  
  // Referências para armazenar valores anteriores
  const prevFiltersRef = useRef({...filters})
  const prevPageSizeRef = useRef(pageSize)

  // Função para carregar pedidos
  const loadOrders = useCallback(async () => {
    setLoading(true);
    
    try {
      // Verificar se há múltiplos status selecionados
      if (filters.status && typeof filters.status === 'string' && filters.status.includes(',')) {
        const statusArray = filters.status.split(',');
        
        // Fazer uma requisição para cada status e combinar os resultados
        let allOrders: Order[] = [];
        let totalCount = 0;
        
        // Processar cada status individualmente
        for (const status of statusArray) {
          const modifiedFilters = { ...filters, status };
          
          const result = await getOrders({
            page: currentPage,
            size: pageSize,
            ...modifiedFilters
          });
          
          // Adicionar pedidos únicos (evitar duplicatas por order_item_id)
          const newOrders = result.data.filter(
            newOrder => !allOrders.some(
              existingOrder => existingOrder.order_item_id === newOrder.order_item_id
            )
          );
          
          allOrders = [...allOrders, ...newOrders];
          totalCount += result.total;
        }
        
        // Atualizar estado com os resultados combinados
        setData(allOrders);
        setTotalItems(totalCount);
        
        // Notificar componente pai sobre a mudança de dados
        if (onDataChange) {
          onDataChange(totalCount, allOrders.length, allOrders);
        }
        
        setLoading(false);
        return;
      }
      
      // Requisição normal para um único status
      const result = await getOrders({
        page: currentPage,
        size: pageSize,
        ...filters
      });
      
      setData(result.data);
      setTotalItems(result.total);
      
      // Notificar componente pai sobre a mudança de dados
      if (onDataChange) {
        onDataChange(result.total, result.data.length, result.data);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load orders data. Please try again."
      })
      setData([])
      setTotalItems(0)
      onDataChange(0, 0, [])
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters, onDataChange, pageSize, toast])

  // Verificar mudanças nos filtros ou tamanho da página
  useEffect(() => {
    // Verificamos se os filtros ou o pageSize mudaram
    const filtersChanged = 
      prevFiltersRef.current.search !== filters.search ||
      prevFiltersRef.current.status !== filters.status ||
      prevFiltersRef.current.dateFrom !== filters.dateFrom ||
      prevFiltersRef.current.dateTo !== filters.dateTo

    const pageSizeChanged = prevPageSizeRef.current !== pageSize
    
    // Se houve mudança, voltamos para a página 1
    if (filtersChanged || pageSizeChanged) {
      setCurrentPage(1)
      
      // Atualiza os refs
      prevFiltersRef.current = {...filters}
      prevPageSizeRef.current = pageSize
    }
    
    // Carregamos os pedidos
    loadOrders()
  }, [filters, pageSize, loadOrders])

  // Quando a página muda, carregamos os pedidos novamente
  useEffect(() => {
    loadOrders()
  }, [currentPage, loadOrders])

  // Função para lidar com a atualização de um campo
  const handleFieldUpdate = useCallback(async (orderItemId: number, field: string, value: any) => {
    try {
      let updateData: any = { [field]: value };
      
      // Otimisticamente atualiza a UI
      setData(currentData =>
        currentData.map(order => {
          if (order.order_item_id === orderItemId) {
            const updatedOrder = { ...order, [field]: value };
            
            // Sempre recalcula os valores financeiros para qualquer mudança de campo
            const { profit, margin, roi } = calculateFinancialMetrics(updatedOrder);
            
            // Adiciona os valores recalculados aos dados que serão enviados ao backend
            updateData = {
              ...updateData,
              profit,
              margin,
              roi
            };
            
            const newOrderData = {
              ...updatedOrder,
              profit,
              margin,
              roi
            };
            
            return newOrderData;
          }
          return order;
        })
      );
      
      // Envia para backend
      await updateOrder(orderItemId, updateData)
      
      toast({
        title: "Success",
        description: `Order ${field} updated successfully.`
      })
    } catch (error) {
      console.error(`Failed to update order ${field}:`, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update ${field}. Please try again.`
      })
      // Em caso de erro, recarregamos para restaurar o estado correto
      await loadOrders()
    }
  }, [calculateFinancialMetrics, onDataChange, loadOrders, toast])

  // Função para lidar com múltiplas atualizações de uma vez
  const handleBatchUpdate = useCallback((orderItemId: number, updates: Partial<Order>) => {
    setData(currentData =>
      currentData.map(order => {
        if (order.order_item_id === orderItemId) {
          return { ...order, ...updates };
        }
        return order;
      })
    );
  }, [setData]);

  const handleDeleteClick = useCallback((order: Order) => {
    setOrdersToDelete([order])
    setDeleteDialogOpen(true)
  }, [])

  const handleBatchDelete = useCallback(() => {
    const selectedOrders = data.filter(order => selectedRows.includes(order.order_id))
    setOrdersToDelete(selectedOrders)
    setDeleteDialogOpen(true)
  }, [data, selectedRows])

  const rowSelection = Object.fromEntries(
    data.map((row, index) => [
      index,
      selectedRows.includes(row.order_id)
    ])
  )

  const handleSelectionChange = useCallback((updater: any) => {
    if (typeof updater === 'function') {
      const newSelection = updater(rowSelection)
      const selectedIds = Object.entries(newSelection)
        .filter(([_, selected]) => selected)
        .map(([index]) => data[parseInt(index)].order_id)
      setSelectedRows(selectedIds)
    }
  }, [data, rowSelection, setSelectedRows])

  const table = useReactTable({
    data,
    columns: getColumns(handleDeleteClick, handleFieldUpdate, visibleColumns),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: handleSelectionChange,
    state: {
      rowSelection,
    },
    pageCount: Math.ceil(totalItems / pageSize),
    manualPagination: true,
    enableRowSelection: true,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleBatchDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedRows.length})
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loading}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {Math.ceil(totalItems / pageSize)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={currentPage * pageSize >= totalItems || loading}
        >
          Next
        </Button>
      </div>

      <DeleteOrderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        orders={ordersToDelete}
        onDelete={loadOrders}
      />
    </div>
  )
}