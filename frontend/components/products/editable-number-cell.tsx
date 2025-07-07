"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { updateProduct } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { calculateTotalPrice, getUpdatedPriceValues, isPriceField } from "@/lib/utils/price"
import type { Product } from "@/lib/api"
import { EditableCellProps } from "./table-types"

// Usando o tipo importado
type EditableNumberCellProps = EditableCellProps & {
  value: number | null
}

export function EditableNumberCell({ 
  value, 
  field, 
  row, 
  onUpdate,
  rowIndex 
}: EditableNumberCellProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(() => (value ?? 0).toString())
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateValue = (value: string): boolean => {
    const num = parseFloat(value)
    if (isNaN(num)) {
      setError('Please enter a valid number')
      return false
    }
    if (num < 0) {
      setError('Value cannot be negative')
      return false
    }
    setError(null)
    return true
  }

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (isProcessing) return
    
    if (!validateValue(editValue)) return

    const numValue = parseFloat(editValue)
    if (numValue === value) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    
    try {
      const updates: Partial<Product> = {
        [field as keyof Product]: numValue
      }

      // Calculate total price only for price-related fields
      if (isPriceField(field as string)) {
        const priceValues = getUpdatedPriceValues(row, field as keyof Product, numValue)
        updates.total_price = calculateTotalPrice(priceValues)
      }

      // Update UI immediately
      onUpdate(rowIndex, field, numValue)
      
      // Then update the backend
      await updateProduct(row.sku2, updates)
      
      setEditing(false)
      setError(null)
      
      toast({
        title: "Success",
        description: "Value updated successfully"
      })
    } catch (error) {
      console.error('Update error:', error)
      
      // Revert the UI update on error
      onUpdate(rowIndex, field, value ?? 0)
      
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
    if (!editing) {
      setEditing(true)
    }
  }

  if (editing) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Input
          type="number"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            validateValue(e.target.value)
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
            }
          }}
          className={`h-8 w-24 ${error ? 'border-red-500' : ''}`}
          autoFocus
          disabled={isProcessing}
          step="0.01"
          min="0"
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
      className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded"
    >
      {formatCurrency(value ?? 0)}
    </span>
  )
}