const express = require('express');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  // Create coupon endpoint
  app.post('/api/coupon', async (req, res) => {
    const { order_id, name, email, date, review } = req.body;

    // Validate required fields
    if (!order_id || !name || !email) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      // Insert coupon
      const result = await pool.query(`
        INSERT INTO cupon_bot (order_id, name, email, date, review)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, order_id, name, email, date, review
      `, [
        order_id,
        name,
        email,
        date || new Date(),
        review || null
      ]);

      res.status(201).json({
        message: "Coupon successfully inserted",
        data: result.rows[0]
      });
    } catch (err) {
      logger.error("Error creating coupon:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}; 