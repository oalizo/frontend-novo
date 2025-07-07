"use client"

import { Button } from "@/components/ui/button"
import { Archive, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { archiveLogistics } from "@/lib/api/logistics"

interface BatchArchiveButtonProps {
  selectedIds: string[]
  onSuccess: () => void
  onArchiving?: (archiving: boolean) => void
}

export function BatchArchiveButton({ 
  selectedIds, 
  onSuccess,
  onArchiving 
}: BatchArchiveButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const { toast } = useToast()

  const handleArchive = async () => {
    if (isArchiving || !selectedIds.length) return
    
    setIsArchiving(true)
    onArchiving?.(true)
    
    try {
      // Archive items in batches of 10
      const batchSize = 10
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize)
        await Promise.all(batch.map(id => archiveLogistics(Number(id))))
      }
      
      toast({
        title: "Success",
        description: `${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'items'} archived successfully`
      })
      
      onSuccess()
    } catch (error) {
      console.error('Error archiving items:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive selected items"
      })
    } finally {
      setIsArchiving(false)
      onArchiving?.(false)
    }
  }

  if (!selectedIds.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        onClick={handleArchive}
        disabled={isArchiving}
        className="shadow-lg"
      >
        {isArchiving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Archive className="h-4 w-4 mr-2" />
        )}
        Archive Selected ({selectedIds.length})
      </Button>
    </div>
  )
}