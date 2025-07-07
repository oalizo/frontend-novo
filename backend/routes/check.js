const express = require('express');
const router = express.Router();
const checkService = require('../services/checkService');
const logger = require('../utils/logger');

router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { asin } = req.query;

  if (!orderId || !asin) {
    return res.status(400).json({ 
      error: 'Order ID and ASIN are required',
      exists: false,
      hasDifferentAsin: true
    });
  }
  
  try {
    logger.info(`Checking order ${orderId} with ASIN ${asin}`);
    const result = await checkService.checkOrder(orderId, asin);
    res.json(result);
  } catch (err) {
    logger.error("Error checking order:", err);
    res.json({
      exists: false,
      hasDifferentAsin: true,
      error: 'Failed to check order'
    });
  }
});

module.exports = router;
