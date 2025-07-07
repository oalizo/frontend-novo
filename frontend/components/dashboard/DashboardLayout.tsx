import React, { ReactNode } from 'react';
import { Package, ShoppingCart, BarChart2, DollarSign } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  dateRangeSelector?: ReactNode;
}

export default function DashboardLayout({ 
  children, 
  title = "Dashboard", 
  dateRangeSelector 
}: DashboardLayoutProps) {
  return (
    <div className="flex flex-col space-y-6 p-6 bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
        {dateRangeSelector && (
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            {dateRangeSelector}
          </div>
        )}
      </div>
      
      <div className="grid gap-6">
        {children}
      </div>
    </div>
  );
}

// Component for KPI section
interface KPISectionProps {
  children: ReactNode;
}

export function KPISection({ children }: KPISectionProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

// Component for charts section
interface ChartsSectionProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function ChartsSection({ children, cols = 2 }: ChartsSectionProps) {
  const colsClass = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={`grid gap-6 grid-cols-1 ${colsClass[cols]}`}>
      {children}
    </div>
  );
}

// Component for side by side section (two equal columns)
interface SideBySideSectionProps {
  children: ReactNode;
}

export function SideBySideSection({ children }: SideBySideSectionProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {children}
    </div>
  );
}

// Common icons for KPIs
export const KPI_ICONS = {
  revenue: <DollarSign className="h-4 w-4" />,
  orders: <ShoppingCart className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  analytics: <BarChart2 className="h-4 w-4" />,
}; 