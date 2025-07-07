const db = require('../db');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class InventoryService {
  constructor() {
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  }

  async createInventoryItem({ store, supplier_order_id, asin, quantity, title, status, cost_price }) {
    // Validate required fields
    if (!store || !asin || !status) {
      throw new Error('Store, ASIN and status are required');
    }

    try {
      const result = await db.query(
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

      // Invalidate cache for this ASIN
      cache.del(`inventory_status_${asin}`);

      logger.info('Created inventory item:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in createInventoryItem:', error);
      throw error;
    }
  }

  async getInventoryItems({ page = 1, size = 50, search, status, store }) {
    try {
      const offset = (page - 1) * size;
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

      const result = await db.query(query, params);

      return {
        data: result.rows,
        total: parseInt(result.rows[0]?.total_count || '0')
      };
    } catch (error) {
      logger.error('Error in getInventoryItems:', error);
      throw error;
    }
  }

  async updateInventoryItem(id, updates) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state before update
      const currentState = await client.query(
        'SELECT * FROM inventory WHERE id = $1',
        [id]
      );

      if (currentState.rows.length === 0) {
        throw new Error('Inventory item not found');
      }

      const current = currentState.rows[0];

      // Perform the update
      const setClause = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      const values = [...Object.values(updates), id];

      const result = await client.query(`
        UPDATE inventory 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
        RETURNING *
      `, values);

      // Record history if quantity changed
      if (updates.quantity !== undefined && updates.quantity !== current.quantity) {
        await this._recordQuantityChange(
          client,
          id,
          current.quantity,
          updates.quantity
        );
      }

      // Invalidate cache for this ASIN
      cache.del(`inventory_status_${current.asin}`);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in updateInventoryItem:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteInventoryItem(id) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the ASIN before deleting
      const getAsinResult = await client.query(
        'SELECT asin FROM inventory WHERE id = $1',
        [id]
      );

      if (getAsinResult.rows.length === 0) {
        throw new Error('Inventory item not found');
      }

      const { asin } = getAsinResult.rows[0];

      const result = await client.query(
        'DELETE FROM inventory WHERE id = $1 RETURNING *',
        [id]
      );

      // Invalidate cache for this ASIN
      cache.del(`inventory_status_${asin}`);

      await client.query('COMMIT');
      return { message: 'Inventory item deleted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in deleteInventoryItem:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkInventoryStatus(asin) {
    if (!asin) {
      throw new Error('ASIN parameter is required');
    }

    try {
      logger.info(`Checking inventory for ASIN: ${asin}`);

      // Check cache first
      const cacheKey = `inventory_status_${asin}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for ASIN: ${asin}`);
        return cached;
      }

      logger.info(`Cache miss for ASIN: ${asin}`);

      const result = await db.query(
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
      cache.set(cacheKey, data, this.CACHE_TTL);

      logger.info(`Cache updated for ASIN: ${asin}`);
      return data;
    } catch (error) {
      logger.error('Error in checkInventoryStatus:', error);
      throw error;
    }
  }

  async getInventoryHistory(id) {
    try {
      const result = await db.query(`
        SELECT 
          ih.*,
          i.asin,
          i.title
        FROM inventory_history ih
        JOIN inventory i ON i.id = ih.inventory_id 
        WHERE inventory_id = $1
        ORDER BY changed_at DESC
      `, [id]);

      return result.rows;
    } catch (error) {
      logger.error('Error in getInventoryHistory:', error);
      throw error;
    }
  }

  // Private helper methods
  async _recordQuantityChange(client, inventoryId, oldQuantity, newQuantity) {
    await client.query(`
      INSERT INTO inventory_history (
        inventory_id,
        old_quantity,
        new_quantity,
        changed_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [inventoryId, oldQuantity, newQuantity]);
  }
}

module.exports = new InventoryService();
