const logger = require('./logger');

class AmazonAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.credentials = null;
    this.pool = null;
  }

  setPool(pool) {
    this.pool = pool;
  }

  async loadCredentials() {
    try {
      if (!this.pool) {
        throw new Error('Database pool not set');
      }
      
      // Buscar credenciais da Amazon do banco de dados
      const result = await this.pool.query(`
        SELECT seller_id, client_id, client_secret, refresh_token, marketplace_id 
        FROM amazon_credentials 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        throw new Error('Amazon credentials not found in database');
      }
      
      this.credentials = result.rows[0];
      logger.info('Amazon credentials loaded from database successfully');
      return this.credentials;
    } catch (error) {
      logger.error('Error loading Amazon credentials from database:', error);
      throw error;
    }
  }

  async getNewAccessToken() {
    logger.info('Getting new access token...');
    
    // Carregar credenciais do banco se ainda não foram carregadas
    if (!this.credentials) {
      await this.loadCredentials();
    }
    
    if (!this.credentials) {
      logger.error('No Amazon credentials available');
      return null;
    }
    
    logger.info('LWA_CLIENT_ID:', this.credentials.client_id ? 'SET' : 'NOT SET');
    logger.info('LWA_CLIENT_SECRET:', this.credentials.client_secret ? 'SET' : 'NOT SET');
    logger.info('LWA_REFRESH_TOKEN:', this.credentials.refresh_token ? 'SET' : 'NOT SET');
    
    if (!this.credentials.client_id || !this.credentials.client_secret || !this.credentials.refresh_token) {
      logger.error('Missing required LWA credentials in database');
      return null;
    }
    
    const url = "https://api.amazon.com/auth/o2/token";
    const payload = new URLSearchParams({
      "grant_type": "refresh_token",
      "refresh_token": this.credentials.refresh_token,
      "client_id": this.credentials.client_id,
      "client_secret": this.credentials.client_secret,
    });

    try {
      logger.info('Sending request to Amazon LWA token endpoint...');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload,
      });

      logger.info(`LWA response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        this.tokenExpiry = new Date(new Date().getTime() + 30 * 60000);
        this.accessToken = data.access_token;
        logger.info('New access token obtained successfully');
        return this.accessToken;
      }
      
      let errorData;
      try {
        errorData = await response.json();
        logger.error('LWA error response:', errorData);
      } catch (parseError) {
        logger.error(`Failed to parse LWA error response. Status: ${response.status}, StatusText: ${response.statusText}`);
      }
      
      logger.error(`Failed to obtain access token: ${response.status}`);
      return null;
    } catch (error) {
      logger.error('Error obtaining access token:', error);
      return null;
    }
  }

  async deleteProduct(sku) {
    logger.info(`Attempting to delete product from Amazon with SKU: ${sku}`);
    
    // Carregar credenciais do banco se ainda não foram carregadas
    if (!this.credentials) {
      await this.loadCredentials();
    }
    
    if (!this.credentials) {
      logger.error('No Amazon credentials available');
      return { success: false, error: 'Missing Amazon API configuration' };
    }
    
    // Verificar se as credenciais necessárias estão configuradas
    if (!this.credentials.seller_id || !this.credentials.marketplace_id) {
      logger.error('Missing required credentials: SELLER_ID or MARKETPLACE_ID');
      return { success: false, error: 'Missing Amazon API configuration' };
    }

    const url = `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${this.credentials.seller_id}/${sku}?marketplaceIds=${this.credentials.marketplace_id}&issueLocale=en_US`;
    logger.info(`Amazon API URL: ${url}`);

    if (!this.accessToken || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      logger.info('Access token expired or missing, obtaining new token...');
      this.accessToken = await this.getNewAccessToken();
      if (!this.accessToken) {
        logger.error('Failed to obtain access token');
        return { success: false, error: 'Failed to obtain access token' };
      }
    }

    const headers = {
      'x-amz-access-token': this.accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Amz-Date': new Date().toISOString(),
    };

    try {
      logger.info('Sending DELETE request to Amazon API...');
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      logger.info(`Amazon API response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        logger.info('Amazon API response data:', responseData);
        
        if (responseData.status === 'ACCEPTED') {
          logger.info(`Product deletion accepted by Amazon. Submission ID: ${responseData.submissionId}`);
          return { success: true, submissionId: responseData.submissionId };
        }
        
        logger.warn('Product deletion not accepted by Amazon:', responseData.issues);
        return { success: false, error: responseData.issues };
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      logger.error('Amazon API error response:', errorData);
      return { success: false, error: errorData };
    } catch (error) {
      logger.error('Error deleting product on Amazon:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AmazonAPI();
