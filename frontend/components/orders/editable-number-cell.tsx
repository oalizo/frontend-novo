"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { updateOrder, getCustomerShipping } from "@/lib/api/orders"
import { useToast } from "@/components/ui/use-toast"
import { calculateFinancialMetrics } from "@/lib/utils/financial"
import type { Order } from "@/lib/api/orders"

interface EditableNumberCellProps {
  value: number | null
  field: keyof Order
  orderId: number
  order: Order
  onUpdate: (orderId: number, field: string, value: number) => void
}

export function EditableNumberCell({ 
  value, 
  field, 
  orderId,
  order,
  onUpdate 
}: EditableNumberCellProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const editingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset edit value when value prop changes and not editing
  useEffect(() => {
    if (!editingRef.current) {
      setEditValue(value?.toString() ?? '')
    }
  }, [value])

  // Track editing state
  useEffect(() => {
    editingRef.current = editing
  }, [editing])

  const normalizeNumber = (val: string): string => {
    // Remove any non-numeric characters except period and minus sign
    return val.replace(/[^-\d.]/g, '')
  }

  const validateValue = (value: string): boolean => {
    if (!value.trim()) return true
    const num = parseFloat(value)
    if (isNaN(num)) {
      setError('Please enter a valid number')
      return false
    }
    // Allow negative values for shipping fields
    if (num < 0 && !['supplier_shipping', 'customer_shipping'].includes(field as string)) {
      setError('Value cannot be negative')
      return false
    }
    setError(null)
    return true
  }

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
      
      // Prevent immediate blur after focus
      if (e.type === 'focus') {
        return
      }
      
      // For blur events, add a delay to check if user is still interacting
      if (e.type === 'blur') {
        setTimeout(() => {
          // Don't save if user is still hovering over the field or input has focus
          if (isHovering || inputRef.current === document.activeElement) {
            return
          }
          // Proceed with save
          performSave()
        }, 200) // Increased delay to 200ms
        return
      }
    }
    
    // For Enter key or direct calls, save immediately
    performSave()
  }

  const performSave = async () => {
    if (isProcessing) return

    // Allow empty value
    if (!editValue.trim()) {
      setEditing(false)
      return
    }
    
    if (!validateValue(editValue)) return
    const numValue = parseFloat(editValue)

    if (numValue === (value ?? null)) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    
    try {
      let updates: Partial<Order> = {}

      // If this is supplier_shipping field and customer_shipping hasn't been set yet, fetch it from API
      if (field === 'supplier_shipping' && order.asin && (!order.customer_shipping || order.customer_shipping === 0)) {
        const customerShipping = await getCustomerShipping(order.asin)
        
        // Create updated order object with both new values
        const updatedOrder = { 
          ...order, 
          [field]: numValue,
          customer_shipping: customerShipping
        }

        // Calculate new financial metrics
        const { profit, roi, margin } = calculateFinancialMetrics(updatedOrder)
        
        updates = {
          [field]: numValue,
          customer_shipping: customerShipping,
          profit,
          roi,
          margin
        }

        // Update UI for supplier_shipping field
        onUpdate(orderId, field, numValue)
        onUpdate(orderId, 'customer_shipping', customerShipping)
      } else {
        // Normal field update logic
        const updatedOrder = { 
          ...order, 
          [field]: numValue 
        }

        const { profit, roi, margin } = calculateFinancialMetrics(updatedOrder)
        
        updates = {
          [field]: numValue,
          profit,
          roi,
          margin
        }

        // Update UI for this field
        onUpdate(orderId, field, numValue)
      }

      // Update backend
      await updateOrder(orderId, updates)
      
      setEditing(false)
      setError(null)
      
      toast({
        title: "Success",
        description: "Value updated successfully"
      })
    } catch (error) {
      console.error('Update error:', error)
      
      // Revert the UI update on error
      onUpdate(orderId, field, value || 0)
      
      const message = error instanceof Error 
        ? error.message 
        : 'Failed to update value. Please try again.'
      
      setError(message)
      toast({
        variant: "destructive",
        title: "Error",
        description: message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }

  if (editing) {
    return (
      <div 
        className="relative" 
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Input
          type="number"
          value={editValue}
          onChange={(e) => { 
            const val = normalizeNumber(e.target.value)
            setEditValue(val)
            validateValue(val)
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave(e)
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
              setError(null)
              setEditValue(value?.toString() ?? '')
            }
          }}
          className={`h-8 w-24 ${error ? 'border-red-500' : ''}`}
          autoFocus
          disabled={isProcessing}
          step="0.01"
          ref={inputRef}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        />
        {error && (
          <div className="absolute left-0 top-full mt-1 text-xs text-red-500 z-50 bg-background p-1 rounded shadow-sm">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <span 
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded min-w-[60px] inline-block ${isHovering ? 'bg-accent' : ''}`}
    > 
      {formatCurrency(value ?? 0)}
    </span>
  )
}