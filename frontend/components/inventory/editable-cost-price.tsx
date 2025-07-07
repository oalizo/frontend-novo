"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface EditableCostPriceProps {
  value: number
  onSave: (value: number) => Promise<void>
}

export function EditableCostPrice({ value, onSave }: EditableCostPriceProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (isProcessing) return
    
    const numValue = parseFloat(editValue)
    if (isNaN(numValue) || numValue === value) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    try {
      await onSave(numValue)
      setEditing(false)
    } catch (error) {
      setEditValue(value.toString())
    } finally {
      setIsProcessing(false)
    }
  }

  if (editing) {
    return (
      <Input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave(e)
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setEditValue(value.toString())
          }
        }}
        className="h-8 w-24"
        min="0"
        step="0.01"
        autoFocus
        disabled={isProcessing}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded"
    >
      {formatCurrency(value)}
    </div>
  )
}