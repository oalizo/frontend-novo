module.exports = (app, pool) => {
  // Get orders with filters - usando valores das colunas do banco
  app.get('/api/orders', async (req, res) => {
    const { 
      page = 1, 
      size = 50, 
      search = '', 
      status = 'all',
      dateFrom,
      dateTo
    } = req.query;

    const offset = (page - 1) * size;

    try {
      // Use direct column values instead of dynamic calculations
      let query = `
        SELECT 
          o.*,
          COUNT(*) OVER() as total_count
        FROM orders o
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (search && search.trim() !== '') {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(order_id) LIKE $${paramCount} OR 
          LOWER(sku) LIKE $${paramCount} OR 
          LOWER(asin) LIKE $${paramCount} OR
          LOWER(title) LIKE $${paramCount} OR
          LOWER(supplier_order_id) LIKE $${paramCount} OR
          LOWER(supplier_tracking_number) LIKE $${paramCount} OR
          LOWER(source) LIKE $${paramCount} OR
          LOWER(notes) LIKE $${paramCount} OR
          LOWER(customer_track_id) LIKE $${paramCount} OR
          LOWER(customer_track_status) LIKE $${paramCount} OR
          CAST(order_item_id AS TEXT) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        const statusArray = status.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (statusArray.length > 0) {
          const statusPlaceholders = statusArray.map((_, index) => `$${paramCount + index}`).join(', ');
          query += ` AND LOWER(order_status) IN (${statusPlaceholders})`;
          params.push(...statusArray);
          paramCount += statusArray.length;
        }
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND purchase_date >= $${paramCount}`;
        paramCount++;
      }

      if (dateTo) {
        params.push(dateTo);
        query += ` AND purchase_date <= $${paramCount}`;
        paramCount++;
      }

      // Get total count - fix the count query
      let countQuery = `
        SELECT COUNT(*) as count
        FROM orders o
        WHERE 1=1
      `;
      
      // Add the same filters to count query
      let countParamCount = 1;
      const countParams = [];

      if (search && search.trim() !== '') {
        countParams.push(`%${search.toLowerCase()}%`);
        countQuery += ` AND (
          LOWER(order_id) LIKE $${countParamCount} OR 
          LOWER(sku) LIKE $${countParamCount} OR 
          LOWER(asin) LIKE $${countParamCount} OR
          LOWER(title) LIKE $${countParamCount} OR
          LOWER(supplier_order_id) LIKE $${countParamCount} OR
          LOWER(supplier_tracking_number) LIKE $${countParamCount} OR
          LOWER(source) LIKE $${countParamCount} OR
          LOWER(notes) LIKE $${countParamCount} OR
          LOWER(customer_track_id) LIKE $${countParamCount} OR
          LOWER(customer_track_status) LIKE $${countParamCount} OR
          CAST(order_item_id AS TEXT) LIKE $${countParamCount}
        )`;
        countParamCount++;
      }

      if (status && status !== 'all') {
        const statusArray = status.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (statusArray.length > 0) {
          const statusPlaceholders = statusArray.map((_, index) => `$${countParamCount + index}`).join(', ');
          countQuery += ` AND LOWER(order_status) IN (${statusPlaceholders})`;
          countParams.push(...statusArray);
          countParamCount += statusArray.length;
        }
      }

      if (dateFrom) {
        countParams.push(dateFrom);
        countQuery += ` AND purchase_date >= $${countParamCount}`;
        countParamCount++;
      }

      if (dateTo) {
        countParams.push(dateTo);
        countQuery += ` AND purchase_date <= $${countParamCount}`;
        countParamCount++;
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      query += ` ORDER BY purchase_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(size, offset);

      const result = await pool.query(query, params);
      
      // Remove total_count from each row
      const data = result.rows.map(row => {
        const { total_count, ...order } = row;
        return order;
      });

      res.json({
        data,
        total
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Get order stats endpoint
  app.get('/api/orders/stats', async (req, res) => {
    const { search, status, dateFrom, dateTo } = req.query;
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(amazon_price), 0) as total_amazon_price,
          COALESCE(SUM(quantity_sold), 0) as total_quantity_sold,
          COALESCE(SUM(profit), 0) as total_profit,
          COALESCE(AVG(roi), 0) as average_roi,
          COALESCE(AVG(margin), 0) as average_margin,
          COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN order_status = 'processing' THEN 1 END) as processing_count,
          COUNT(CASE WHEN order_status = 'shipped' THEN 1 END) as shipped_count,
          COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_count,
          COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_count,
          COUNT(CASE WHEN order_status = 'refunded' THEN 1 END) as refunded_count
        FROM orders
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;

      if (search && search.trim() !== '') {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(order_id) LIKE $${paramCount} OR
          LOWER(sku) LIKE $${paramCount} OR
          LOWER(asin) LIKE $${paramCount} OR
          LOWER(title) LIKE $${paramCount} OR
          LOWER(supplier_order_id) LIKE $${paramCount} OR
          LOWER(supplier_tracking_number) LIKE $${paramCount} OR
          LOWER(source) LIKE $${paramCount} OR
          LOWER(notes) LIKE $${paramCount} OR
          LOWER(customer_track_id) LIKE $${paramCount} OR
          LOWER(customer_track_status) LIKE $${paramCount} OR
          CAST(order_item_id AS TEXT) LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (status && status !== 'all') {
        const statusArray = status.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (statusArray.length > 0) {
          const statusPlaceholders = statusArray.map((_, index) => `$${paramCount + index}`).join(', ');
          query += ` AND LOWER(order_status) IN (${statusPlaceholders})`;
          params.push(...statusArray);
          paramCount += statusArray.length;
        }
      }

      if (dateFrom) {
        params.push(dateFrom);
        query += ` AND purchase_date >= $${paramCount}`;
        paramCount++;
      }
      
      if (dateTo) {
        params.push(dateTo);
        query += ` AND purchase_date <= $${paramCount}`;
        paramCount++;
      }

      const result = await pool.query(query, params);
      const stats = result.rows[0];
      
      res.json({
        ...stats,
        total_amazon_price: parseFloat(stats.total_amazon_price) || 0,
        total_profit: parseFloat(stats.total_profit) || 0,
        average_roi: parseFloat(stats.average_roi) || 0,
        average_margin: parseFloat(stats.average_margin) || 0,
        total_orders: parseInt(stats.total_orders) || 0,
        total_quantity_sold: parseInt(stats.total_quantity_sold) || 0,
        pending_count: parseInt(stats.pending_count) || 0,
        processing_count: parseInt(stats.processing_count) || 0,
        shipped_count: parseInt(stats.shipped_count) || 0,
        delivered_count: parseInt(stats.delivered_count) || 0,
        cancelled_count: parseInt(stats.cancelled_count) || 0,
        refunded_count: parseInt(stats.refunded_count) || 0
      });
    } catch (error) {
      console.error('Error fetching order stats:', error);
      res.status(500).json({ error: 'Failed to fetch order stats' });
    }
  });

  // Update order endpoint
  app.patch('/api/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const updates = req.body;
    
    try {
      // Build dynamic update query
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      values.push(orderId);
      
      const query = `
        UPDATE orders 
        SET ${setClause}
        WHERE order_item_id = $${values.length}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });
};
