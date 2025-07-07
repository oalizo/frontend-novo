const axios = require('axios');
const db = require('../db');
const logger = require('../utils/logger');

class AmazonService {
  constructor() {
    this.region = 'us-east-1';
    this.host = 'sellingpartnerapi-na.amazon.com';
    this.credentials = null;
  }

  async loadCredentials() {
    try {
      // Buscar credenciais da Amazon do banco de dados
      const result = await db.query('SELECT * FROM amazon_credentials WHERE store_id = $1 LIMIT 1', ['OMD']);
      
      if (result.rows.length === 0) {
        throw new Error('Amazon credentials not found for OMD store');
      }
      
      this.credentials = result.rows[0];
      return this.credentials;
    } catch (error) {
      logger.error('Error loading Amazon credentials:', error);
      throw new Error(`Failed to load Amazon credentials: ${error.message}`);
    }
  }

  async getAccessToken() {
    try {
      if (!this.credentials) {
        await this.loadCredentials();
      }
      
      const res = await axios.post('https://api.amazon.com/auth/o2/token', null, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        params: {
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refresh_token,
          client_id: this.credentials.client_id,
          client_secret: this.credentials.client_secret
        }
      });
      
      return res.data.access_token;
    } catch (error) {
      logger.error('Error getting Amazon access token:', error);
      throw new Error(`Failed to get Amazon access token: ${error.message}`);
    }
  }

  async updateInventory(sku2, price, quantity) {
    try {
      if (!sku2) {
        throw new Error('SKU2 is required for Amazon inventory update');
      }
      
      // Garantir que a quantidade seja pelo menos 1
      const safeQuantity = quantity <= 0 ? 0 : quantity;
      
      // Obter token de acesso
      const accessToken = await this.getAccessToken();
      const sellerId = this.credentials.seller_id;
      const marketplaceId = this.credentials.marketplace_id;
      const path = `/listings/2021-08-01/items/${sellerId}/${sku2}?marketplaceIds=${marketplaceId}`;
      
      logger.info(`Updating Amazon inventory for SKU2: ${sku2}, Price: ${price}, Quantity: ${safeQuantity}`);
      
      // Preparar payload para atualização
      const payload = {
        productType: "PRODUCT",
        patches: [
          {
            op: "replace",
            path: "/attributes/purchasable_offer",
            value: [
              {
                audience: "ALL",
                currency: "USD",
                marketplace_id: marketplaceId,
                our_price: [
                  {
                    schedule: [
                      {
                        value_with_tax: price
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            op: "replace",
            path: "/attributes/fulfillment_availability",
            value: [
              {
                fulfillment_channel_code: "DEFAULT",
                quantity: safeQuantity
              }
            ]
          }
        ]
      };
      
      // Configurar requisição para a Amazon
      const headers = {
        'Content-Type': 'application/json',
        'x-amz-access-token': accessToken
      };
      
      // Enviar requisição para a Amazon
      const response = await axios({
        method: 'PATCH',
        url: `https://${this.host}${path}`,
        headers: headers,
        data: payload
      });
      
      logger.info(`Amazon inventory update successful for SKU2: ${sku2}`);
      return {
        success: true,
        message: `Amazon inventory updated successfully for SKU2: ${sku2}`,
        data: response.data
      };
    } catch (error) {
      logger.error(`Error updating Amazon inventory for SKU2 ${sku2}:`, error.message);
      
      // Extrair mensagem de erro mais detalhada da resposta da Amazon, se disponível
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        // Logar detalhes completos do erro
        logger.error('Amazon API Error Details:', JSON.stringify(error.response.data, null, 2));
        errorMessage = JSON.stringify(error.response.data);
      }
      
      return {
        success: false,
        message: `Failed to update Amazon inventory: ${errorMessage}`
      };
    }
  }
}

module.exports = new AmazonService();
