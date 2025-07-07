const db = require('../db');
const logger = require('../utils/logger');
const { format: formatDate, subMonths } = require('date-fns');
const trackingService = require('./trackingService');

class OrderService {
  async getOrders({ page = 1, size = 50, search = '', status = 'all', dateFrom, dateTo }) {
    try {
      const offset = (page - 1) * size;
      let query = `
        SELECT 
          o.*,
          COALESCE(o.amazon_price, 0) - 
          COALESCE(o.amazon_fee, 0) - 
          COALESCE(o.supplier_price, 0) - 
          COALESCE(o.supplier_tax, 0) - 
          COALESCE(o.supplier_shipping, 0) - 
          COALESCE(o.customer_shipping, 0) as profit,
          CASE 
            WHEN COALESCE(o.amazon_price, 0) != 0 THEN 
              ROUND(((COALESCE(o.amazon_price, 0) - 
                      COALESCE(o.amazon_fee, 0) - 
                      COALESCE(o.supplier_price, 0) - 
                      COALESCE(o.supplier_tax, 0) - 
                      COALESCE(o.supplier_shipping, 0) - 
                      COALESCE(o.customer_shipping, 0)) / COALESCE(o.amazon_price, 0)) * 100, 2)
            ELSE 0
          END as margin,
          CASE 
            WHEN (COALESCE(o.supplier_price, 0) + 
                  COALESCE(o.supplier_tax, 0) + 
                  COALESCE(o.supplier_shipping, 0) + 
                  COALESCE(o.customer_shipping, 0)) != 0 THEN
              ROUND(((COALESCE(o.amazon_price, 0) - 
                      COALESCE(o.amazon_fee, 0) - 
                      COALESCE(o.supplier_price, 0) - 
                      COALESCE(o.supplier_tax, 0) - 
                      COALESCE(o.supplier_shipping, 0) - 
                      COALESCE(o.customer_shipping, 0)) / 
                    (COALESCE(o.supplier_price, 0) + 
                     COALESCE(o.supplier_tax, 0) + 
                     COALESCE(o.supplier_shipping, 0) + 
                     COALESCE(o.customer_shipping, 0))) * 100, 2)
            ELSE 0
          END as roi
        FROM orders o
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(o.order_id) LIKE $${paramCount} OR 
          LOWER(o.sku) LIKE $${paramCount} OR 
          LOWER(o.asin) LIKE $${paramCount} OR
          LOWER(o.title) LIKE $${paramCount} OR
          LOWER(o.supplier_order_id) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status.toLowerCase());
        query += ` AND LOWER(o.order_status) = $${paramCount}`;
        paramCount++;
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND DATE(o.purchase_date) >= DATE($${paramCount})`;
        paramCount++;
      }
      
      if (dateTo) {
        params.push(dateTo);
        query += ` AND DATE(o.purchase_date) <= DATE($${paramCount})`;
        paramCount++;
      }

      const countQuery = `SELECT COUNT(*) FROM orders o WHERE 1=1${query.split('WHERE 1=1')[1]}`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      query += ` ORDER BY o.purchase_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await db.query(query, params);

      return {
        message: "success",
        data: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error in getOrders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  async getOrderStats({ search, status, dateFrom, dateTo }) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(COALESCE(amazon_price, 0)) as total_amazon_price,
          SUM(COALESCE(quantity_sold, 0)) as total_quantity_sold,
          SUM(
            COALESCE(amazon_price, 0) - 
            COALESCE(amazon_fee, 0) - 
            COALESCE(supplier_price, 0) - 
            COALESCE(supplier_tax, 0) - 
            COALESCE(supplier_shipping, 0) - 
            COALESCE(customer_shipping, 0)
          ) as total_profit,
          AVG(
            CASE 
              WHEN (COALESCE(supplier_price, 0) + 
                    COALESCE(supplier_tax, 0) + 
                    COALESCE(supplier_shipping, 0) + 
                    COALESCE(customer_shipping, 0)) != 0 THEN
                ((COALESCE(amazon_price, 0) - 
                  COALESCE(amazon_fee, 0) - 
                  COALESCE(supplier_price, 0) - 
                  COALESCE(supplier_tax, 0) - 
                  COALESCE(supplier_shipping, 0) - 
                  COALESCE(customer_shipping, 0)) / 
                 (COALESCE(supplier_price, 0) + 
                  COALESCE(supplier_tax, 0) + 
                  COALESCE(supplier_shipping, 0) + 
                  COALESCE(customer_shipping, 0))) * 100
              ELSE 0
            END
          ) as average_roi,
          AVG(
            CASE 
              WHEN COALESCE(amazon_price, 0) != 0 THEN 
                ((COALESCE(amazon_price, 0) - 
                  COALESCE(amazon_fee, 0) - 
                  COALESCE(supplier_price, 0) - 
                  COALESCE(supplier_tax, 0) - 
                  COALESCE(supplier_shipping, 0) - 
                  COALESCE(customer_shipping, 0)) / COALESCE(amazon_price, 0)) * 100
              ELSE 0
            END
          ) as average_margin
        FROM orders
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(order_id) LIKE $${paramCount} OR 
          LOWER(sku) LIKE $${paramCount} OR 
          LOWER(asin) LIKE $${paramCount} OR
          LOWER(title) LIKE $${paramCount} OR
          LOWER(supplier_order_id) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status.toLowerCase());
        query += ` AND LOWER(order_status) = $${paramCount}`;
        paramCount++;
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND DATE(purchase_date) >= DATE($${paramCount})`;
        paramCount++;
      }
      
      if (dateTo) {
        params.push(dateTo);
        query += ` AND DATE(purchase_date) <= DATE($${paramCount})`;
        paramCount++;
      }

      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in getOrderStats:', error);
      throw new Error('Failed to fetch order statistics');
    }
  }

  async updateOrder(id, updates) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current order
      const currentOrder = await client.query(
        'SELECT * FROM orders WHERE order_item_id = $1',
        [id]
      );

      if (currentOrder.rows.length === 0) {
        throw new Error('Order not found');
      }

      const originalStatus = currentOrder.rows[0].order_status;

      // Handle tracking updates
      if (updates.customer_track_id !== undefined) {
        const trackingResult = await this._handleTrackingUpdate(
          updates,
          currentOrder.rows[0].customer_track_id
        );
        Object.assign(updates, trackingResult);
      }

      // Preserve original status if not provided
      if (updates.order_status === undefined) {
        updates.order_status = originalStatus;
      }

      // Filter allowed updates
      const validUpdates = this._filterValidUpdates(updates);

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Recalculate financials if needed
      if (this._needsFinancialRecalculation(validUpdates)) {
        const financials = this._calculateFinancials({
          ...currentOrder.rows[0],
          ...validUpdates
        });
        Object.assign(validUpdates, financials);
      }

      // Perform update
      const result = await this._performUpdate(client, id, validUpdates);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Private helper methods
  async _handleTrackingUpdate(updates, currentTracking) {
    const trackingNumber = String(updates.customer_track_id || '').trim();
    
    if (!trackingNumber) {
      return {
        customer_track_id: null,
        customer_track_status: null
      };
    }

    if (trackingNumber === currentTracking) {
      return {};
    }

    try {
      const trackingInfo = await trackingService.getTrackingInfo(trackingNumber);
      return {
        customer_track_id: trackingNumber,
        customer_track_status: trackingInfo.currentStatus || ''
      };
    } catch (error) {
      logger.error('Error fetching tracking info:', error);
      return {
        customer_track_id: trackingNumber,
        customer_track_status: ''
      };
    }
  }

  _filterValidUpdates(updates) {
    const allowedColumns = [
      'customer_track_id',
      'customer_track_status',
      'order_status',
      'supplier_order_id',
      'supplier_price',
      'supplier_tax',
      'supplier_shipping',
      'customer_shipping',
      'amazon_fee',
      'amazon_price',
      'quantity_sold',
      'profit',
      'margin',
      'roi',
      'notes'
    ];

    return Object.entries(updates)
      .filter(([key, value]) => allowedColumns.includes(key) && value !== undefined)
      .reduce((acc, [key, value]) => {
        acc[key] = key === 'customer_track_id' ? String(value || '').trim() : value;
        return acc;
      }, {});
  }

  _needsFinancialRecalculation(updates) {
    const financialFields = [
      'supplier_price',
      'supplier_tax',
      'supplier_shipping',
      'customer_shipping',
      'amazon_fee',
      'amazon_price',
      'quantity_sold'
    ];
    return financialFields.some(field => updates[field] !== undefined);
  }

  _calculateFinancials(order) {
    const totalCost =
      (Number(order.supplier_price) || 0) * (Number(order.quantity_sold) || 1) +
      (Number(order.supplier_tax) || 0) * (Number(order.quantity_sold) || 1) +
      (Number(order.supplier_shipping) || 0) +
      (Number(order.customer_shipping) || 0);

    const totalRevenue =
      (Number(order.amazon_price) || 0) - (Number(order.amazon_fee) || 0);

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return { profit, margin, roi };
  }

  async _performUpdate(client, id, updates) {
    const setEntries = Object.keys(updates)
      .map((key, i) => `"${key}" = $${i + 1}`)
      .join(', ');

    const values = [...Object.values(updates), id];

    return await client.query(`
      UPDATE orders
      SET ${setEntries}
      WHERE order_item_id = $${values.length}
      RETURNING *
    `, values);
  }
}

module.exports = new OrderService();
