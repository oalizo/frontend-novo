module.exports = (app, pool) => {
  // Helper functions for date handling
  function formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (format === 'yyyy-MM-dd') {
      return `${year}-${month}-${day}`;
    } else if (format === 'MMM dd') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${day}`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  function subMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  // Get dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    const client = await pool.connect();
    
    try {
      // Get current period stats
      const currentStats = await client.query(`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN order_status NOT IN ('canceled', 'refunded', 'Canceled') 
            THEN COALESCE(amazon_price, 0) * COALESCE(quantity_sold, 1) 
            ELSE 0 
          END), 0) as total_revenue,
          COUNT(*) as total_orders,
          COALESCE(SUM(
            COALESCE(amazon_price, 0) - 
            COALESCE(amazon_fee, 0) - 
            (COALESCE(supplier_price, 0) * COALESCE(quantity_sold, 1)) - 
            (COALESCE(supplier_tax, 0) * COALESCE(quantity_sold, 1)) - 
            COALESCE(supplier_shipping, 0) - 
            COALESCE(customer_shipping, 0)
          ), 0) as total_profit
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
      `, [dateFrom, dateTo]);

      // Get previous period stats for comparison
      const prevDateFrom = formatDate(subMonths(new Date(dateFrom), 1), 'yyyy-MM-dd');
      const prevDateTo = formatDate(subMonths(new Date(dateTo), 1), 'yyyy-MM-dd');
      
      const previousStats = await client.query(`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN order_status NOT IN ('canceled', 'refunded', 'Canceled') 
            THEN COALESCE(amazon_price, 0) * COALESCE(quantity_sold, 1) 
            ELSE 0 
          END), 0) as total_revenue,
          COUNT(*) as total_orders,
          COALESCE(SUM(
            COALESCE(amazon_price, 0) - 
            COALESCE(amazon_fee, 0) - 
            (COALESCE(supplier_price, 0) * COALESCE(quantity_sold, 1)) - 
            (COALESCE(supplier_tax, 0) * COALESCE(quantity_sold, 1)) - 
            COALESCE(supplier_shipping, 0) - 
            COALESCE(customer_shipping, 0)
          ), 0) as total_profit
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
      `, [prevDateFrom, prevDateTo]);

      // Get inventory stats
      const inventoryStats = await client.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE quantity = 0 OR quantity IS NULL) as out_of_stock
        FROM produtos
      `);

      // Calculate percentage changes
      const current = currentStats.rows[0];
      const previous = previousStats.rows[0];
      const inventory = inventoryStats.rows[0];

      const calculateChange = (current, previous) => 
        previous ? ((current - previous) / previous) * 100 : 0;

      res.json({
        totalRevenue: parseFloat(current.total_revenue) || 0,
        totalOrders: parseInt(current.total_orders) || 0,
        totalProfit: parseFloat(current.total_profit) || 0,
        inventoryItems: parseInt(inventory.total_items) || 0,
        outOfStock: parseInt(inventory.out_of_stock) || 0,
        inTransit: await getInTransitCount(client),
        deliveredToday: await getDeliveredTodayCount(client),
        returnsPending: await getReturnsPendingCount(client),
        revenueChange: calculateChange(current.total_revenue, previous.total_revenue),
        ordersChange: calculateChange(current.total_orders, previous.total_orders),
        profitChange: calculateChange(current.total_profit, previous.total_profit)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    } finally {
      client.release();
    }
  });

  // Get revenue data
  app.get('/api/dashboard/revenue', async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }
    
    try {
      const result = await pool.query(`
        SELECT 
          DATE(purchase_date) as date,
          SUM(CASE 
            WHEN order_status NOT IN ('canceled', 'refunded', 'Canceled') 
            THEN amazon_price * COALESCE(quantity_sold, 1) 
            ELSE 0 
          END) as revenue
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY DATE(purchase_date)
        ORDER BY date ASC
      `, [dateFrom, dateTo]);

      const data = result.rows.map(row => ({
        date: formatDate(new Date(row.date), 'MMM dd'),
        revenue: parseFloat(row.revenue) || 0
      }));

      res.json(data);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
  });

  // Get store breakdown
  app.get('/api/dashboard/stores', async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }
    
    try {
      const result = await pool.query(`
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

      const STORE_COLORS = {
        'HOME DEPOT': '#3b82f6',    // blue-500
        'UNKNOWN': '#e5e7eb',       // gray-200
        'Unknown': '#e5e7eb',       // gray-200
        'WEB RESTAURANT': '#60a5fa', // blue-400
        'BEST BUY': '#93c5fd',      // blue-300
        'WALMART': '#bfdbfe',       // blue-200
        'ZORO': '#dbeafe',          // blue-100
      };

      const generateColor = (index) => {
        const hue = 210; // Blue hue
        const saturation = 90;
        const lightness = Math.max(40, 70 - (index * 5));
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      const data = result.rows
        .filter(row => row.order_count > 0)
        .map((row, index) => ({
          name: row.store,
          value: parseFloat(row.percentage) || 0,
          color: STORE_COLORS[row.store] || generateColor(index + Object.keys(STORE_COLORS).length)
        }));

      res.json(data);
    } catch (error) {
      console.error('Error fetching store breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch store breakdown' });
    }
  });

  // Get recent orders
  app.get('/api/dashboard/recent-orders', async (req, res) => {
    try {
      const result = await pool.query(`
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

      res.json(result.rows.map(row => ({
        ...row,
        store: row.store || 'unknown',
        amount: parseFloat(row.amount) || 0
      })));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
  });

  // Get orders by source
  app.post('/api/orders-by-source', async (req, res) => {
    try {
      const { from, to } = req.body;

      if (!from || !to) {
        return res.status(400).json({ error: 'from and to dates are required' });
      }

      const query = `
        SELECT 
          COALESCE(source, 'UNKNOWN') AS source,
          SUM(COALESCE(amazon_price, 0)) AS total_revenue
        FROM orders
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY COALESCE(source, 'UNKNOWN');
      `;

      const result = await pool.query(query, [from, to]);

      if (!result.rows || result.rows.length === 0) {
        return res.json([]);
      }

      const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0);

      const formattedData = result.rows.map((row, index) => ({
        name: row.source,
        value: parseFloat(row.total_revenue),
        percentage: ((row.total_revenue / totalRevenue) * 100).toFixed(1),
        color: `hsl(${index * 45}, 70%, 50%)`
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error processing orders by source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get products by source
  app.get('/api/products-by-source', async (req, res) => {
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

      const result = await pool.query(query);

      if (!result.rows || result.rows.length === 0) {
        return res.json([]);
      }

      const formattedData = result.rows.map((row, index) => ({
        name: row.source,
        value: parseInt(row.total_items, 10),
        percentage: parseFloat(row.percentage),
        color: `hsl(${index * 45}, 70%, 50%)`
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error processing products by source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper functions
  async function getInTransitCount(client) {
    try {
      const result = await client.query(`
        SELECT COUNT(*) 
        FROM logistics 
        WHERE shipping_status = 'in_transit'
      `);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting in transit count:', error);
      return 0;
    }
  }

  async function getDeliveredTodayCount(client) {
    try {
      const result = await client.query(`
        SELECT COUNT(*) 
        FROM logistics 
        WHERE shipping_status = 'delivered' 
          AND DATE(delivered_date) = CURRENT_DATE
      `);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting delivered today count:', error);
      return 0;
    }
  }

  async function getReturnsPendingCount(client) {
    try {
      const result = await client.query(`
        SELECT COUNT(*) 
        FROM returns 
        WHERE return_request_status = 'pending'
          AND archived_at IS NULL
      `);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting returns pending count:', error);
      return 0;
    }
  }
};
