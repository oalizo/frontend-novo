"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash, Edit2, Plus, TestTube, CheckCircle, XCircle, Loader, Key } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AmazonCredential {
  id: number
  store_id: string
  seller_id: string
  client_id: string
  client_secret: string
  refresh_token: string
  marketplace_id: string
  updated_at: string
}

interface CredentialForm {
  store_id: string
  seller_id: string
  client_id: string
  client_secret: string
  refresh_token: string
  marketplace_id: string
}

const marketplaces = [
  { id: 'ATVPDKIKX0DER', name: 'United States', country: 'US' },
  { id: 'A2EUQ1WTGCTBG2', name: 'Canada', country: 'CA' },
  { id: 'A1AM78C64UM0Y8', name: 'Mexico', country: 'MX' },
  { id: 'A1F83G8C2ARO7P', name: 'United Kingdom', country: 'UK' },
  { id: 'A1PA6795UKMFR9', name: 'Germany', country: 'DE' },
  { id: 'A13V1IB3VIYZZH', name: 'France', country: 'FR' },
  { id: 'APJ6JRA9NG5V4', name: 'Italy', country: 'IT' },
  { id: 'A1RKKUPIHCS9HS', name: 'Spain', country: 'ES' },
  { id: 'A1VC38T7YXB528', name: 'Japan', country: 'JP' },
  { id: 'AAHKV2X7AFYLW', name: 'China', country: 'CN' },
  { id: 'A21TJRUUN4KGV', name: 'India', country: 'IN' },
  { id: 'A39IBJ37TRP1C6', name: 'Australia', country: 'AU' },
]

export function AmazonCredentials() {
  const [credentials, setCredentials] = useState<AmazonCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<AmazonCredential | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [formData, setFormData] = useState<CredentialForm>({
    store_id: "",
    seller_id: "",
    client_id: "",
    client_secret: "",
    refresh_token: "",
    marketplace_id: "ATVPDKIKX0DER" // Default US marketplace
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials`)
      if (!response.ok) throw new Error('Failed to fetch credentials')
      const data = await response.json()
      setCredentials(data)
    } catch (error) {
      console.error('Error fetching credentials:', error)
      toast({
        title: "Error",
        description: "Failed to load Amazon credentials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCredential 
        ? `${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials/${editingCredential.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials`
      
      const method = editingCredential ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save credentials')

      toast({
        title: "Success",
        description: editingCredential ? 'Credentials updated!' : 'Credentials created!',
      })
      setIsDialogOpen(false)
      setEditingCredential(null)
      resetForm()
      fetchCredentials()
    } catch (error) {
      console.error('Error saving credentials:', error)
      toast({
        title: "Error",
        description: "Failed to save credentials",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (credential: AmazonCredential) => {
    try {
      // Fetch complete credential data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials/${credential.id}`)
      if (!response.ok) throw new Error('Failed to fetch credential details')
      
      const fullCredential = await response.json()
      
      setEditingCredential(fullCredential)
      setFormData({
        store_id: fullCredential.store_id || "",
        seller_id: fullCredential.seller_id || "",
        client_id: fullCredential.client_id || "",
        client_secret: fullCredential.client_secret || "",
        refresh_token: fullCredential.refresh_token || "",
        marketplace_id: fullCredential.marketplace_id || "ATVPDKIKX0DER",
      })
      setIsDialogOpen(true)
    } catch (error) {
      console.error('Error fetching credential details:', error)
      toast({
        title: "Error",
        description: "Failed to load credential details",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete credentials')

      toast({
        title: "Success",
        description: "Credentials deleted!",
      })
      fetchCredentials()
    } catch (error) {
      console.error('Error deleting credentials:', error)
      toast({
        title: "Error",
        description: "Failed to delete credentials",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      store_id: "",
      seller_id: "",
      client_id: "",
      client_secret: "",
      refresh_token: "",
      marketplace_id: "ATVPDKIKX0DER"
    })
  }

  const handleOpenDialog = () => {
    resetForm()
    setEditingCredential(null)
    setIsDialogOpen(true)
  }

  const maskSensitiveData = (data: string) => {
    if (!data) return ""
    return data.substring(0, 8) + "..." + data.substring(data.length - 4)
  }

  const getMarketplaceName = (marketplaceId: string) => {
    const marketplaces: Record<string, string> = {
      'ATVPDKIKX0DER': 'US',
      'A2EUQ1WTGCTBG2': 'CA',
      'A1AM78C64UM0Y8': 'MX',
      'A1PA6795UKMFR9': 'DE',
      'A13V1IB3VIYZZH': 'FR',
      'APJ6JRA9NG5V4': 'IT',
      'A1RKKUPIHCS9HS': 'ES',
      'A1F83G8C2ARO7P': 'UK',
      'A21TJRUUN4KGV': 'IN',
      'AAHKV2X7AFYLW': 'CN',
      'A1VC38T7YXB528': 'JP',
      'A39IBJ37TRP1C6': 'AU',
    }
    return marketplaces[marketplaceId] || marketplaceId
  }

  const testCredentials = async () => {
    if (!formData.client_id || !formData.client_secret || !formData.refresh_token || !formData.marketplace_id) {
      toast({
        title: "Error",
        description: "Please fill in all credential fields before testing",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/amazon-credentials/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: formData.client_id,
          client_secret: formData.client_secret,
          refresh_token: formData.refresh_token,
          marketplace_id: formData.marketplace_id
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTestResult({ success: true, message: result.message })
        toast({
          title: "Test Successful",
          description: result.message,
        })
      } else {
        setTestResult({ success: false, message: result.error })
        toast({
          title: "Test Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = 'Failed to test credentials'
      setTestResult({ success: false, message: errorMessage })
      toast({
        title: "Test Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Amazon Selling Partner API Credentials</h2>
          <p className="text-muted-foreground">Manage your Amazon SP-API credentials for order processing</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credentials
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Credentials
          </CardTitle>
          <CardDescription>
            These credentials are used to connect to Amazon's Selling Partner API for automated order processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Amazon credentials configured. Add your first credential to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store ID</TableHead>
                  <TableHead>Seller ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="font-medium">{credential.store_id}</TableCell>
                    <TableCell>{maskSensitiveData(credential.seller_id)}</TableCell>
                    <TableCell>{maskSensitiveData(credential.client_id)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getMarketplaceName(credential.marketplace_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(credential.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(credential)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(credential.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? 'Edit Amazon Credentials' : 'Add Amazon Credentials'}
            </DialogTitle>
            <DialogDescription>
              Enter your Amazon Selling Partner API credentials. These will be securely stored and used for order processing.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_id">Store ID</Label>
                <Input
                  id="store_id"
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  placeholder="e.g., OMD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller_id">Seller ID</Label>
                <Input
                  id="seller_id"
                  value={formData.seller_id}
                  onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                  placeholder="e.g., A1234567890123"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID (LWA App ID)</Label>
              <Input
                id="client_id"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                placeholder="amzn1.application-oa2-client..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret (LWA Client Secret)</Label>
              <Input
                id="client_secret"
                type="password"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                placeholder="Client secret..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refresh_token">Refresh Token</Label>
              <Input
                id="refresh_token"
                type="password"
                value={formData.refresh_token}
                onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                placeholder="Atzr|IwEBIA..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketplace_id">Marketplace ID</Label>
              <select
                id="marketplace_id"
                value={formData.marketplace_id}
                onChange={(e) => setFormData({ ...formData, marketplace_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="ATVPDKIKX0DER">United States (US)</option>
                <option value="A2EUQ1WTGCTBG2">Canada (CA)</option>
                <option value="A1AM78C64UM0Y8">Mexico (MX)</option>
                <option value="A1PA6795UKMFR9">Germany (DE)</option>
                <option value="A13V1IB3VIYZZH">France (FR)</option>
                <option value="APJ6JRA9NG5V4">Italy (IT)</option>
                <option value="A1RKKUPIHCS9HS">Spain (ES)</option>
                <option value="A1F83G8C2ARO7P">United Kingdom (UK)</option>
                <option value="A21TJRUUN4KGV">India (IN)</option>
                <option value="AAHKV2X7AFYLW">China (CN)</option>
                <option value="A1VC38T7YXB528">Japan (JP)</option>
                <option value="A39IBJ37TRP1C6">Australia (AU)</option>
              </select>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Test Credentials</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testCredentials}
                  disabled={isTesting}
                  className="flex items-center gap-2"
                >
                  {isTesting ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                  testResult.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCredential ? 'Update' : 'Save'} Credentials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
