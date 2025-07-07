"use client"

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { subDays, format } from 'date-fns'
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react'

// Store colors for consistent representation
const STORE_COLORS: Record<string, string> = {
  'Home Depot': '#3B82F6',   // blue
  'Messila': '#10B981',      // emerald
  'Webstaurantstore': '#F59E0B', // amber
  'Zoro': '#6366F1',         // indigo
  'Best Buy': '#EC4899',     // pink
  'Amazon': '#8B5CF6',       // violet
  'eBay': '#14B8A6',         // teal
  'Walmart': '#0EA5E9',      // sky
  'Target': '#22D3EE',       // cyan
  'Other': '#64748B',        // slate
};

// Componentes do dashboard
import DateRangeSelector from '@/components/dashboard/DateRangeSelector'
import RevenueChart from '@/components/dashboard/RevenueChart'
import KPICard from '@/components/dashboard/KPICard'
import OrdersTable from '@/components/dashboard/OrdersTable'
import SourceDistribution from '@/components/dashboard/SourceDistribution'
import DashboardLayout, { KPISection, ChartsSection, SideBySideSection, KPI_ICONS } from '@/components/dashboard/DashboardLayout'

// Funções de formatação
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'

// Tipos
interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProfit: number
  inventoryItems: number
  outOfStock: number
  inTransit: number
  deliveredToday: number
  returnsPending: number
  revenueChange: number
  ordersChange: number
  profitChange: number
}

interface DateRange {
  from: Date
  to: Date
}

interface RevenueData {
  date: string
  revenue: number
  profit?: number
}

interface Order {
  id: string
  date?: string | Date
  sku: string
  amount: number
  store: string
  status?: string
  asin?: string
}

interface DistributionItem {
  name: string
  value: number
  percentage?: number
  color?: string
  totalSales?: number
}

export default function DashboardPage() {
  // Estados
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueData[]>([])
  const [storeDistribution, setStoreDistribution] = useState<DistributionItem[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])

  // Função para buscar dados do dashboard
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const apiBaseUrl = 'http://167.114.223.83:3007/api'
      
      // Fetch estatísticas principais
      const statsResponse = await axios.get(`${apiBaseUrl}/dashboard/stats`, {
        params: {
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd')
        }
      })
      setStats(statsResponse.data)

      // Fetch dados de receita
      const revenueResponse = await axios.get(`${apiBaseUrl}/dashboard/revenue`, {
        params: {
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd')
        }
      })
      
      // Processar dados de receita para adicionar lucro
      const revenueData = revenueResponse.data.map((item: any) => ({
        date: item.date,
        revenue: item.revenue,
        profit: item.revenue * 0.25 // Estimativa de lucro para demonstração
      }))
      setRevenue(revenueData)

      // Fetch distribuição por loja
      const storesResponse = await axios.get(`${apiBaseUrl}/dashboard/stores`, {
        params: {
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd')
        }
      })
      
      // Process store distribution data to ensure percentages are correctly formatted
      const storeData = storesResponse.data.map((store: any) => {
        // Normalize percentage if it comes as raw value
        if (store.percentage && store.percentage > 100) {
          store.percentage = store.percentage / 100;
        }
        
        // Calculate total sales based on percentage and total revenue
        const totalSales = statsResponse.data.totalRevenue * (store.percentage > 1 ? store.percentage / 100 : store.percentage);
        
        // Add a unique color for each store based on its name
        return {
          ...store,
          // If percentage is already a decimal (0-1), keep it, otherwise normalize
          percentage: store.percentage > 1 ? store.percentage / 100 : store.percentage,
          color: STORE_COLORS[store.name] || STORE_COLORS['Other'],
          totalSales: totalSales
        };
      });
      
      setStoreDistribution(storeData)

      // Fetch pedidos recentes
      const ordersResponse = await axios.get(`${apiBaseUrl}/dashboard/recent-orders`)
      
      // Adicionar data para cada pedido (para demonstração)
      const ordersWithDates = ordersResponse.data.map((order: any, index: number) => ({
        ...order,
        date: new Date(new Date().setDate(new Date().getDate() - index))
      }))
      setRecentOrders(ordersWithDates)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange]);

  // Efeito para buscar dados quando a data mudar
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, fetchDashboardData]);

  return (
    <DashboardLayout
      title="Dashboard"
      dateRangeSelector={
        <DateRangeSelector
          value={dateRange}
          onRangeChange={setDateRange}
        />
      }
    >
      {/* Seção de KPIs */}
      <KPISection>
        <KPICard
          title="Total Revenue"
          value={stats?.totalRevenue || 0}
          icon={KPI_ICONS.revenue}
          change={stats?.revenueChange}
          isLoading={isLoading}
          formatter={formatCurrency}
        />
        <KPICard
          title="Orders"
          value={stats?.totalOrders || 0}
          icon={KPI_ICONS.orders}
          change={stats?.ordersChange}
          isLoading={isLoading}
          formatter={formatNumber}
        />
        <KPICard
          title="Profit"
          value={stats?.totalProfit || 0}
          icon={KPI_ICONS.revenue}
          change={stats?.profitChange}
          isLoading={isLoading}
          formatter={formatCurrency}
        />
        <KPICard
          title="Inventory"
          value={stats?.inventoryItems || 0}
          icon={KPI_ICONS.inventory}
          subtitle={`${stats?.outOfStock || 0} out of stock products`}
          isLoading={isLoading}
          formatter={formatNumber}
        />
      </KPISection>

      {/* Gráfico de Receita em coluna única */}
      <ChartsSection cols={1}>
        <RevenueChart
          data={revenue}
          isLoading={isLoading}
          title="Revenue and Profit Over Time"
        />
      </ChartsSection>

      {/* Layout de duas colunas para distribuição de vendas e tabela de pedidos */}
      <SideBySideSection>
        <SourceDistribution
          data={storeDistribution}
          isLoading={isLoading}
          title="Sales by Store"
        />
        <OrdersTable
          orders={recentOrders}
          isLoading={isLoading}
          title="Recent Orders"
        />
      </SideBySideSection>
    </DashboardLayout>
  )
}