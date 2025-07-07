"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Settings2, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
  category?: string;
}

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
  // Date & Status
  { id: "date_status", label: "Date & Status", defaultVisible: true, category: "Basic" },
  { id: "product", label: "Product", defaultVisible: true, category: "Basic" },
  
  // Amazon Fields
  { id: "amazon_price", label: "Amazon Price", defaultVisible: true, category: "Amazon" },
  { id: "amazon_fee", label: "Amazon Fee", defaultVisible: true, category: "Amazon" },
  { id: "quantity", label: "Quantity", defaultVisible: true, category: "Amazon" },
  
  // Supplier Fields
  { id: "supplier_price", label: "Supplier Price", defaultVisible: true, category: "Supplier" },
  { id: "supplier_tax", label: "Supplier Tax", defaultVisible: false, category: "Supplier" },
  { id: "supplier_shipping", label: "Supplier Shipping", defaultVisible: true, category: "Supplier" },
  { id: "supplier_order_id", label: "Supplier Order ID", defaultVisible: false, category: "Supplier" },
  { id: "supplier_tracking_number", label: "Supplier Tracking", defaultVisible: false, category: "Supplier" },
  
  // Customer Fields
  { id: "customer_shipping", label: "Customer Shipping", defaultVisible: true, category: "Customer" },
  { id: "customer_track_id", label: "Customer Track ID", defaultVisible: false, category: "Customer" },
  { id: "customer_track_status", label: "Customer Track Status", defaultVisible: false, category: "Customer" },
  
  // Financial Metrics
  { id: "profit", label: "Profit", defaultVisible: true, category: "Financial" },
  { id: "margin", label: "Margin", defaultVisible: true, category: "Financial" },
  { id: "roi", label: "ROI", defaultVisible: true, category: "Financial" },
  
  // Order Information
  { id: "order_id", label: "Order ID", defaultVisible: false, category: "Order Info" },
  { id: "sku", label: "SKU", defaultVisible: false, category: "Order Info" },
  { id: "asin", label: "ASIN", defaultVisible: false, category: "Order Info" },
  { id: "fulfillment_channel", label: "Fulfillment Channel", defaultVisible: false, category: "Order Info" },
  { id: "latest_ship_date", label: "Latest Ship Date", defaultVisible: false, category: "Order Info" },
  { id: "bundle_qty", label: "Bundle Qty", defaultVisible: false, category: "Order Info" },
  { id: "source", label: "Source", defaultVisible: false, category: "Order Info" },
  
  // Additional Fields
  { id: "notes", label: "Notes", defaultVisible: false, category: "Additional" },
  { id: "actions", label: "Actions", defaultVisible: true, category: "Additional" },
];

interface ColumnSelectorProps {
  onColumnsChange: (visibleColumns: string[]) => void;
  className?: string;
}

export function ColumnSelector({ onColumnsChange, className }: ColumnSelectorProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('orders-visible-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVisibleColumns(parsed);
        onColumnsChange(parsed);
      } catch {
        // If parsing fails, use defaults
        const defaults = AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.id);
        setVisibleColumns(defaults);
        onColumnsChange(defaults);
      }
    } else {
      // Use default visible columns
      const defaults = AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.id);
      setVisibleColumns(defaults);
      onColumnsChange(defaults);
    }
  }, [onColumnsChange]);

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    const newVisibleColumns = checked 
      ? [...visibleColumns, columnId]
      : visibleColumns.filter(id => id !== columnId);
    
    setVisibleColumns(newVisibleColumns);
    onColumnsChange(newVisibleColumns);
    
    // Save to localStorage
    localStorage.setItem('orders-visible-columns', JSON.stringify(newVisibleColumns));
  };

  const resetToDefault = () => {
    const defaults = AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.id);
    setVisibleColumns(defaults);
    onColumnsChange(defaults);
    localStorage.setItem('orders-visible-columns', JSON.stringify(defaults));
  };

  // Group columns by category
  const groupedColumns = AVAILABLE_COLUMNS.reduce((acc, column) => {
    const category = column.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(column);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings2 className="h-4 w-4 mr-2" />
          Columns ({visibleColumns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="h-auto p-1"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          <div className="space-y-4 p-2">
            {Object.entries(groupedColumns).map(([category, columns]) => (
              <div key={category}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {category}
                </div>
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={(checked) => 
                          handleColumnToggle(column.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={column.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {visibleColumns.length} of {AVAILABLE_COLUMNS.length} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
