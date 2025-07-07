const axios = require('axios');
const logger = require('../utils/logger');

module.exports = (app, pool) => {
  // Get all Amazon credentials
  app.get('/api/amazon-credentials', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          store_id, 
          seller_id, 
          client_id,
          client_secret,
          refresh_token,
          marketplace_id, 
          updated_at 
        FROM amazon_credentials 
        ORDER BY updated_at DESC
      `);
      
      // Mask sensitive data for security
      const maskedCredentials = result.rows.map(cred => ({
        ...cred,
        client_id: cred.client_id ? cred.client_id.substring(0, 20) + '...' : '',
        client_secret: cred.client_secret ? cred.client_secret.substring(0, 20) + '...' : '',
        refresh_token: cred.refresh_token ? cred.refresh_token.substring(0, 20) + '...' : ''
      }));
      
      res.json(maskedCredentials);
    } catch (error) {
      logger.error('Error fetching Amazon credentials:', error);
      res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  });

  // Get single Amazon credential by ID (for editing)
  app.get('/api/amazon-credentials/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          store_id, 
          seller_id, 
          client_id,
          client_secret,
          refresh_token,
          marketplace_id, 
          updated_at 
        FROM amazon_credentials 
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Credential not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching Amazon credential:', error);
      res.status(500).json({ error: 'Failed to fetch credential' });
    }
  });

  // Create new Amazon credentials
  app.post('/api/amazon-credentials', async (req, res) => {
    const { store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id } = req.body;
    
    try {
      const result = await pool.query(`
        INSERT INTO amazon_credentials (store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, store_id, seller_id, marketplace_id, updated_at
      `, [store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error creating Amazon credentials:', error);
      res.status(500).json({ error: 'Failed to create credentials' });
    }
  });

  // Update Amazon credentials
  app.put('/api/amazon-credentials/:id', async (req, res) => {
    const { id } = req.params;
    const { store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id } = req.body;
    
    try {
      const result = await pool.query(`
        UPDATE amazon_credentials 
        SET store_id = $1, seller_id = $2, client_id = $3, client_secret = $4, refresh_token = $5, marketplace_id = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING id, store_id, seller_id, marketplace_id, updated_at
      `, [store_id, seller_id, client_id, client_secret, refresh_token, marketplace_id, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Credentials not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error updating Amazon credentials:', error);
      res.status(500).json({ error: 'Failed to update credentials' });
    }
  });

  // Delete Amazon credentials
  app.delete('/api/amazon-credentials/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query('DELETE FROM amazon_credentials WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Credentials not found' });
      }
      
      res.json({ message: 'Credentials deleted successfully' });
    } catch (error) {
      logger.error('Error deleting Amazon credentials:', error);
      res.status(500).json({ error: 'Failed to delete credentials' });
    }
  });

  // Test Amazon credentials
  app.post('/api/amazon-credentials/test', async (req, res) => {
    const { client_id, client_secret, refresh_token, marketplace_id } = req.body;
    
    try {
      logger.info('🧪 Testing Amazon credentials...');
      
      // Step 1: Get access token
      logger.info('🔑 Getting access token...');
      const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
          client_id: client_id,
          client_secret: client_secret
        }), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (tokenResponse.status !== 200) {
        logger.error('❌ Failed to get access token:', tokenResponse.data);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials: Unable to get access token' 
        });
      }

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Test SP-API access
      logger.info('🔍 Testing SP-API access...');
      const apiResponse = await axios.get(`https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations`, 
        {
          headers: {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (apiResponse.status !== 200) {
        logger.error('❌ SP-API test failed:', apiResponse.data);
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Check if credentials have proper permissions' 
        });
      }

      const marketplaces = apiResponse.data.payload;
      
      // Step 3: Check if the specified marketplace is accessible
      const hasMarketplace = marketplaces.some(
        mp => mp.marketplace.id === marketplace_id
      );

      if (!hasMarketplace) {
        logger.warn('⚠️ Marketplace not found in account');
        return res.json({ 
          success: true, 
          message: 'Credentials are valid but marketplace not found in this account',
          marketplaces: marketplaces.map(mp => ({
            id: mp.marketplace.id,
            name: mp.marketplace.name,
            countryCode: mp.marketplace.countryCode
          }))
        });
      }

      logger.info('🎯 Test completed successfully');
      res.json({ 
        success: true, 
        message: 'Credentials validated successfully!' 
      });

    } catch (error) {
      logger.error('❌ Error testing credentials:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to test credentials: ' + error.message 
      });
    }
  });
};
