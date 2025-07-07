const db = require('../db');
const logger = require('../utils/logger');

class LogisticsService {
  async getLogistics({ page = 1, size = 50, search, status, store, dateFrom, dateTo }) {
    try {
      const offset = (page - 1) * size;
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM logistics
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(supplier_order_id) LIKE $${paramCount} OR 
          LOWER(asin) LIKE $${paramCount} OR 
          LOWER(title) LIKE $${paramCount} OR
          LOWER(order_id) LIKE $${paramCount} OR
          LOWER(supplier_tracking_number) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND order_status = $${paramCount}`;
        paramCount++;
      }

      if (store && store !== 'all') {
        params.push(store);
        query += ` AND store = $${paramCount}`;
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

      query += ` ORDER BY purchase_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await db.query(query, params);

      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...entry } = row;
        return entry;
      });

      return {
        data,
        total: parseInt(total, 10)
      };
    } catch (error) {
      logger.error('Error in getLogistics:', error);
      throw new Error('Failed to fetch logistics entries');
    }
  }

  async getStats(query) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_count,
          COUNT(CASE WHEN order_status = 'in_transit' THEN 1 END) as in_transit_count,
          COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN order_status = 'delayed' THEN 1 END) as delayed_count
        FROM logistics
        WHERE 1=1
      `);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw new Error('Failed to fetch logistics statistics');
    }
  }

  async createLogistics(data) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { order_id, asin } = data;

      // Validate order
      const validation = await this.validateOrder(order_id, asin);
      if (validation.exists && validation.hasSameAsin) {
        throw new Error('Order with same ASIN already exists in logistics');
      }

      // Get customer shipping from orders
      const orderResult = await client.query(
        'SELECT customer_shipping FROM orders WHERE order_id = $1',
        [order_id]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const customerShipping = parseFloat(orderResult.rows[0].customer_shipping);
      
      // Prepare entry
      const entry = {
        ...data,
        order_status: 'ordered',
        ship_estimate: customerShipping,
      };

      // Insert entry
      const result = await this._insertLogisticsEntry(client, entry);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkOrderExists(orderId, asin) {
    try {
      if (!orderId || !asin) {
        return {
          error: 'Order ID and ASIN are required',
          exists: false,
          has_same_asin: false
        };
      }

      const result = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM logistics 
          WHERE order_id = $1
        ) as exists,
        EXISTS (
          SELECT 1 FROM logistics 
          WHERE order_id = $1 
          AND asin = $2
        ) as has_same_asin
      `, [orderId, asin]);

      return {
        exists: result.rows[0].exists || false,
        has_same_asin: result.rows[0].has_same_asin || false
      };
    } catch (error) {
      logger.error('Error in checkOrderExists:', error);
      throw error;
    }
  }

  async updateLogistics(id, updates) {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

      const values = [...Object.values(updates), id];

      const query = `
        UPDATE logistics 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Logistics entry not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error in updateLogistics:', error);
      throw error;
    }
  }

  async deleteLogistics(id) {
    try {
      const result = await db.query(
        'DELETE FROM logistics WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Logistics entry not found');
      }

      return { message: 'Logistics entry deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteLogistics:', error);
      throw error;
    }
  }

  async getArchivedLogistics({ page = 1, size = 50, search, status, store, dateFrom, dateTo }) {
    try {
      const offset = (page - 1) * size;
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM logistics_archived
        WHERE 1=1
      `;

      // [Similar filtering logic as getLogistics]
      // ...

      const result = await db.query(query, params);
      
      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...entry } = row;
        return entry;
      });

      return {
        data,
        total: parseInt(total)
      };
    } catch (error) {
      logger.error('Error in getArchivedLogistics:', error);
      throw error;
    }
  }

  async archiveLogistics(id) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the entry to archive
      const getResult = await client.query(
        'SELECT * FROM logistics WHERE id = $1',
        [id]
      );

      if (getResult.rows.length === 0) {
        throw new Error('Logistics entry not found');
      }

      const entry = getResult.rows[0];

      // Insert into archived table
      await this._insertArchivedEntry(client, entry);

      // Delete from main table
      await client.query(
        'DELETE FROM logistics WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
      
      return { message: 'Logistics entry archived successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreLogistics(id) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the archived entry
      const getResult = await client.query(
        'SELECT * FROM logistics_archived WHERE id = $1',
        [id]
      );

      if (getResult.rows.length === 0) {
        throw new Error('Archived entry not found');
      }

      const entry = getResult.rows[0];

      // Insert back into main table
      await this._insertRestoredEntry(client, entry);

      // Delete from archived table
      await client.query(
        'DELETE FROM logistics_archived WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
      
      return { message: 'Logistics entry restored successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchLogistics({ page = 1, size = 50, search, status, store, dateFrom, dateTo }) {
    try {
      const offset = (page - 1) * size;
      const params = [];
      let paramCount = 1;
      let filterSnippet = '';

      // Build filter snippet
      if (search) {
        filterSnippet += ` AND (
          LOWER(order_id) LIKE $${paramCount}
          OR LOWER(asin) LIKE $${paramCount}
          OR LOWER(supplier_order_id) LIKE $${paramCount}
          OR LOWER(title) LIKE $${paramCount}
        )`;
        params.push(`%${search.toLowerCase()}%`);
        paramCount++;
      }

      // [Add other filters...]

      const query = this._buildCombinedSearchQuery(filterSnippet, paramCount);
      params.push(size, offset);

      const result = await db.query(query, params);
      const total = result.rows[0]?.total_count || 0;

      const data = result.rows.map(row => {
        const { total_count, is_archived, ...rest } = row;
        return rest;
      });

      return {
        data,
        total: parseInt(total, 10)
      };
    } catch (error) {
      logger.error('Error in searchLogistics:', error);
      throw error;
    }
  }

  // Private helper methods
  async validateOrder(orderId, asin) {
    try {
      const query = `
        SELECT 
          EXISTS (
            SELECT 1 FROM logistics 
            WHERE order_id = $1
          ) as exists,
          EXISTS (
            SELECT 1 FROM logistics 
            WHERE order_id = $1 AND asin = $2
          ) as has_same_asin
      `;
      const result = await db.query(query, [orderId, asin]);
      return {
        exists: result.rows[0]?.exists || false,
        hasSameAsin: result.rows[0]?.has_same_asin || false,
      };
    } catch (error) {
      logger.error('Error validating order:', error);
      throw new Error('Failed to validate order');
    }
  }

  async _insertLogisticsEntry(client, entry) {
    const columns = Object.keys(entry).join(', ');
    const values = Object.values(entry);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    return await client.query(`
      INSERT INTO logistics (${columns})
      VALUES (${placeholders})
      RETURNING *
    `, values);
  }

  async _insertArchivedEntry(client, entry) {
    // Implementation for inserting into archived table
  }

  async _insertRestoredEntry(client, entry) {
    // Implementation for inserting restored entry
  }

  _buildCombinedSearchQuery(filterSnippet, paramCount) {
    // Implementation for building combined search query
  }
}

module.exports = new LogisticsService();
