"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { deleteLogistics } from "@/lib/api/logistics"
import { AlertTriangle } from "lucide-react"
import type { LogisticsEntry } from "@/lib/api/logistics"

interface DeleteLogisticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: LogisticsEntry[]
  onDelete: () => void
}

export function DeleteLogisticsDialog({
  open,
  onOpenChange,
  entries,
  onDelete,
}: DeleteLogisticsDialogProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!entries.length) return

    setIsDeleting(true)
    try {
      // Delete each entry sequentially
      for (const entry of entries) {
        await deleteLogistics(entry.id)
      }
      
      toast({
        title: "Success",
        description: `${entries.length} ${entries.length > 1 ? 'entries' : 'entry'} deleted successfully`,
      })
      
      onDelete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting entries:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete entries. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle className="text-xl font-semibold">
              Delete {entries.length > 1 ? 'Entries' : 'Entry'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Are you sure you want to delete {entries.length > 1 ? 'these entries' : 'this entry'}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {entries.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-8">
                  <div>
                    <span className="text-muted-foreground">ID:</span>{' '}
                    <span className="font-medium">{entry.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <span className="font-medium capitalize">{entry.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}