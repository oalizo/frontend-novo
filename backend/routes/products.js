const amazonAPI = require('../utils/amazon');
const logger = require('../utils/logger');
module.exports = (app, pool) => {
  // Configurar o pool de conexão no amazonAPI
  amazonAPI.setPool(pool);
  // Get filter options
  app.get('/api/produtos/filter-options', async (req, res) => {
    try {
      const [availabilityResult, sourceResult] = await Promise.all([
        pool.query('SELECT DISTINCT availability FROM produtos WHERE availability IS NOT NULL'),
        pool.query('SELECT DISTINCT source FROM produtos WHERE source IS NOT NULL')
      ]);

      res.json({
        availabilityOptions: availabilityResult.rows.map(row => row.availability),
        sourceOptions: sourceResult.rows.map(row => row.source)
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({ error: 'Failed to fetch filter options' });
    }
  });

  // Get products with filters
  app.get('/api/produtos', async (req, res) => {
    const { page = 1, size = 50, search, asin, sku2, brand, availability, source } = req.query;
    const offset = (page - 1) * size;

    try {
      let query = 'SELECT * FROM produtos WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (
          LOWER(asin) LIKE $${paramCount} OR 
          LOWER(sku) LIKE $${paramCount} OR 
          LOWER(sku2) LIKE $${paramCount} OR 
          LOWER(availability) LIKE $${paramCount} OR 
          LOWER(brand) LIKE $${paramCount} OR 
          LOWER(source) LIKE $${paramCount} OR 
          LOWER(lead_time) LIKE $${paramCount} OR 
          LOWER(amazon_title) LIKE $${paramCount} OR 
          LOWER(supplier_product_name) LIKE $${paramCount} OR 
          LOWER(amaz_part_number) LIKE $${paramCount} OR 
          LOWER(amz_model) LIKE $${paramCount} OR 
          LOWER(supplier_mfn) LIKE $${paramCount} OR 
          quantity::text LIKE $${paramCount} OR 
          supplier_price::text LIKE $${paramCount} OR 
          total_price::text LIKE $${paramCount}
        )`;
        paramCount++;
      }

      if (asin) {
        params.push(`%${asin.toLowerCase()}%`);
        query += ` AND LOWER(asin) LIKE $${paramCount}`;
        paramCount++;
      }

      if (sku2) {
        params.push(`%${sku2.toLowerCase()}%`);
        query += ` AND LOWER(sku2) LIKE $${paramCount}`;
        paramCount++;
      }

      if (brand) {
        params.push(`%${brand.toLowerCase()}%`);
        query += ` AND LOWER(brand) LIKE $${paramCount}`;
        paramCount++;
      }

      if (availability && availability !== 'all') {
        params.push(availability);
        query += ` AND availability = $${paramCount}`;
        paramCount++;
      }

      if (source && source !== 'all') {
        params.push(source);
        query += ` AND source = $${paramCount}`;
        paramCount++;
      }

      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      query += ' ORDER BY last_update DESC';
      query += ` LIMIT ${size} OFFSET ${offset}`;

      // Adicione este código logo antes do pool.query
      console.log('Query:', query);
      console.log('Params:', params);

      const result = await pool.query(query, params);
      
      res.json({
        message: "success",
        data: result.rows,
        total
      });
    } catch (err) {
      console.error("Error fetching products: ", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Update product
  app.put('/api/produtos/:sku2', async (req, res) => {
    const { sku2 } = req.params;
    const updateData = req.body;

    try {
      console.log('Updating product:', { sku2, updateData });

      const setEntries = Object.entries(updateData);
      const setClause = setEntries
        .map((_, index) => `${setEntries[index][0]} = $${index + 1}`)
        .join(', ');
      
      const values = [...setEntries.map(entry => entry[1]), sku2];
      
      const query = `
        UPDATE produtos 
        SET ${setClause}, last_update = NOW() 
        WHERE sku2 = $${values.length}
        RETURNING *
      `;

      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete product from Amazon and database
  app.delete('/api/produtos/:sku2/amazon', async (req, res) => {
    const { sku2 } = req.params;

    logger.info(`Delete request received for SKU2: ${sku2}`);

    if (!sku2 || sku2 === 'undefined') {
      logger.warn(`Invalid SKU2 provided: ${sku2}`);
      return res.status(400).json({ message: "Invalid SKU2." });
    }

    try {
      logger.info(`Attempting to delete product from Amazon: ${sku2}`);
      const deleteAmazonResult = await amazonAPI.deleteProduct(sku2);
      
      logger.info(`Amazon deletion result:`, deleteAmazonResult);

      if (deleteAmazonResult.success) {
        logger.info(`Successfully deleted from Amazon, now deleting from database: ${sku2}`);
        const result = await pool.query('DELETE FROM produtos WHERE sku2 = $1', [sku2]);
        
        if (result.rowCount > 0) {
          logger.info(`Product successfully deleted from both Amazon and database: ${sku2}`);
          return res.json({ message: 'Product successfully deleted from Amazon and database' });
        } else {
          logger.warn(`Product deleted from Amazon but not found in database: ${sku2}`);
          return res.status(404).json({ message: 'Product deleted on Amazon, but not found in database' });
        }
      } else {
        logger.error(`Failed to delete product from Amazon: ${sku2}`, deleteAmazonResult.error);
        return res.status(500).json({ 
          message: 'Error deleting product on Amazon', 
          error: deleteAmazonResult.error,
          details: deleteAmazonResult
        });
      }
    } catch (error) {
      logger.error('Error in delete product route:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Delete product only from database
  app.delete('/api/produtos/:sku2', async (req, res) => {
    const { sku2 } = req.params;

    if (!sku2 || sku2 === 'undefined') {
      return res.status(400).json({ message: "Invalid SKU2." });
    }

    try {
      const result = await pool.query('DELETE FROM produtos WHERE sku2 = $1', [sku2]);
      if (result.rowCount > 0) {
        return res.json({ message: 'Product successfully deleted from database' });
      } else {
        return res.status(404).json({ message: 'Product not found in database' });
      }
    } catch (error) {
      logger.error('Error deleting product from database:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });



  // Get customer shipping price by ASIN
  app.get('/api/produtos/shipping/:asin', async (req, res) => {
    const { asin } = req.params;

    if (!asin) {
      return res.status(400).json({ error: 'ASIN is required' });
    }

    try {
      const query = 'SELECT customer_price_shipping FROM produtos WHERE asin = $1';
      const result = await pool.query(query, [asin]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        asin,
        customer_price_shipping: result.rows[0].customer_price_shipping
      });
    } catch (err) {
      console.error('Error fetching customer_price_shipping:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


};
