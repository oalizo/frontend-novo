const db = require('../db');
const logger = require('../utils/logger');
const amazonAPI = require('../utils/amazon');

class ProductService {
  async getFilterOptions() {
    try {
      const [availabilityResult, sourceResult] = await Promise.all([
        db.query('SELECT DISTINCT availability FROM produtos WHERE availability IS NOT NULL'),
        db.query('SELECT DISTINCT source FROM produtos WHERE source IS NOT NULL')
      ]);

      return {
        availabilityOptions: availabilityResult.rows.map(row => row.availability),
        sourceOptions: sourceResult.rows.map(row => row.source)
      };
    } catch (error) {
      logger.error('Error in getFilterOptions:', error);
      throw new Error('Failed to fetch filter options');
    }
  }

  async getProducts({ page = 1, size = 50, search, asin, sku2, brand, availability, source }) {
    try {
      const offset = (page - 1) * size;
      let query = 'SELECT * FROM produtos WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(sku2) LIKE $${paramCount} OR LOWER(asin) LIKE $${paramCount} OR LOWER(brand) LIKE $${paramCount})`;
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
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      query += ' ORDER BY last_update DESC';
      query += ` LIMIT ${size} OFFSET ${offset}`;

      const result = await db.query(query, params);
      
      return {
        message: "success",
        data: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error in getProducts:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async updateProduct(sku2, updateData) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      logger.info('Updating product:', { sku2, updateData });

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

      logger.info('Update query:', { query, values });

      const { rows } = await client.query(query, values);

      if (rows.length === 0) {
        throw new Error('Product not found');
      }

      await client.query('COMMIT');
      logger.info('Updated product:', rows[0]);
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in updateProduct:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProductFromAmazon(sku2) {
    if (!sku2 || sku2 === 'undefined') {
      throw new Error('Invalid SKU2');
    }

    try {
      const deleteAmazonResult = await amazonAPI.deleteProduct(sku2);

      if (deleteAmazonResult.success) {
        const deleteDbResult = await this.deleteProduct(sku2);
        if (deleteDbResult.success) {
          return { message: 'Product successfully deleted from Amazon and database' };
        }
        return { message: 'Product deleted on Amazon, but not found in database' };
      }
      
      throw new Error('Error deleting product on Amazon');
    } catch (error) {
      logger.error('Error in deleteProductFromAmazon:', error);
      throw error;
    }
  }

  async deleteProduct(sku2) {
    if (!sku2 || sku2 === 'undefined') {
      throw new Error('Invalid SKU2');
    }

    try {
      const result = await db.query('DELETE FROM produtos WHERE sku2 = $1', [sku2]);
      if (result.rowCount > 0) {
        return { success: true, message: 'Product successfully deleted from database' };
      }
      return { success: false, error: 'Product not found in database' };
    } catch (error) {
      logger.error('Error in deleteProduct:', error);
      throw error;
    }
  }

  async getShippingPrice(asin) {
    if (!asin) {
      throw new Error('ASIN is required');
    }

    try {
      const query = 'SELECT customer_price_shipping FROM produtos WHERE asin = $1';
      const result = await db.query(query, [asin]);

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      return {
        asin,
        customer_price_shipping: result.rows[0].customer_price_shipping
      };
    } catch (error) {
      logger.error('Error in getShippingPrice:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();
