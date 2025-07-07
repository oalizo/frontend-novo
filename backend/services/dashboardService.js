const db = require('../db');
const logger = require('../utils/logger');
const { format: formatDate, subMonths } = require('date-fns');
const { STORE_COLORS } = require('../utils/constants');

class DashboardService {
  async getDashboardStats({ dateFrom, dateTo }) {
    const client = await db.pool.connect();
    
    try {
      // Get current period stats
      const currentStats = await this._getPeriodStats(client, dateFrom, dateTo);

      // Get previous period stats for comparison
      const prevDateFrom = formatDate(subMonths(new Date(dateFrom), 1), 'yyyy-MM-dd');
      const prevDateTo = formatDate(subMonths(new Date(dateTo), 1), 'yyyy-MM-dd');
      const previousStats = await this._getPeriodStats(client, prevDateFrom, prevDateTo);

      // Get inventory stats
      const inventoryStats = await this._getInventoryStats(client);

      // Calculate percentage changes
      const current = currentStats.rows[0];
      const previous = previousStats.rows[0];
      const inventory = inventoryStats.rows[0];

      return {
        totalRevenue: parseFloat(current.total_revenue) || 0,
        totalOrders: parseInt(current.total_orders) || 0,
        totalProfit: parseFloat(current.total_profit) || 0,
        inventoryItems: parseInt(inventory.total_items) || 0,
        outOfStock: parseInt(inventory.out_of_stock) || 0,
        inTransit: await this._getInTransitCount(client),
        deliveredToday: await this._getDeliveredTodayCount(client),
        returnsPending: await this._getReturnsPendingCount(client),
        revenueChange: this._calculateChange(current.total_revenue, previous.total_revenue),
        ordersChange: this._calculateChange(current.total_orders, previous.total_orders),
        profitChange: this._calculateChange(current.total_profit, previous.total_profit)
      };
    } catch (error) {
      logger.error('Error in getDashboardStats:', error);
      throw new Error('Failed to fetch dashboard stats');
    } finally {
      client.release();
    }
  }

  async getRevenueData({ dateFrom, dateTo }) {
    try {
      const result = await db.query(`
        SELECT 
          DATE(purchase_date) as date,
          SUM(amazon_price) as revenue
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY DATE(purchase_date)
        ORDER BY date ASC
      `, [dateFrom, dateTo]);

      return result.rows.map(row => ({
        date: formatDate(new Date(row.date), 'MMM dd'),
        revenue: parseFloat(row.revenue) || 0
      }));
    } catch (error) {
      logger.error('Error in getRevenueData:', error);
      throw new Error('Failed to fetch revenue data');
    }
  }

  async getStoreBreakdown({ dateFrom, dateTo }) {
    try {
      const result = await db.query(`
        SELECT 
          CASE 
            WHEN source IS NULL THEN 'Unknown'
            WHEN source = '' THEN 'Unknown'
            ELSE source 
          END as store,
          COUNT(*) as order_count,
          ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER() * 100, 1) as percentage
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY 
          CASE 
            WHEN source IS NULL THEN 'Unknown'
            WHEN source = '' THEN 'Unknown'
            ELSE source 
          END
        ORDER BY order_count DESC
      `, [dateFrom, dateTo]);

      return result.rows
        .filter(row => row.order_count > 0)
        .map((row, index) => ({
          name: row.store,
          value: parseFloat(row.percentage) || 0,
          color: this._getStoreColor(row.store, index)
        }));
    } catch (error) {
      logger.error('Error in getStoreBreakdown:', error);
      throw new Error('Failed to fetch store breakdown');
    }
  }

  async getRecentOrders() {
    try {
      const result = await db.query(`
        SELECT 
          order_item_id as id,
          source as store,
          sku,
          asin,
          amazon_price as amount
        FROM orders
        WHERE purchase_date IS NOT NULL
          AND source IS NOT NULL
        ORDER BY purchase_date DESC
        LIMIT 5
      `);

      return result.rows.map(row => ({
        ...row,
        store: row.store || 'unknown',
        amount: parseFloat(row.amount) || 0
      }));
    } catch (error) {
      logger.error('Error in getRecentOrders:', error);
      throw new Error('Failed to fetch recent orders');
    }
  }

  async getOrdersBySource(from, to) {
    try {
      const query = `
        SELECT 
          COALESCE(source, 'UNKNOWN') AS source,
          SUM(COALESCE(amazon_price, 0)) AS total_revenue
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY COALESCE(source, 'UNKNOWN');
      `;

      const result = await db.query(query, [from, to]);

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);

      return result.rows.map((row, index) => ({
        name: row.source,
        value: parseFloat(row.total_revenue),
        percentage: ((row.total_revenue / totalRevenue) * 100).toFixed(1),
        color: this._generateColor(index)
      }));
    } catch (error) {
      logger.error('Error in getOrdersBySource:', error);
      throw error;
    }
  }

  async getProductsBySource() {
    try {
      const query = `
        SELECT 
          COALESCE(source, 'UNKNOWN') AS source,
          COUNT(*) AS total_items,
          ROUND((COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER()) * 100, 1) AS percentage
        FROM produtos
        GROUP BY COALESCE(source, 'UNKNOWN')
        ORDER BY total_items DESC;
      `;

      const result = await db.query(query);

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return result.rows.map((row, index) => ({
        name: row.source,
        value: parseInt(row.total_items, 10),
        percentage: parseFloat(row.percentage),
        color: this._generateColor(index)
      }));
    } catch (error) {
      logger.error('Error in getProductsBySource:', error);
      throw error;
    }
  }

  // Private helper methods
  async _getPeriodStats(client, dateFrom, dateTo) {
    return await client.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN order_status NOT IN ('canceled', 'refunded', 'Canceled') 
          THEN amazon_price * COALESCE(quantity_sold, 1) 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(profit), 0) as total_profit
      FROM orders
      WHERE purchase_date BETWEEN $1 AND $2
    `, [dateFrom, dateTo]);
  }

  async _getInventoryStats(client) {
    return await client.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE quantity = 0 OR quantity IS NULL) as out_of_stock
      FROM produtos
    `);
  }

  async _getInTransitCount(client) {
    const result = await client.query(`
      SELECT COUNT(*) 
      FROM logistics 
      WHERE shipping_status = 'in_transit'
    `);
    return parseInt(result.rows[0].count) || 0;
  }

  async _getDeliveredTodayCount(client) {
    const result = await client.query(`
      SELECT COUNT(*) 
      FROM logistics 
      WHERE shipping_status = 'delivered' 
        AND DATE(delivered_date) = CURRENT_DATE
    `);
    return parseInt(result.rows[0].count) || 0;
  }

  async _getReturnsPendingCount(client) {
    const result = await client.query(`
      SELECT COUNT(*) 
      FROM returns 
      WHERE return_request_status = 'pending'
        AND archived_at IS NULL
    `);
    return parseInt(result.rows[0].count) || 0;
  }

  _calculateChange(current, previous) {
    return previous ? ((current - previous) / previous) * 100 : 0;
  }

  _getStoreColor(store, index) {
    return STORE_COLORS[store] || this._generateColor(index + Object.keys(STORE_COLORS).length);
  }

  _generateColor(index) {
    const hue = 210; // Blue hue
    const saturation = 90;
    const lightness = Math.max(40, 70 - (index * 5));
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

module.exports = new DashboardService();
