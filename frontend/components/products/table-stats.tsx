"use client"

import { Button } from "@/components/ui/button"
import { Download, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TableStatsProps {
  totalProducts: number
  filteredProducts: number
  pageSize: number
  onPageSizeChange: (size: number) => void
  selectedRows: string[]
  onExport: () => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function TableStats({
  totalProducts,
  filteredProducts,
  pageSize,
  onPageSizeChange,
  selectedRows,
  onExport
}: TableStatsProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="text-sm text-muted-foreground">
        Total Products: {totalProducts} | Filtered Products: {filteredProducts}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={onExport}
        >
          <Download className="h-4 w-4" />
          Export {selectedRows.length ? 'Selected' : 'All'} to CSV
        </Button>
      </div>
    </div>
  )
}