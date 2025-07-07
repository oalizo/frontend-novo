import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercent } from '@/lib/formatters';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: number;
  isLoading?: boolean;
  formatter?: (value: number) => string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function KPICard({
  title,
  value,
  icon,
  change,
  isLoading = false,
  formatter = (value) => value.toString(),
  subtitle,
  trend
}: KPICardProps) {
  // Determine trend color and icon
  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-500';
    if (trend === 'down') return 'text-red-500';
    if (change && change > 0) return 'text-emerald-500';
    if (change && change < 0) return 'text-red-500';
    return 'text-slate-500';
  };

  const getTrendIcon = () => {
    if (trend === 'up' || (change && change > 0)) {
      return <TrendingUp className="h-4 w-4 inline mr-1" />;
    }
    if (trend === 'down' || (change && change < 0)) {
      return <TrendingDown className="h-4 w-4 inline mr-1" />;
    }
    return null;
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
        {icon && (
          <div className="h-5 w-5 text-primary">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800">
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            typeof value === 'number' ? formatter(value) : value
          )}
        </div>
        
        {(change !== undefined || subtitle) && (
          <p className={`text-xs mt-1 ${change !== undefined ? getTrendColor() : 'text-slate-500'}`}>
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <>
                {change !== undefined && (
                  <>
                    {getTrendIcon()}
                    {formatPercent(Math.abs(change))}
                    {' vs. previous month'}
                  </>
                )}
                {!change && subtitle && subtitle}
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 