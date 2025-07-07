"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface EditableFieldProps {
  value: string | null
  onSave: (value: string) => Promise<void>
  placeholder?: string
}

export function EditableField({ value, onSave, placeholder = "Click to edit" }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Update editValue when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "")
    }
  }, [value, isEditing])
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleSave()
      }
    }

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEditing, editValue])

  const handleSave = async () => {
    if (!isEditing) return
    
    // Preserve exact value without converting to number
    const finalValue = editValue.trim()
    
    if (finalValue === "") {
      setIsEditing(false)
      setEditValue(value || "")
      return
    }

    if (finalValue === value) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      // Pass value directly without any conversion
      await onSave(finalValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating value:', error)
      setEditValue(value || "")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update value. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Preserve exact input value
    const newValue = e.target.value
    setEditValue(newValue)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text" 
          ref={inputRef}
          value={editValue}
          onChange={handleChange}
          className="h-7 w-[200px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave()
            } else if (e.key === "Escape") {
              setIsEditing(false)
              setEditValue(value || "")
            }
          }}
          autoFocus
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    )
  }

  return (
    <Button
      variant="link"
      className="h-auto p-0 text-sm"
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
    </Button>
  )
}