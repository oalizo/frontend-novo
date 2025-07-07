const db = require('../db');
const logger = require('../utils/logger');

class CheckService {
  async checkOrder(orderId, asin) {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM logistics 
          WHERE order_id = $1 
          AND archived_at IS NULL
        ) as exists,
        EXISTS (
          SELECT 1 FROM logistics 
          WHERE order_id = $1 
          AND asin = $2
          AND archived_at IS NULL
        ) as has_same_asin
      `, [orderId, asin]);
       
      const { exists, has_same_asin } = result.rows[0];
      return {
        exists: exists || false,
        hasDifferentAsin: !has_same_asin
      };
    } catch (error) {
      logger.error('Error in checkOrder:', error);
      throw error;
    }
  }
}

module.exports = new CheckService();
