"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Plus } from "lucide-react"
import axios from "axios"
import { createInventoryItem } from "@/lib/api/inventory"

const formSchema = z.object({
  store: z.string().min(1, "Store is required"),
  supplier_order_id: z.string().optional(),
  asin: z.string().min(1, "ASIN is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  title: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  cost_price: z.number().min(0, "Cost price must be non-negative")
})

interface AddInventoryDialogProps {
  onSuccess: () => void
}

export function AddInventoryDialog({ onSuccess }: AddInventoryDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  
  // Dynamic store and status options
  const [stores, setStores] = useState<Array<{id: number, value: string, label: string}>>([
    { id: 1, value: "best_buy", label: "Best Buy" },
    { id: 2, value: "zoro", label: "Zoro" },
    { id: 3, value: "home_depot", label: "Home Depot" },
    { id: 4, value: "acme_tools", label: "Acme Tools" },
    { id: 5, value: "vitacost", label: "Vitacost" },
    { id: 6, value: "webstaurant", label: "Webstaurant" },
    { id: 7, value: "bjs", label: "BJs" }
  ])

  const [statuses, setStatuses] = useState<Array<{id: number, value: string, label: string}>>([
    { id: 1, value: "resealable_amazon", label: "Resealable - Amazon" },
    { id: 2, value: "resealable_ebay", label: "Resealable - Ebay" },
    { id: 3, value: "like_new", label: "Like New" },
    { id: 4, value: "broken_damaged", label: "Broken/Damaged" },
    { id: 5, value: "return_to_store", label: "Return To Store" }
  ])

  // New option inputs
  const [newStore, setNewStore] = useState("")
  const [newStatus, setNewStatus] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      store: "",
      supplier_order_id: "",
      asin: "",
      quantity: 1,
      title: "",
      status: "",
      cost_price: 0
    }
  })

  const addNewStore = () => {
    if (!newStore.trim()) return
    const value = newStore.toLowerCase().replace(/\s+/g, '_')
    const newStoreOption = { 
      id: stores.length + 1,
      value,
      label: newStore.trim()
    }
    setStores([...stores, newStoreOption])
    setNewStore("")
    form.setValue('store', value)
  }

  const addNewStatus = () => {
    if (!newStatus.trim()) return
    const value = newStatus.toLowerCase().replace(/\s+/g, '_')
    const newStatusOption = {
      id: statuses.length + 1,
      value,
      label: newStatus.trim()
    }
    setStatuses([...statuses, newStatusOption])
    setNewStatus("")
    form.setValue('status', value)
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Ensure numeric values are properly formatted
      const formattedValues = {
        ...values,
        quantity: Number(values.quantity),
        cost_price: Number(values.cost_price)
      }
      
      console.log('Submitting inventory item:', formattedValues)
      await createInventoryItem(formattedValues)
      
      toast({
        title: "Success",
        description: "Inventory item added successfully"
      })
      
      form.reset()
      setOpen(false)
      // Force immediate reload
      onSuccess?.()
      // Add small delay to ensure backend has processed the insert
      setTimeout(onSuccess, 100)
    } catch (error) {
      console.error('Error adding inventory item:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error 
          ? error.message 
          : 'Failed to add inventory item. Please try again.'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.value} value={store.value}>
                            {store.label}
                          </SelectItem>
                        ))}
                        <div className="p-2 border-t">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add new store"
                              value={newStore}
                              onChange={(e) => setNewStore(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addNewStore()
                                }
                              }}
                            />
                            <Button 
                              type="button"
                              size="sm"
                              onClick={addNewStore}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Order ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier order ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="asin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ASIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ASIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        value={field.value}
                        placeholder="Enter quantity"
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control} 
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={field.value || ''}
                        placeholder="Enter cost price"
                        onChange={e => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                        <div className="p-2 border-t">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add new status"
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addNewStatus()
                                }
                              }}
                            />
                            <Button 
                              type="button"
                              size="sm"
                              onClick={addNewStatus}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}