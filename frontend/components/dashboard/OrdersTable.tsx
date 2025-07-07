import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface Order {
  id: string;
  date?: string | Date;
  sku: string;
  amount: number;
  store: string;
  status?: string;
  asin?: string;
}

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  title?: string;
}

export default function OrdersTable({ orders, isLoading, title = "Recent Orders" }: OrdersTableProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '—';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'MM/dd/yyyy', { locale: enUS });
    } catch (error) {
      return '—';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap: Record<string, { color: string, label: string }> = {
      'shipped': { color: 'bg-blue-100 text-blue-600', label: 'Shipped' },
      'delivered': { color: 'bg-emerald-100 text-emerald-600', label: 'Delivered' },
      'processing': { color: 'bg-amber-100 text-amber-600', label: 'Processing' },
      'cancelled': { color: 'bg-red-100 text-red-600', label: 'Cancelled' },
      'pending': { color: 'bg-slate-100 text-slate-600', label: 'Pending' },
    };

    const statusInfo = statusMap[status.toLowerCase()] || { color: 'bg-slate-100 text-slate-600', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            No orders found for the selected period
          </div>
        ) : (
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[100px] text-slate-700">Date</TableHead>
                  <TableHead className="text-slate-700">ID</TableHead>
                  <TableHead className="text-slate-700">SKU</TableHead>
                  <TableHead className="text-right text-slate-700">Amount</TableHead>
                  <TableHead className="text-right text-slate-700">Store</TableHead>
                  {orders.some(order => order.status) && (
                    <TableHead className="text-right text-slate-700">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order.id || index} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-700">{formatDate(order.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-700">{order.id}</div>
                      {order.asin && (
                        <div className="text-xs text-slate-500 mt-1">
                          ASIN: {order.asin}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{order.sku}</TableCell>
                    <TableCell className="text-right font-medium text-slate-700">{formatCurrency(order.amount)}</TableCell>
                    <TableCell className="text-right text-slate-600">{order.store || 'Unknown'}</TableCell>
                    {orders.some(order => order.status) && (
                      <TableCell className="text-right">
                        {getStatusBadge(order.status)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 