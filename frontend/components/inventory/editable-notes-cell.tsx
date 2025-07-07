"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface EditableNotesCellProps {
  value: string | null
  inventoryId: number
  onUpdate: (id: number, value: string) => Promise<void>
}

export function EditableNotesCell({ 
  value, 
  inventoryId,
  onUpdate 
}: EditableNotesCellProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSave = async (e?: React.FocusEvent | React.KeyboardEvent) => {
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
      await onUpdate(inventoryId, editValue)
      setEditing(false)
      toast({
        title: "Success",
        description: "Notes updated successfully"
      })
    } catch (error) {
      console.error('Error updating notes:', error)
      setEditValue(value || "")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update notes"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (editing) {
    return (
      <div className="relative min-w-[200px] max-w-[300px]">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSave(e)
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
              setEditValue(value || "")
            }
          }}
          className="min-h-[80px] resize-none"
          placeholder="Enter notes here..."
          autoFocus
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
      </div>
    )
  }

  return (
    <div 
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded min-h-[80px] min-w-[200px] max-w-[300px] whitespace-pre-wrap break-words"
      title={value || "Click to add notes"}
    >
      {value || "Click to add notes"}
    </div>
  )
}