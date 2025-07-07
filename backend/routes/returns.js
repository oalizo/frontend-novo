const express = require('express');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  // Get returns stats
  app.get('/api/returns/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_returns,
          COUNT(*) FILTER (WHERE return_request_status = 'refunded') as total_refunded,
          COUNT(*) FILTER (WHERE return_request_status = 'in_transit') as total_in_transit,
          COUNT(*) FILTER (WHERE return_request_status = 'received') as total_received,
          COUNT(*) FILTER (WHERE return_request_status = 'pending') as total_pending
        FROM returns
        WHERE archived_at IS NULL
      `);
      
      res.json(result.rows[0]);
    } catch (err) {
      logger.error("Error getting returns stats:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all returns with filters
  app.get('/api/returns', async (req, res) => {
    const { page = 1, size = 50, search, status, dateFrom, dateTo, archived = false } = req.query;
    const offset = (page - 1) * size;
    
    try {
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

      const result = await pool.query(query, params);
      
      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...item } = row;
        return item;
      });

      res.json({
        data,
        total: parseInt(total),
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      });
    } catch (err) {
      logger.error("Error fetching returns:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get archived returns
  app.get('/api/returns/archived', async (req, res) => {
    const { page = 1, size = 50, search, status, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * size;
    
    try {
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM returns
        WHERE archived_at IS NOT NULL
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

      const result = await pool.query(query, params);
      
      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...item } = row;
        return item;
      });

      res.json({
        data,
        total: parseInt(total),
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      });
    } catch (err) {
      logger.error("Error fetching archived returns:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update return tracking status
  app.put('/api/returns/:id/tracking', async (req, res) => {
    const { id } = req.params;
    const {
      tracking_status,
      provider,
      delivery_info,
      expected_date,
      url_carrier,
      return_request_status
    } = req.body;
    
    const client = await pool.connect();
    
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
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Return not found',
          id,
          tracking_status 
        });
      }

      await client.query('COMMIT');
      logger.info('Successfully updated tracking:', {
        id,
        tracking_status,
        return_request_status
      });

      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error updating return tracking:', err);
      res.status(500).json({ 
        error: err.message,
        id,
        tracking_status 
      });
    } finally {
      client.release();
    }
  });

  // Archive returns
  app.post('/api/returns/archive', async (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No returns selected for archiving' });
    }

    const client = await pool.connect();
    
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
      
      res.json({
        message: 'Returns archived successfully',
        count: result.rowCount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error archiving returns:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Restore returns
  app.post('/api/returns/restore', async (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No returns selected for restoring' });
    }

    const client = await pool.connect();
    
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
      
      res.json({
        message: 'Returns restored successfully',
        count: result.rowCount
      });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error restoring returns:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });
};
