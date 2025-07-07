const productRefreshService = require('../services/productRefreshService');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  console.log('Registrando rota de atualização de produtos: /api/produtos/:sku/refresh');
  
  // Refresh product data from source
  app.post('/api/produtos/:sku/refresh', async (req, res) => {
    console.log(`Recebida solicitação para atualizar produto com SKU: ${req.params.sku}`);
    const { sku } = req.params;
    
    if (!sku) {
      return res.status(400).json({ 
        success: false,
        message: 'SKU is required' 
      });
    }
    
    // Nota: Usamos o SKU para identificar o produto no banco de dados
    // e também para consultar a API externa
    
    try {
      logger.info(`Refreshing product with SKU: ${sku}`);
      const result = await productRefreshService.refreshProduct(sku);
      
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error in refresh product route:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });
};
