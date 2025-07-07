const express = require('express');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  // Combined search endpoint
  app.get('/api/search', async (req, res) => {
    const {
      page = 1,
      size = 50,
      search,
      status,
      store,
      dateFrom,
      dateTo,
      hasTracking
    } = req.query;
  
    const offset = (page - 1) * size;
    const params = [];
    let paramCount = 1;
    let filterSnippet = '';
  
    if (search) {
      filterSnippet += ` AND (
        LOWER(l.order_id) LIKE $${paramCount}
        OR LOWER(l.asin) LIKE $${paramCount}
        OR LOWER(l.supplier_order_id) LIKE $${paramCount}
        OR LOWER(l.title) LIKE $${paramCount}
        OR LOWER(l.supplier_tracking_number) LIKE $${paramCount}
        OR LOWER(l.provider) LIKE $${paramCount}
        OR LOWER(l.current_status) LIKE $${paramCount}
        OR LOWER(l.delivery_info) LIKE $${paramCount}
      )`;
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }
  
    if (status && status !== 'all') {
      filterSnippet += ` AND l.order_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
  
    if (store && store !== 'all') {
      filterSnippet += ` AND l.store = $${paramCount}`;
      params.push(store);
      paramCount++;
    }
  
    if (dateFrom) {
      filterSnippet += ` AND DATE(l.purchase_date) >= DATE($${paramCount})`;
      params.push(dateFrom);
      paramCount++;
    }
  
    if (dateTo) {
      filterSnippet += ` AND DATE(l.purchase_date) <= DATE($${paramCount})`;
      params.push(dateTo);
      paramCount++;
    }

    if (hasTracking && hasTracking !== 'all') {
      if (hasTracking === 'yes') {
        filterSnippet += ` AND l.supplier_tracking_number IS NOT NULL`;
      } else if (hasTracking === 'no') {
        filterSnippet += ` AND l.supplier_tracking_number IS NULL`;
      }
    }
  
    const query = `
      WITH combined_results AS (
        SELECT
          l.id,
          l.purchase_date,
          l.store,
          l.supplier_order_id,
          l.asin,
          l.quantity_sold,
          l.title,
          l.order_id,
          l.latest_ship_date,
          l.order_status,
          l.handling_omd,
          l.dead_line,
          l.supplier_tracking_number,
          l.provider,
          l.date_time,
          l.current_status,
          l.shipping_status,
          l.delivered_date,
          l.delivery_info,
          l.expected_date,
          l.url_carrier,
          l.origin_city,
          l.destination_city,
          l.notes,
          l.created_at,
          l.updated_at,
          l.ship_estimate,
          l.supplier_price,
          l.supplier_shipping,
          l.supplier_tax,
          CAST(NULL AS TIMESTAMPTZ) AS archived_at,
          0 AS is_archived,
          COALESCE(o.title, l.title) as order_title,
          o.customer_track_id as order_tracking,
          o.customer_track_status as order_tracking_status
        FROM logistics l
        LEFT JOIN orders o ON l.order_id = o.order_id
        WHERE 1=1
        ${filterSnippet}
        
        UNION ALL
        
        SELECT
          la.id,
          la.purchase_date,
          la.store,
          la.supplier_order_id,
          la.asin,
          la.quantity_sold,
          la.title,
          la.order_id,
          la.latest_ship_date,
          la.order_status,
          la.handling_omd,
          la.dead_line,
          la.supplier_tracking_number,
          la.provider,
          la.date_time,
          la.current_status,
          la.shipping_status,
          la.delivered_date,
          la.delivery_info,
          la.expected_date,
          la.url_carrier,
          la.origin_city,
          la.destination_city,
          la.notes,
          la.created_at,
          la.updated_at,
          CAST(NULL AS NUMERIC) AS ship_estimate,
          CAST(NULL AS NUMERIC) AS supplier_price,
          CAST(NULL AS NUMERIC) AS supplier_shipping,
          CAST(NULL AS NUMERIC) AS supplier_tax,
          la.archived_at,
          1 AS is_archived,
          COALESCE(o.title, la.title) as order_title,
          o.customer_track_id as order_tracking,
          o.customer_track_status as order_tracking_status
        FROM logistics_archived la
        LEFT JOIN orders o ON la.order_id = o.order_id
        WHERE 1=1
        ${filterSnippet.replace(/l\./g, 'la.')}
      )
      SELECT 
        *,
        COUNT(*) OVER() AS total_count
      FROM combined_results
      ORDER BY 
        CASE 
          WHEN order_status = 'pending' THEN 1
          WHEN order_status = 'processing' THEN 2
          WHEN order_status = 'in_transit' THEN 3
          WHEN order_status = 'delivered' THEN 4
          ELSE 5
        END,
        purchase_date DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
  
    params.push(size, offset);
  
    try {
      const result = await pool.query(query, params);
      const total = result.rows[0]?.total_count || 0;
  
      const data = result.rows.map(row => {
        const { total_count, is_archived, ...rest } = row;
        return {
          ...rest,
          status_priority: 
            row.order_status === 'pending' ? 1 :
            row.order_status === 'processing' ? 2 :
            row.order_status === 'in_transit' ? 3 :
            row.order_status === 'delivered' ? 4 : 5
        };
      });
  
      res.json({
        data,
        total: parseInt(total, 10),
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      });
    } catch (err) {
      console.error("Error searching logistics:", err);
      res.status(500).json({ error: err.message });
    }
  });
  // Get all logistics entries
  app.get('/api/logistics', async (req, res) => {
    const { page = 1, size = 50, search, status, store, dateFrom, dateTo, hasTracking } = req.query;
    const offset = (page - 1) * size;

    try {
      let query = `
        SELECT 
          l.*,
          COUNT(*) OVER() as total_count,
          o.customer_track_id as order_tracking,
          o.customer_track_status as order_tracking_status
        FROM logistics l
        LEFT JOIN orders o ON l.order_id = o.order_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(l.supplier_order_id) LIKE $${paramCount} OR 
          LOWER(l.asin) LIKE $${paramCount} OR 
          LOWER(l.title) LIKE $${paramCount} OR
          LOWER(l.order_id) LIKE $${paramCount} OR
          LOWER(l.supplier_tracking_number) LIKE $${paramCount} OR
          LOWER(l.provider) LIKE $${paramCount} OR
          LOWER(l.current_status) LIKE $${paramCount} OR
          LOWER(l.delivery_info) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND l.order_status = $${paramCount}`;
        paramCount++;
      }

      if (store && store !== 'all') {
        params.push(store);
        query += ` AND l.store = $${paramCount}`;
        paramCount++;
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND DATE(l.purchase_date) >= DATE($${paramCount})`;
        paramCount++;
      }

      if (dateTo) {
        params.push(dateTo);
        query += ` AND DATE(l.purchase_date) <= DATE($${paramCount})`;
        paramCount++;
      }

      if (hasTracking && hasTracking !== 'all') {
        if (hasTracking === 'yes') {
          query += ` AND l.supplier_tracking_number IS NOT NULL`;
        } else if (hasTracking === 'no') {
          query += ` AND l.supplier_tracking_number IS NULL`;
        }
      }

      query += ` 
        ORDER BY 
          CASE 
            WHEN l.order_status = 'pending' THEN 1
            WHEN l.order_status = 'processing' THEN 2
            WHEN l.order_status = 'in_transit' THEN 3
            WHEN l.order_status = 'delivered' THEN 4
            ELSE 5
          END,
          l.purchase_date DESC 
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      params.push(size, offset);

      const result = await pool.query(query, params);

      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...entry } = row;
        return entry;
      });

      res.json({
        data,
        total: parseInt(total, 10),
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      });
    } catch (err) {
      logger.error("Error fetching logistics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get logistics statistics
  app.get('/api/logistics/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
          SUM(CASE WHEN order_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count,
          SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN order_status = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
          SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processing_count
        FROM logistics
      `);
  
      // Garantir que os valores sejam números, mesmo quando nulos
      const stats = {
        total_entries: parseInt(result.rows[0].total_entries) || 0,
        delivered_count: parseInt(result.rows[0].delivered_count) || 0,
        in_transit_count: parseInt(result.rows[0].in_transit_count) || 0,
        pending_count: parseInt(result.rows[0].pending_count) || 0,
        delayed_count: parseInt(result.rows[0].delayed_count) || 0,
        processing_count: parseInt(result.rows[0].processing_count) || 0
      };
      
      res.json(stats);
    } catch (err) {
      logger.error("Error fetching logistics stats:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create new logistics entry
  app.post('/api/logistics', async (req, res) => {
    try {
      console.log('📥 CLEO - Received logistics entry request:', req.body);
  
      const { order_id, asin } = req.body;
  
      // Validação da ordem
      const validation = await validateOrder(order_id, asin);
      if (validation.exists && validation.hasSameAsin) {
        return res.status(400).json({
          error: 'Order with same ASIN already exists in logistics',
        });
      }
  
      // Recuperar customer_shipping da tabela orders
      const orderQuery = `SELECT customer_shipping FROM orders WHERE order_id = $1`;
      const orderResult = await pool.query(orderQuery, [order_id]);
  
      if (orderResult.rows.length === 0) {
        console.error('❌ Order not found in orders table:', order_id);
        return res.status(404).json({ error: 'Order not found' });
      }
  
      const customerShipping = parseFloat(orderResult.rows[0].customer_shipping);
      console.log('📦 Retrieved customer_shipping:', customerShipping);
  
      // Preparar entrada para inserção
      const entry = {
        ...req.body,
        order_status: 'ordered', // Forçar status para 'ordered'
        ship_estimate: customerShipping,
      };
  
      // Construir query SQL
      const query = `
        INSERT INTO logistics (
          purchase_date,
          store,
          supplier_order_id,
          asin,
          quantity_sold,
          title,
          order_id,
          latest_ship_date,
          order_status,
          handling_omd,
          dead_line,
          supplier_tracking_number,
          provider,
          date_time,
          current_status,
          shipping_status,
          delivered_date,
          delivery_info,
          expected_date,
          url_carrier,
          origin_city,
          destination_city,
          notes,
          ship_estimate
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24
        ) RETURNING *
      `;
  
      const values = [
        entry.purchase_date,
        entry.store || null,
        entry.supplier_order_id || null,
        entry.asin,
        entry.quantity_sold || 0,
        entry.title,
        entry.order_id,
        entry.latest_ship_date || null,
        entry.order_status,
        entry.handling_omd || null,
        entry.dead_line || null,
        entry.supplier_tracking_number || null,
        entry.provider || null,
        entry.date_time || null,
        entry.current_status || null,
        entry.shipping_status || null,
        entry.delivered_date || null,
        entry.delivery_info || null,
        entry.expected_date || null,
        entry.url_carrier || null,
        entry.origin_city || null,
        entry.destination_city || null,
        entry.notes || null,
        entry.ship_estimate,
      ];
  
      console.log('🔍 Query values for logistics:', values);
  
      // Executar query
      const result = await pool.query(query, values);
      console.log('✅ Created logistics entry:', result.rows[0]);
  
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('❌ Error creating logistics entry:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Check if order exists
  app.get('/api/logistics/exists/:orderId/:asin', async (req, res) => {
    const { orderId, asin } = req.params;
    logger.info(req.params);
    if (!orderId || !asin) {
      return res.status(400).json({ 
        error: 'Order ID and ASIN are required',
        exists: false,
        has_same_asin: false
      });
    }
    
    try {
      logger.info(`Checking order ${orderId} with ASIN ${asin}`);
      
      const result = await pool.query(`
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
       
      const { exists, has_same_asin } = result.rows[0];
      res.json({
        exists: exists || false,
        has_same_asin: has_same_asin || false
      });
    } catch (err) {
      logger.error("Error checking order:", err);
      res.status(500).json({
        exists: false,
        has_same_asin: false,
        error: 'Failed to check order'
      });
    }
  });

  // Update logistics entry
  app.put('/api/logistics/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

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

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Logistics entry not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      logger.error("Error updating logistics entry:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete logistics entry
  app.delete('/api/logistics/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        'DELETE FROM logistics WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Logistics entry not found' });
      }

      res.json({ message: 'Logistics entry deleted successfully' });
    } catch (err) {
      logger.error("Error deleting logistics entry:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get archived logistics
  app.get('/api/logistics/archived', async (req, res) => {
    const { page = 1, size = 50, search, status, store, dateFrom, dateTo, hasTracking } = req.query;
    const offset = (page - 1) * size;
    
    try {
      let query = `
        SELECT *,
          COUNT(*) OVER() as total_count
        FROM logistics_archived
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
        params.push(`${dateFrom}`);
        query += ` AND DATE(purchase_date) >= DATE($${paramCount})`;
        paramCount++;
      }
      
      if (dateTo) {
        params.push(`${dateTo}`);
        query += ` AND DATE(purchase_date) <= DATE($${paramCount})`;
        paramCount++;
      }

      if (hasTracking && hasTracking !== 'all') {
        if (hasTracking === 'yes') {
          query += ` AND supplier_tracking_number IS NOT NULL`;
        } else if (hasTracking === 'no') {
          query += ` AND supplier_tracking_number IS NULL`;
        }
      }

      query += ` ORDER BY archived_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await pool.query(query, params);
      
      const total = result.rows[0]?.total_count || 0;
      const data = result.rows.map(row => {
        const { total_count, ...entry } = row;
        return entry;
      });

      res.json({
        data,
        total: parseInt(total)
      });
    } catch (err) {
      logger.error("Error fetching archived logistics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Archive logistics entry
  app.post('/api/logistics/:id/archive', async (req, res) => {
    const { id } = req.params;
    
    try {
      await pool.query('BEGIN');

      const getResult = await pool.query(
        'SELECT * FROM logistics WHERE id = $1',
        [id]
      );

      if (getResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Logistics entry not found' });
      }

      const entry = getResult.rows[0];

      await pool.query(`
        INSERT INTO logistics_archived (
          id, purchase_date, store, supplier_order_id, asin, quantity_sold,
          title, order_id, latest_ship_date, order_status, handling_omd,
          dead_line, supplier_tracking_number, provider, date_time,
          current_status, shipping_status, delivered_date, delivery_info,
          expected_date, url_carrier, origin_city, destination_city,
          notes, created_at, updated_at, archived_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, CURRENT_TIMESTAMP
        )`,
        [
          entry.id, entry.purchase_date, entry.store, entry.supplier_order_id,
          entry.asin, entry.quantity_sold, entry.title, entry.order_id,
          entry.latest_ship_date, entry.order_status, entry.handling_omd,
          entry.dead_line, entry.supplier_tracking_number, entry.provider,
          entry.date_time, entry.current_status, entry.shipping_status,
          entry.delivered_date, entry.delivery_info, entry.expected_date,
          entry.url_carrier, entry.origin_city, entry.destination_city,
          entry.notes, entry.created_at, entry.updated_at
        ]
      );

      await pool.query(
        'DELETE FROM logistics WHERE id = $1',
        [id]
      );

      await pool.query('COMMIT');
      
      res.json({ message: 'Logistics entry archived successfully' });
    } catch (err) {
      await pool.query('ROLLBACK');
      logger.error("Error archiving logistics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Restore archived logistics entry
  app.post('/api/logistics/:id/restore', async (req, res) => {
    const { id } = req.params;
    
    try {
      await pool.query('BEGIN');

      const getResult = await pool.query(
        'SELECT * FROM logistics_archived WHERE id = $1',
        [id]
      );

      if (getResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Archived entry not found' });
      }

      const entry = getResult.rows[0];

      await pool.query(`
        INSERT INTO logistics (
          id, purchase_date, store, supplier_order_id, asin, quantity_sold,
          title, order_id, latest_ship_date, order_status, handling_omd,
          dead_line, supplier_tracking_number, provider, date_time,
          current_status, shipping_status, delivered_date, delivery_info,
          expected_date, url_carrier, origin_city, destination_city,
          notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, CURRENT_TIMESTAMP
        )`,
        [
          entry.id, entry.purchase_date, entry.store, entry.supplier_order_id,
          entry.asin, entry.quantity_sold, entry.title, entry.order_id,
          entry.latest_ship_date, entry.order_status, entry.handling_omd,
          entry.dead_line, entry.supplier_tracking_number, entry.provider,
          entry.date_time, entry.current_status, entry.shipping_status,
          entry.delivered_date, entry.delivery_info, entry.expected_date,
          entry.url_carrier, entry.origin_city, entry.destination_city,
          entry.notes, entry.created_at
        ]
      );

      await pool.query(
        'DELETE FROM logistics_archived WHERE id = $1',
        [id]
      );

      await pool.query('COMMIT');
      
      res.json({ message: 'Logistics entry restored successfully' });
    } catch (err) {
      await pool.query('ROLLBACK');
      logger.error("Error restoring logistics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper function to validate order
  async function validateOrder(orderId, asin) {
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
      const result = await pool.query(query, [orderId, asin]);
      return {
        exists: result.rows[0]?.exists || false,
        hasSameAsin: result.rows[0]?.has_same_asin || false,
      };
    } catch (err) {
      logger.error('❌ Error validating order:', err.message);
      throw new Error('Failed to validate order');
    }
  }
};
