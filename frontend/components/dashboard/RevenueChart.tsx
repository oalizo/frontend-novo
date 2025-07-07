import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueData {
  date: string;
  revenue: number;
  profit?: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading: boolean;
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-blue-600">
          Revenue: $ {payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        {payload[1] && (
          <p className="text-sm text-emerald-600">
            Profit: $ {payload[1].value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    );
  }

  return null;
};

export default function RevenueChart({ data, isLoading, title = "Revenue Over Time" }: RevenueChartProps) {
  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px] border border-dashed rounded-lg">
            <p className="text-muted-foreground">No data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data to ensure we have profit values, even if zero
  const processedData = data.map(item => ({
    ...item,
    profit: item.profit || 0
  }));

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={processedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                tickLine={false}
                stroke="#E2E8F0"
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => `$${value.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' })}`}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                stroke="#E2E8F0"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `$${value.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' })}`}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                stroke="#E2E8F0"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                iconType="circle"
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
              <Bar 
                yAxisId="left"
                dataKey="revenue" 
                name="Revenue"
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                barSize={30}
                fillOpacity={0.85}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="profit" 
                name="Profit"
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 