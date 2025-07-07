const express = require('express');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  // Add inventory item
  app.post('/api/inventory', async (req, res) => {
    logger.info('Received inventory item:', req.body);

    const { 
      store,
      supplier_order_id,
      asin,
      quantity,
      title,
      status,
      cost_price
    } = req.body;

    // Validate required fields
    if (!store || !asin || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Store, ASIN and status are required'
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO inventory (
          store,
          supplier_order_id,
          asin,
          quantity,
          title,
          status,
          cost_price,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [store, supplier_order_id, asin, quantity, title, status, cost_price]
      );

      logger.info('Created inventory item:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error adding inventory item:', err);
      res.status(500).json({ 
        error: 'Failed to create inventory item',
        details: err.message,
        code: err.code
      });
    }
  });

  // Get inventory items with filters
  app.get('/api/inventory', async (req, res) => {
    const { page = 1, size = 50, search, status, store } = req.query;
    const offset = (page - 1) * size;

    try {
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM inventory
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(supplier_order_id) LIKE $${paramCount} OR 
          LOWER(asin) LIKE $${paramCount} OR 
          LOWER(title) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND status = $${paramCount}`;
        paramCount++;
      }

      if (store && store !== 'all') {
        params.push(store);
        query += ` AND store = $${paramCount}`;
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await pool.query(query, params);

      res.json({
        data: result.rows,
        total: parseInt(result.rows[0]?.total_count || '0'),
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(parseInt(result.rows[0]?.total_count || '0') / size)
      });
    } catch (err) {
      logger.error('Error fetching inventory:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update inventory item
  app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
      const setClause = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');
      
      const values = [...Object.values(updates), id];
      
      const query = `
        UPDATE inventory 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
  
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating inventory:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete inventory item
  app.delete('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query(
        'DELETE FROM inventory WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json({ message: 'Inventory item deleted successfully' });
    } catch (err) {
      logger.error('Error deleting inventory:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Check inventory status by ASIN with caching
  const asinStatusCache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  app.get('/api/inventory/check/:asin', async (req, res) => {
    const { asin } = req.params;

    try {
      if (!asin) {
        return res.status(400).json({ error: 'ASIN parameter is required' });
      }

      logger.info(`Received request to check inventory for ASIN: ${asin}`);

      // Check cache
      const cached = asinStatusCache.get(asin);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info(`Cache hit for ASIN: ${asin}`);
        return res.json(cached.data);
      }

      logger.info(`Cache miss for ASIN: ${asin}`);

      const result = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory WHERE LOWER(asin) = LOWER($1)',
        [asin]
      );

      const quantity = parseInt(result.rows[0].total, 10);
      logger.info(`Query result for ASIN ${asin}:`, quantity);

      const data = {
        inStock: quantity > 0,
        quantity
      };

      // Update cache
      asinStatusCache.set(asin, {
        data,
        timestamp: Date.now()
      });

      logger.info(`Cache updated for ASIN: ${asin}`);
      res.json(data);
    } catch (err) {
      logger.error('Error checking inventory:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get inventory history
  app.get('/api/inventory/:id/history', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(`
        SELECT 
          ih.*,
          i.asin,
          i.title
        FROM inventory_history ih
        JOIN inventory i ON i.id = ih.inventory_id 
        WHERE inventory_id = $1
        ORDER BY changed_at DESC
      `, [id]);

      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching inventory history:', err);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });
};
