"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface EditableFieldProps {
  value: string | number | null
  onSave: (value: string | number) => Promise<void>
  type?: "text" | "number"
  min?: number
  required?: boolean
}

export function EditableField({ 
  value, 
  onSave,
  type = "text",
  min,
  required = false
}: EditableFieldProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value?.toString() || "")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (isProcessing) return
    
    const trimmedValue = editValue.trim()
    if (required && !trimmedValue) {
      setError('This field is required')
      return
    }

    // Validate required fields
    if (required && !editValue.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This field is required"
      })
      return
    }
    
    const finalValue = type === "number" ? Number(trimmedValue) : trimmedValue
    if (finalValue === value) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    setError(null)
    
    try {
      await onSave(finalValue)
      setEditing(false)
    } catch (error) {
      console.error('Error saving value:', error)
      setEditValue(value?.toString() || "")
      const message = error instanceof Error ? error.message : 'Failed to update value'
      setError(message)
      toast({ variant: "destructive", title: "Error", description: message })
      setEditing(true) // Keep editing mode on error
    } finally {
      setIsProcessing(false)
    }
  }

  if (editing) {
    return (
      <div className="relative">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave(e)
            }
            if (e.key === 'Escape') {
              setEditing(false)
              setEditValue(value?.toString() || "")
              setError(null)
            }
          }}
          className={cn(
            "h-8 w-full",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          min={min}
          autoFocus
          disabled={isProcessing} 
          aria-invalid={error ? "true" : "false"}
        />
        {error && (
          <div className="absolute left-0 -bottom-5 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded",
        error && "border-destructive"
      )}
    >
      {value || "Click to edit"}
    </div>
  )
}