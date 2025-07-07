'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { type LogisticsEntry } from '@/lib/api/logistics';

export function getAmazonOrderColumn(): ColumnDef<LogisticsEntry> {
  return {
    accessorKey: 'order_id',
    header: 'Amazon Order',
    cell: ({ row }) => (
      <div className="whitespace-nowrap min-w-[180px]">
        {row.getValue('order_id')}
      </div>
    ),
    size: 180,
  };
}
