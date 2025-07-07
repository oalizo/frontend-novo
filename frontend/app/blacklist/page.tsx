"use client"

import { useState, useEffect, ChangeEvent, useRef, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Ban, Upload, Search, RefreshCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface BlacklistItem {
  id: number
  asin: string
  brand: string
  created_at: string
}

export default function BlacklistPage() {
  const [tab, setTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [amazonStatus, setAmazonStatus] = useState<"connected" | "disconnected" | "checking">("checking")
  const [items, setItems] = useState<BlacklistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [singleAsin, setSingleAsin] = useState("")
  const [singleAsinBrand, setSingleAsinBrand] = useState("")
  const [brandName, setBrandName] = useState("")
  const [referenceAsin, setReferenceAsin] = useState("")
  const [brandProgress, setBrandProgress] = useState<{
    stage: string;
    percentage: number;
    collected: number;
    total: number;
    status: string;
    page: number;
    query: string;
    message: string;
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [progress, setProgress] = useState<{ brand: string; current: number; total: number; percentage: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const eventSourceRef = useRef<EventSource | null>(null)

  // Carregar itens da blacklist com paginação
  const fetchBlacklistItems = async (page = currentPage) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (tab !== "all") params.append("type", tab)
      params.append("page", page.toString())
      params.append("limit", "50")

      const response = await fetch(`http://167.114.223.83:3007/api/blacklist?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch blacklist items")
      
      const data = await response.json()
      
      if (data.success) {
        setItems(data.data)
        setCurrentPage(data.pagination.currentPage)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.totalItems)
      } else {
        // Fallback para formato antigo
        setItems(data)
      }
    } catch (error) {
      console.error("Error fetching blacklist items:", error)
      toast({
        title: "Error",
        description: "Failed to load blacklist items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Verificar status da API Amazon
  const checkAmazonStatus = async () => {
    setAmazonStatus("checking")
    try {
      const response = await fetch("http://167.114.223.83:3007/api/blacklist/amazon/status")
      if (!response.ok) throw new Error("Failed to check Amazon API status")
      
      const data = await response.json()
      setAmazonStatus(data.status)
    } catch (error) {
      console.error("Error checking Amazon API status:", error)
      setAmazonStatus("disconnected")
    }
  }

  // Configurar SSE para atualizações em tempo real
  const setupSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource("http://167.114.223.83:3007/api/blacklist/brand/stream")
    
    eventSource.addEventListener("brand-progress", (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)
      setProcessingStatus(`Processing brand ${data.brand}: ${data.current}/${data.total} (${data.percentage}%)`)
    })
    
    eventSource.addEventListener("brand-complete", (event) => {
      const data = JSON.parse(event.data)
      toast({
        title: "Processing Complete",
        description: `Added ${data.itemsAdded} items for brand ${data.brand}`,
      })
      setProgress(null)
      setProcessingStatus("")
      setIsProcessing(false)
      fetchBlacklistItems()
    })
    
    eventSource.onerror = () => {
      console.error("SSE connection error")
      eventSource.close()
      eventSourceRef.current = null
    }
    
    eventSourceRef.current = eventSource
    
    // Cleanup on unmount
    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }

  // Carregar dados iniciais
  useEffect(() => {
    fetchBlacklistItems()
    checkAmazonStatus()
    const cleanup = setupSSE()
    
    return cleanup
  }, [])

  // Recarregar quando a tab ou searchTerm mudar
  useEffect(() => {
    setCurrentPage(1)
    fetchBlacklistItems(1)
  }, [tab, searchTerm])

  // Recarregar quando a página mudar
  useEffect(() => {
    fetchBlacklistItems(currentPage)
  }, [currentPage])

  // Adicionar ASIN individual
  const handleAddSingleAsin = async () => {
    if (!singleAsin) return
    
    try {
      setIsProcessing(true)
      const response = await fetch("http://167.114.223.83:3007/api/blacklist/asin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asin: singleAsin, brand: singleAsinBrand || undefined }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add ASIN")
      }
      
      const data = await response.json()
      toast({
        title: "Success",
        description: `Added ASIN ${data.asin} to blacklist`,
      })
      
      setSingleAsin("")
      setSingleAsinBrand("")
      fetchBlacklistItems()
    } catch (error) {
      console.error("Error adding ASIN:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add ASIN",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Verificar marca a partir do ASIN de referência
  const handleVerifyBrand = async () => {
    if (!referenceAsin) return
    
    try {
      setIsProcessing(true)
      const response = await fetch("http://167.114.223.83:3007/api/blacklist/asin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asin: referenceAsin }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to verify brand")
      }
      
      const data = await response.json()
      setBrandName(data.brand || "Unknown")
      
      toast({
        title: "Success",
        description: `Brand verified: ${data.brand || "Unknown"}`,
      })
    } catch (error) {
      console.error("Error verifying brand:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify brand",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Adicionar marca (buscar ASINs da marca)
  const handleAddBrand = async () => {
    if (!brandName || !referenceAsin) return
    
    try {
      setIsProcessing(true)
      setBrandProgress({
        stage: "Inicializando...",
        percentage: 0,
        collected: 0,
        total: 0,
        status: "Aguardando...",
        page: 0,
        query: "-",
        message: "Aguardando início do processamento..."
      })
      
      // Fechar conexão SSE anterior se existir
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Criar nova conexão SSE para busca de marca
      const eventSource = new EventSource(
        `http://167.114.223.83:3007/api/blacklist/brand/stream?brand=${encodeURIComponent(brandName)}&referenceAsin=${encodeURIComponent(referenceAsin)}`,
        {
          withCredentials: false
        }
      )
      
      eventSource.onopen = () => {
        console.log("SSE connection opened for brand search")
      }
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'start':
              setBrandProgress(prev => prev ? { ...prev, message: data.message, stage: "Iniciando..." } : null)
              break
            case 'log':
              // Atualizar progresso baseado nos logs
              const consultaMatch = data.message.match(/Consulta (\d+)\/(\d+):/)
              if (consultaMatch) {
                const currentQuery = parseInt(consultaMatch[1])
                const totalQueries = parseInt(consultaMatch[2])
                const percent = Math.min(Math.round((currentQuery / totalQueries) * 100), 100)
                setBrandProgress(prev => prev ? {
                  ...prev,
                  percentage: percent,
                  status: `Consulta ${currentQuery} de ${totalQueries}`,
                  stage: "Buscando",
                  page: currentQuery
                } : null)
              }
              break
            case 'progress':
              if (data.data) {
                setBrandProgress(prev => prev ? {
                  ...prev,
                  query: data.data.query || prev.query,
                  collected: data.data.totalSaved || prev.collected,
                  total: data.data.totalFound || prev.total
                } : null)
              }
              break
            case 'complete':
              eventSource.close()
              setBrandProgress(prev => prev ? {
                ...prev,
                percentage: 100,
                stage: "Concluído",
                status: "Sucesso",
                message: data.message
              } : null)
              
              toast({
                title: "Success",
                description: data.message,
              })
              
              setReferenceAsin("")
              setBrandName("")
              setIsProcessing(false)
              fetchBlacklistItems(1)
              
              // Esconder progresso após 3 segundos
              setTimeout(() => {
                setBrandProgress(null)
              }, 3000)
              break
            case 'error':
              eventSource.close()
              setIsProcessing(false)
              setBrandProgress(null)
              toast({
                title: "Error",
                description: data.message,
                variant: "destructive",
              })
              break
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error)
        console.error("EventSource readyState:", eventSource.readyState)
        console.error("EventSource url:", eventSource.url)
        
        // Só fechar se não for um erro temporário
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close()
          setIsProcessing(false)
          setBrandProgress(null)
          toast({
            title: "Error",
            description: "Connection error during brand search",
            variant: "destructive",
          })
        }
      }
      
      eventSourceRef.current = eventSource
      
    } catch (error) {
      console.error("Error adding brand:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add brand",
        variant: "destructive",
      })
      setIsProcessing(false)
      setBrandProgress(null)
    }
  }

  // Upload de CSV
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      setIsProcessing(true)
      setProcessingStatus(`Uploading file: ${file.name}`)
      
      const response = await fetch("http://167.114.223.83:3007/api/blacklist/csv", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload CSV")
      }
      
      const data = await response.json()
      toast({
        title: "Upload Complete",
        description: data.message,
      })
      
      // Limpar o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      fetchBlacklistItems()
    } catch (error) {
      console.error("Error uploading CSV:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingStatus("")
    }
  }

  // Remover item da blacklist
  const handleRemoveItem = async (id: number, asin: string) => {
    try {
      const response = await fetch(`http://167.114.223.83:3007/api/blacklist/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove item")
      }
      
      toast({
        title: "Success",
        description: `Removed ASIN ${asin} from blacklist`,
      })
      
      fetchBlacklistItems()
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  // Usar os itens diretamente (filtragem é feita no servidor)
  const filteredItems = items

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blacklist Management</h1>
        <div className="flex items-center gap-2">
          <Badge variant={amazonStatus === "connected" ? "outline" : "destructive"} className={amazonStatus === "connected" ? "bg-green-500/20 text-green-500" : ""}>
            Amazon API: {amazonStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            variant="outline" 
            size="icon"
            onClick={checkAmazonStatus}
            disabled={amazonStatus === "checking"}
          >
            <RefreshCcw className={`h-4 w-4 ${amazonStatus === "checking" ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Add ASIN */}
        <Card>
          <CardHeader>
            <CardTitle>Add Single ASIN</CardTitle>
            <CardDescription>Add an individual ASIN to the blacklist</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e: FormEvent) => {
              e.preventDefault()
              handleAddSingleAsin()
            }} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter ASIN" 
                  value={singleAsin} 
                  onChange={(e) => setSingleAsin(e.target.value)}
                  disabled={isProcessing}
                />
                <Input 
                  placeholder="Brand (optional)" 
                  value={singleAsinBrand} 
                  onChange={(e) => setSingleAsinBrand(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <Button type="submit" disabled={isProcessing || !singleAsin} className="w-full">
                <Ban className="mr-2 h-4 w-4" />
                Add to Blacklist
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Brand */}
        <Card>
          <CardHeader>
            <CardTitle>Add Brand</CardTitle>
            <CardDescription>Enter a reference ASIN to find and blacklist all ASINs from that brand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {/* ASIN de Referência */}
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter reference ASIN" 
                  value={referenceAsin} 
                  onChange={(e) => setReferenceAsin(e.target.value)}
                  disabled={isProcessing}
                />
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handleVerifyBrand}
                  disabled={isProcessing || !referenceAsin}
                >
                  Verify
                </Button>
              </div>
              
              {/* Campo da Marca */}
              <div className="flex gap-2">
                <Input 
                  placeholder="Brand will appear after verification" 
                  value={brandName} 
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={true}
                />
                <Button 
                  type="button"
                  onClick={handleAddBrand}
                  disabled={isProcessing || !brandName || !referenceAsin}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Add Brand
                </Button>
              </div>
              
              {/* Progresso da Busca */}
              {brandProgress && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{brandProgress.stage}</span>
                    <span className="text-sm text-muted-foreground">{brandProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5 mb-3">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${brandProgress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Status: {brandProgress.status}</div>
                    <div>Page: {brandProgress.page}</div>
                    <div>Found: {brandProgress.total}</div>
                    <div>Saved: {brandProgress.collected}</div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div className="font-medium">Current Query:</div>
                    <div className="text-muted-foreground">{brandProgress.query}</div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div className="font-medium">Message:</div>
                    <div className="text-muted-foreground">{brandProgress.message}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload CSV */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Upload a CSV file with ASINs to blacklist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  disabled={isProcessing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                File must have an "asin" column. Optional "brand" column is also supported.
              </p>
              {isProcessing && processingStatus && !progress && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {processingStatus}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blacklist Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Blacklist Items</CardTitle>
            <div className="flex gap-2">
              <Input 
                placeholder="Search by ASIN or brand" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => fetchBlacklistItems()}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="all" value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="asin">ASINs</TabsTrigger>
              <TabsTrigger value="brand">Brands</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Loading items...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.asin || "-"}</TableCell>
                      <TableCell>{item.brand || "-"}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveItem(item.id, item.asin)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 