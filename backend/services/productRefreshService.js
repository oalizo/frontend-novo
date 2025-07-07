const axios = require('axios');
const db = require('../db');
const logger = require('../utils/logger');
const amazonService = require('./amazonService');

class ProductRefreshService {
  constructor() {
    this.baseUrl = 'http://167.114.223.83:3005';
    this.sourceEndpoints = {
      'Home Depot': '/hd/api/',
      'Webstaurantstore': '/wr/api/',
      'Best Buy': '/bb/api/',
      'Vitacost': '/vc/'
    };
  }

  async refreshProduct(sku) {
    try {
      // Get product details from database
      const productResult = await db.query('SELECT * FROM produtos WHERE sku = $1', [sku]);
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product with SKU ${sku} not found`);
      }
      
      const product = productResult.rows[0];
      const { source } = product;
      
      if (!source) {
        throw new Error('Product source is missing');
      }
      
      // Check if the source is supported
      if (!this.sourceEndpoints[source]) {
        throw new Error(`Source "${source}" is not supported for refresh`);
      }
      
      // Get updated data from the source API
      const updatedData = await this.fetchProductFromSource(source, sku);
      
      // Update product in database
      const updatedProduct = await this.updateProductInDatabase(product, updatedData);
      
      // Atualizar inventário na Amazon usando o sku2
      try {
        if (updatedProduct.sku2) {
          // Enviar atualização para a Amazon
          const amazonResult = await amazonService.updateInventory(
            updatedProduct.sku2,
            updatedProduct.supplier_price,
            updatedProduct.quantity
          );
          
          logger.info(`Amazon inventory update result for SKU2 ${updatedProduct.sku2}:`, amazonResult.success);
          
          return {
            success: true,
            message: `Product ${sku} refreshed successfully and Amazon inventory updated`,
            product: updatedProduct,
            amazonUpdate: amazonResult
          };
        }
      } catch (amazonError) {
        logger.error(`Error updating Amazon inventory for SKU2 ${updatedProduct.sku2}:`, amazonError);
        // Continuar mesmo se a atualização da Amazon falhar
      }
      
      return {
        success: true,
        message: `Product ${sku} refreshed successfully`,
        product: updatedProduct
      };
    } catch (error) {
      logger.error('Error refreshing product:', error);
      return {
        success: false,
        message: error.message || 'Failed to refresh product'
      };
    }
  }
  
  async fetchProductFromSource(source, sku) {
    try {
      // Construir o endpoint com base na fonte e no SKU
      let endpoint = this.baseUrl + this.sourceEndpoints[source] + sku;
      
      // Fazer a chamada à API externa
      const response = await axios.get(endpoint);
      
      // Verificar se a resposta contém dados
      if (!response.data) {
        throw new Error(`No data returned from ${source} API`);
      }
      
      // Verificar se a resposta contém um erro
      if (response.data.error) {
        throw new Error(`Product not found in ${source}: ${response.data.error}`);
      }
      
      return response.data;
    } catch (error) {
      // Registrar o erro de forma mais concisa
      if (error.response && error.response.status === 404) {
        // Caso específico para produto não encontrado
        logger.info(`Produto com SKU ${sku} não encontrado na fonte ${source}`);
        throw new Error(`Product not found in ${source}. The product may no longer be available.`);
      } else if (error.response && error.response.data && error.response.data.error) {
        // Erro retornado pela API externa
        logger.info(`Erro da API ${source}: ${error.response.data.error}`);
        throw new Error(`Product not found in ${source}. The product may no longer be available.`);
      }
      
      // Outros erros
      logger.error(`Erro ao consultar API ${source} para o SKU ${sku}: ${error.message}`);
      throw new Error(`Failed to fetch product data from ${source}: ${error.message}`);
    }
  }
  
  async updateProductInDatabase(product, sourceData) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const updates = this.mapSourceDataToProductUpdates(product.source, sourceData);
      
      console.log('Dados mapeados para atualização:', JSON.stringify(updates, null, 2));
      console.log('Status atual do produto:', product.availability);
      console.log('Novo status do produto:', updates.availability);
      
      // Se o produto estiver fora de estoque, a quantidade deve ser 0
      if (updates.availability === 'outofstock') {
        updates.quantity = 0;
        console.log('Quantidade definida como 0 porque o produto está fora de estoque');
      }
      
      const setEntries = Object.entries(updates);
      const setClause = setEntries
        .map((_, index) => `${setEntries[index][0]} = $${index + 1}`)
        .join(', ');
      
      const values = [...setEntries.map(entry => entry[1]), product.sku];
      
      console.log('Cláusula SET:', setClause);
      console.log('Valores para atualização:', values);
      
      const query = `
        UPDATE produtos 
        SET ${setClause}, last_update = NOW() 
        WHERE sku = $${values.length}
        RETURNING *
      `;
      
      console.log('Query SQL:', query.replace(/\s+/g, ' ').trim());
      
      const { rows } = await client.query(query, values);
      
      if (rows.length === 0) {
        throw new Error('Product not found');
      }
      
      console.log('Produto atualizado com sucesso. Novo status:', rows[0].availability);
      
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      console.error('Erro ao atualizar produto no banco de dados:', error.message);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  mapSourceDataToProductUpdates(source, data) {
    const updates = {};
    
    switch (source) {
      case 'Home Depot':
        updates.supplier_price = data.price || 0;
        if (data.available) {
          updates.availability = 'inStock';
          updates.quantity = data.stock || 10;
        } else {
          updates.availability = 'outofstock';
          updates.quantity = 0;
        }
        updates.supplier_price_shipping = data.shippingCost || 0;
        break;
        
      case 'Webstaurantstore':
        updates.supplier_price = data.Price || 0;
        // Member price if available, otherwise regular price
        if (data['Member Price']) {
          updates.supplier_price = data['Member Price'];
        }
        
        if (data.Availability === 'InStock') {
          updates.availability = 'inStock';
          updates.quantity = 10; // Assuming 10 if in stock
        } else {
          updates.availability = 'outofstock';
          updates.quantity = 0;
        }
        break;
        
      case 'Best Buy':
        if (data.success && data.data) {
          updates.supplier_price = data.data.price || 0;
          // Verificar o status de disponibilidade corretamente
          if (data.data.availability === 'InStock') {
            updates.availability = 'inStock';
            updates.quantity = 10;
          } else {
            updates.availability = 'outofstock';
            updates.quantity = 0;
          }
        }
        break;
        
      case 'Vitacost':
        if (data.success && data.data) {
          // Remove $ and convert to number
          let price = data.data.salePrice || 0;
          if (typeof price === 'string' && price.startsWith('$')) {
            price = parseFloat(price.substring(1));
          }
          
          updates.supplier_price = price;
          updates.supplier_price_shipping = data.data.shippingPrice || 0;
          
          if (data.data.status === 'OK') {
            updates.availability = 'inStock';
            updates.quantity = 10;
          } else {
            updates.availability = 'outofstock';
            updates.quantity = 0;
          }
        }
        break;
        
      default:
        throw new Error(`Source "${source}" mapping not implemented`);
    }
    
    // Calculate total price
    if (updates.supplier_price !== undefined) {
      const shipping = updates.supplier_price_shipping || 0;
      updates.total_price = updates.supplier_price + shipping;
    }
    
    return updates;
  }
}

module.exports = new ProductRefreshService();
