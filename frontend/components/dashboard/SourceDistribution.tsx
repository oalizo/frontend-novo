import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

interface DistributionItem {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
  totalSales?: number; // Valor total de vendas para a loja
}

interface SourceDistributionProps {
  data: DistributionItem[];
  isLoading: boolean;
  title?: string;
}

// Distinct colors for stores - using contrasting colors
const COLORS = [
  '#3B82F6', // blue-500 for Home Depot
  '#10B981', // emerald-500 for Messila
  '#F59E0B', // amber-500 for Webstaurantstore
  '#6366F1', // indigo-500 for Zoro
  '#EC4899', // pink-500 for Best Buy
  '#14B8A6', // teal-500
  '#8B5CF6', // violet-500
  '#0EA5E9', // sky-500
  '#22D3EE', // cyan-500
  '#84CC16', // lime-500
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.05 ? (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <p className="text-sm">
          {payload[0].value.toLocaleString('en-US', { 
            style: 'percent', 
            minimumFractionDigits: 1, 
            maximumFractionDigits: 1 
          })}
        </p>
        {payload[0].payload.totalSales && (
          <p className="text-sm font-medium text-slate-700">
            {formatCurrency(payload[0].payload.totalSales)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function SourceDistribution({ data, isLoading, title = "Sales by Store" }: SourceDistributionProps) {
  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
          <div className="flex items-center justify-center h-[300px] border border-dashed rounded-lg">
            <p className="text-muted-foreground">No data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for display - ensure percentages are properly formatted
  const processedData = data.map((item, index) => {
    // Normalize percentage values if they're greater than 1
    let normalizedValue = item.percentage ? item.percentage / 100 : item.value;
    // If the value is still > 1, it's likely not in decimal form yet
    if (normalizedValue > 1) {
      normalizedValue = normalizedValue / 100;
    }
    
    return {
      ...item,
      color: item.color || COLORS[index % COLORS.length],
      // Ensure value is between 0 and 1 for percentage display
      value: normalizedValue
    };
  });

  // Process data for the chart
  const chartData = processedData.map(item => ({
    name: item.name,
    value: item.value,
    color: item.color,
    totalSales: item.totalSales
  }));

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={90}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => <span className="text-sm font-medium text-slate-700">{value}</span>}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ paddingLeft: 20 }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {processedData.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">
                  {(item.value * 100).toFixed(1)}%
                </span>
                {item.totalSales && (
                  <span className="text-sm text-slate-500">
                    {formatCurrency(item.totalSales)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 