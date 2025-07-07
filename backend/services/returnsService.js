const db = require('../db');
const logger = require('../utils/logger');

class ReturnsService {
  async getReturnStats() {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total_returns,
          COUNT(*) FILTER (WHERE return_request_status = 'refunded') as total_refunded,
          COUNT(*) FILTER (WHERE return_request_status = 'in_transit') as total_in_transit,
          COUNT(*) FILTER (WHERE return_request_status = 'received') as total_received,
          COUNT(*) FILTER (WHERE return_request_status = 'pending') as total_pending
        FROM returns
        WHERE archived_at IS NULL
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error in getReturnStats:', error);
      throw new Error('Failed to fetch return statistics');
    }
  }

  async getReturns({ page = 1, size = 50, search, status, dateFrom, dateTo, archived = false }) {
    try {
      const offset = (page - 1) * size;
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM returns
        WHERE archived_at IS ${archived ? 'NOT' : ''} NULL
      `;
      
      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(order_id) LIKE $${paramCount} OR 
          LOWER(amazon_rma_id) LIKE $${paramCount} OR 
          LOWER(asin) LIKE $${paramCount} OR
          LOWER(merchant_sku) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND return_request_status = $${paramCount}`;
        paramCount++;
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND return_request_date >= $${paramCount}`;
        paramCount++;
      }

      if (dateTo) {
        params.push(dateTo);
        query += ` AND return_request_date <= $${paramCount}`;
        paramCount++;
      }

      query += ` ORDER BY return_request_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await db.query(query, params);
      
      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...item } = row;
        return item;
      });

      return {
        data,
        total: parseInt(total)
      };
    } catch (error) {
      logger.error('Error in getReturns:', error);
      throw new Error('Failed to fetch returns');
    }
  }

  async getArchivedReturns(params) {
    return this.getReturns({ ...params, archived: true });
  }

  async updateReturnTracking(id, {
    tracking_status,
    provider,
    delivery_info,
    expected_date,
    url_carrier,
    return_request_status
  }) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      if (!tracking_status) {
        throw new Error('Tracking status is required');
      }

      const query = `
        UPDATE returns 
        SET 
          tracking_status = $1,
          provider = $2,
          delivery_info = $3,
          expected_date = $4,
          url_carrier = $5,
          return_request_status = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE amazon_rma_id = $7
        RETURNING *
      `;

      const values = [
        tracking_status,
        provider || '',
        delivery_info || '',
        expected_date ? new Date(expected_date) : null,
        url_carrier || '',
        return_request_status || 'pending',
        id
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Return not found');
      }

      await client.query('COMMIT');
      
      logger.info('Successfully updated tracking:', {
        id,
        tracking_status,
        return_request_status
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async archiveReturns(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('No returns selected for archiving');
    }

    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE returns 
         SET archived_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE amazon_rma_id = ANY($1)
         RETURNING *`,
        [ids]
      );

      await client.query('COMMIT');
      
      return {
        message: 'Returns archived successfully',
        count: result.rowCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreReturns(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('No returns selected for restoring');
    }

    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE returns 
         SET archived_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE amazon_rma_id = ANY($1)
         RETURNING *`,
        [ids]
      );

      await client.query('COMMIT');
      
      return {
        message: 'Returns restored successfully',
        count: result.rowCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods for validating return statuses
  _validateReturnStatus(status) {
    const validStatuses = ['pending', 'in_transit', 'received', 'refunded'];
    return validStatuses.includes(status) ? status : 'pending';
  }
}

module.exports = new ReturnsService();
