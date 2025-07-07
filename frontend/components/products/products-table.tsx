"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Product, getProducts } from "@/lib/api"
import { getColumns } from "./table-columns"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { DeleteProductDialog } from "./delete-product-dialog"
import { calculateTotalPrice, getUpdatedPriceValues, isPriceField } from "@/lib/utils/price"
import { Trash2, RefreshCw } from "lucide-react"

// Definição temporária da função refreshProduct até que o TypeScript reconheça a exportação
const refreshProduct = async (product: Product): Promise<{ 
  success: boolean; 
  message: string; 
  product?: Product;
  amazonUpdate?: { success: boolean; message: string; data?: any };
}> => {
  try {
    // Usar o servidor local em desenvolvimento ou a URL de produção
    const isDev = process.env.NODE_ENV === 'development';
    const baseURL = isDev 
      ? 'http://localhost:3007/api'
      : (process.env.NEXT_PUBLIC_API_URL || 'http://167.114.223.83:3007/api');
    const response = await fetch(`${baseURL}/produtos/${product.sku}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      console.error(`Error refreshing product: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to refresh product: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error refreshing product:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to refresh product')
  }
}

interface ProductsTableProps {
  selectedRows: string[]
  setSelectedRows: (rows: string[]) => void
  filters: {
    search: string
    asin: string
    sku2: string
    brand: string
    availability: string
    source: string
  }
  onDataChange: (total: number, filtered: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function ProductsTable({ 
  selectedRows, 
  setSelectedRows, 
  filters,
  onDataChange,
  pageSize,
  onPageSizeChange
}: ProductsTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productsToDelete, setProductsToDelete] = useState<Product[]>([])
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getProducts({
        page: currentPage,
        size: pageSize,
        ...filters
      })
      
      if (response?.data) {
        setData(response.data)
        setTotalItems(response.total)
        onDataChange(response.total, response.data.length)
      } else {
        setData([])
        setTotalItems(0)
        onDataChange(0, 0)
      }
    } catch (error) {
      console.error("Failed to load products:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products. Please try again."
      })
      setData([])
      setTotalItems(0)
      onDataChange(0, 0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, filters, onDataChange, toast])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, pageSize])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleDeleteClick = useCallback((product: Product) => {
    setProductsToDelete([product])
    setDeleteDialogOpen(true)
  }, [])
  
  const handleRefreshClick = useCallback(async (product: Product) => {
    try {
      setRefreshing(product.sku2)
      toast({
        title: "Refreshing product",
        description: `Updating ${product.sku} from ${product.source}...`,
      })
      
      const result = await refreshProduct(product)
      
      if (result.success) {
        // Verificar se houve atualização na Amazon
        const amazonUpdated = result.amazonUpdate && result.amazonUpdate.success;
        
        toast({
          title: "Produto atualizado",
          description: amazonUpdated
            ? `Dados do produto atualizados com sucesso da ${product.source} e inventário da Amazon atualizado.`
            : `Dados do produto atualizados com sucesso da ${product.source}.`,
        })
        loadProducts()
      } else {
        // Verificar se a mensagem de erro contém informações sobre produto não encontrado
        if (result.message.includes('not found') || result.message.includes('não encontrado')) {
          toast({
            variant: "destructive",
            title: `Produto não encontrado`,
            description: `Não foi possível encontrar este produto na ${product.source}. O produto pode ter sido descontinuado ou o SKU pode ter mudado.`,
          })
        } else {
          toast({
            variant: "destructive",
            title: "Erro na atualização",
            description: "Não foi possível atualizar este produto. Por favor, tente novamente mais tarde.",
          })
        }
      }
    } catch (error) {
      console.error("Error refreshing product:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh product"
      
      // Verificar se a mensagem de erro contém informações sobre produto não encontrado
      if (errorMessage.includes('not found') || errorMessage.includes('não encontrado')) {
        toast({
          variant: "destructive",
          title: `Produto não encontrado`,
          description: `Não foi possível encontrar este produto na ${product.source}. O produto pode ter sido descontinuado ou o SKU pode ter mudado.`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erro na atualização",
          description: "Não foi possível atualizar este produto. Por favor, tente novamente mais tarde.",
        })
      }
    } finally {
      setRefreshing(null)
    }
  }, [toast, loadProducts])

  const handleBatchDelete = useCallback(() => {
    const selectedProducts = data.filter(product => selectedRows.includes(product.sku2))
    setProductsToDelete(selectedProducts)
    setDeleteDialogOpen(true)
  }, [data, selectedRows])

  const updateData = useCallback((rowIndex: number, field: string, value: number) => {
    setData(prevData => 
      prevData.map((row, index) => {
        if (index === rowIndex) {
          const updatedRow = { ...row, [field]: value }
          
          if (isPriceField(field)) {
            const priceValues = getUpdatedPriceValues(row, field as keyof Product, value)
            updatedRow.total_price = calculateTotalPrice(priceValues)
          }
          
          return updatedRow
        }
        return row
      })
    )
  }, [])

  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {}
    data.forEach((row, index) => {
      selection[index] = selectedRows.includes(row.sku2)
    })
    return selection
  }, [data, selectedRows])

  const handleSelectionChange = useCallback((updater: any) => {
    if (typeof updater === 'function') {
      const newSelection = updater(rowSelection)
      const selectedIds = Object.entries(newSelection)
        .filter(([_, selected]) => selected)
        .map(([index]) => data[parseInt(index)].sku2)
      setSelectedRows(selectedIds)
    }
  }, [data, rowSelection, setSelectedRows])

  const table = useReactTable({
    data,
    columns: getColumns(handleDeleteClick, handleRefreshClick),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: handleSelectionChange,
    state: {
      rowSelection,
    },
    pageCount: Math.ceil(totalItems / pageSize),
    manualPagination: true,
    enableRowSelection: true,
    meta: {
      updateData,
      refreshing
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      {selectedRows.length > 1 && (
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
                  className="transition-colors"
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

      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        products={productsToDelete}
        onDelete={loadProducts}
      />
    </div>
  )
}