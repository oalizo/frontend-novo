"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { updateOrder } from "@/lib/api/orders"

interface EditableNotesCellProps {
  value: string | null
  orderId: number
  onUpdate: (orderId: number, field: string, value: string) => void
}

export function EditableNotesCell({ 
  value, 
  orderId,
  onUpdate 
}: EditableNotesCellProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isClickInsideRef = useRef(false)

  const handleSave = async (e?: React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (isProcessing) return
    
    if (editValue === value) {
      setEditing(false)
      return
    }

    setIsProcessing(true)
    
    try {
      // Update UI immediately for better UX
      onUpdate(orderId, 'notes', editValue)
      
      // Then update the backend
      await updateOrder(orderId, { notes: editValue })
      
      setEditing(false)
      setError(null)
      
      toast({
        title: "Success",
        description: "Notes updated successfully"
      })
    } catch (error) {
      console.error('Update error:', error)
      
      // Revert the UI update on error
      onUpdate(orderId, 'notes', value || "")
      
      const message = error instanceof Error 
        ? error.message 
        : 'Failed to update notes. Please try again.'
      
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
    if (!editing && !isClickInsideRef.current) {
      setEditing(true)
    }
    isClickInsideRef.current = false
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
      handleSave()
    }
  }, [handleSave])

  useEffect(() => {
    if (editing) {
      document.addEventListener('mousedown', handleClickOutside)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editing, handleClickOutside])

  if (editing) {
    return (
      <div 
        className="relative min-w-[200px] max-w-[300px]" 
        onClick={(e) => {
          e.stopPropagation()
          isClickInsideRef.current = true
        }}
      >
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSave(e)
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
              setError(null)
              setEditValue(value || "")
            }
          }}
          className={`min-h-[80px] resize-none ${error ? 'border-red-500' : ''}`}
          placeholder="Enter notes here..."
          disabled={isProcessing}
        />
        <div className="text-xs text-muted-foreground mt-1">
          Press Ctrl+Enter (Cmd+Enter on Mac) to save
        </div>
        {isProcessing && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute left-0 top-full mt-1 text-xs text-red-500 z-50 bg-background p-1 rounded shadow-sm">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded min-h-[80px] min-w-[200px] max-w-[300px] whitespace-pre-wrap break-words"
      title={value || "Click to add notes"}
    >
      {value || "Click to add notes"}
    </div>
  )
}