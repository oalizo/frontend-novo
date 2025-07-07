"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Archive, Trash2, RotateCcw } from "lucide-react"
import type { LogisticsEntry } from "@/lib/api/logistics"
import type { TableColumnProps } from "./types"
import { useRouter } from "next/navigation"

export function getActionsColumn({
  onDeleteClick,
  onArchiveClick,
  onRestoreClick,
  isArchived
}: TableColumnProps): ColumnDef<LogisticsEntry> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
          await onArchiveClick(row.original)
        } catch (error) {
          console.error('Error archiving entry:', error)
        }
      }

      const handleRestore = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onRestoreClick) {
          try {
            await onRestoreClick(row.original)
          } catch (error) {
            console.error('Error restoring entry:', error)
          }
        }
      }

      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {isArchived ? (
              onRestoreClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRestore}
                  title="Restore entry"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleArchive}
                title="Archive entry"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteClick(row.original)}
              className="text-destructive hover:text-destructive/90"
              title="Delete entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {row.original.archived_at && (
            <Badge 
              variant="outline" 
              className="bg-muted/50 text-muted-foreground text-xs"
            >
              Archived
            </Badge>
          )}
        </div>
      )
    },
    size: 100
  }
}