"use client"

import { Button } from "@/components/ui/button"

interface TableFooterProps {
  currentPage: number
  pageCount: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function TableFooter({
  currentPage,
  pageCount,
  pageSize,
  totalItems,
  onPageChange
}: TableFooterProps) {
  return (
    <div className="flex items-center justify-between mt-4 py-4 bg-background border-t">
      <div className="text-sm text-muted-foreground px-4">
        Showing {Math.min(pageSize * (currentPage - 1) + 1, totalItems)} - {Math.min(pageSize * currentPage, totalItems)} of {totalItems} entries
      </div>
      
      <div className="flex items-center gap-2 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {pageCount}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  )
}