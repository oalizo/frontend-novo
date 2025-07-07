require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

async function debugFetch() {
  console.log('🔍 Debug fetch test...');
  
  // Get credentials from database
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM amazon_credentials WHERE store_id = $1', ['OMD']);
  client.release();
  
  const credentials = result.rows[0];
  console.log('Store ID:', credentials.store_id);
  console.log('Marketplace ID:', credentials.marketplace_id);
  
  // Get access token
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', credentials.refresh_token);
  params.append('client_id', credentials.client_id);
  params.append('client_secret', credentials.client_secret);

  const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const accessToken = tokenResponse.data.access_token;
  console.log('✅ Access token obtained');
  
  // Test different date formats and periods
  const testDates = [
    // Last 2 days with different formats
    {
      name: '2 days - toISOString()',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: '2 days - with Z suffix',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, -1) + 'Z'
    },
    {
      name: '2 days - milliseconds format',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 23) + 'Z'
    },
    // Last 7 days
    {
      name: '7 days - toISOString()',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  for (const testDate of testDates) {
    console.log(`\n📅 Testing ${testDate.name}: ${testDate.date}`);
    
    try {
      const response = await axios.get('https://sellingpartnerapi-na.amazon.com/orders/v0/orders', {
        headers: {
          'x-amz-access-token': accessToken,
          'Accept': 'application/json'
        },
        params: {
          MarketplaceIds: credentials.marketplace_id,
          CreatedAfter: testDate.date,
          MaxResultsPerPage: 10
        }
      });
      
      const orders = response.data?.payload?.Orders || [];
      console.log(`  ✅ Status: ${response.status}, Orders found: ${orders.length}`);
      
      if (orders.length > 0) {
        console.log(`  📦 First order: ${orders[0].AmazonOrderId} - ${orders[0].OrderStatus}`);
        console.log(`  📦 Purchase date: ${orders[0].PurchaseDate}`);
      }
      
      // Show the full response structure for first test
      if (testDate.name.includes('2 days - toISOString()')) {
        console.log('  📄 Response structure:');
        console.log('    - response.data keys:', Object.keys(response.data || {}));
        console.log('    - payload keys:', Object.keys(response.data?.payload || {}));
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.response?.status} - ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }
  
  await pool.end();
}

debugFetch().catch(console.error);
