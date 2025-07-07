'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { type LogisticsEntry } from '@/lib/api/logistics';

export function getQuantitySoldColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: 'quantity_sold',
    id: 'quantity_sold',
    header: 'Qty Sold',
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-center min-w-[80px]">
        {row.getValue('quantity_sold') || 0}
      </div>
    ),
    size: 80, // Ajustado para ser consistente com min-w
  };
}
