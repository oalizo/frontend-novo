require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');

// Database config
const dbConfig = {
  host: "aws-0-us-east-1.pooler.supabase.com",
  database: "postgres",
  user: "postgres.bvbnofnnbfdlnpuswlgy",
  password: "Bi88An6B9L0EIihL",
  port: 6543,
  ssl: { rejectUnauthorized: false }
};

// Rate limiting
let lastRequestTime = 0;
const RATE_LIMIT_MS = 1000; // 1 second between requests

async function rateLimit(operation) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return operation;
}

// Get access token function
async function getAccessToken() {
  const client = new Client(dbConfig);
  await client.connect();
  
  const result = await client.query(`
    SELECT client_id, client_secret, refresh_token 
    FROM amazon_credentials 
    ORDER BY updated_at DESC 
    LIMIT 1
  `);
  
  await client.end();
  
  if (result.rows.length === 0) {
    throw new Error('No Amazon credentials found in database');
  }
  
  const cred = result.rows[0];
  
  const tokenResponse = await axios.post('https://api.amazon.com/auth/o2/token', {
    grant_type: 'refresh_token',
    refresh_token: cred.refresh_token,
    client_id: cred.client_id,
    client_secret: cred.client_secret,
  });
  
  return tokenResponse.data.access_token;
}

// Replicate the exact calculateFees function from the server
async function calculateFees(asin, price, headers, marketplaceId) {
  console.log(`🔍 calculateFees called with: ASIN=${asin}, Price=${price}`);
  
  if (price <= 0) {
    console.warn(`Price is zero for ASIN ${asin}. This should be investigated.`);
    return 0.0;
  }

  const feesEndpoint = `https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/${asin}/feesEstimate`;
  const headersWithContentType = {
    ...headers,
    'Content-Type': 'application/json'
  };

  const body = {
    FeesEstimateRequest: {
      MarketplaceId: marketplaceId,
      IsAmazonFulfilled: false,
      PriceToEstimateFees: {
        ListingPrice: {
          CurrencyCode: "USD",
          Amount: price.toString()
        },
        Shipping: {
          CurrencyCode: "USD",
          Amount: "0.00"
        }
      },
      Identifier: asin
    }
  };

  try {
    console.log(`📡 Making fees API request for ASIN ${asin}...`);
    
    const response = await rateLimit(
      axios.post(feesEndpoint, body, { headers: headersWithContentType })
    );

    console.log(`✅ Fees API response received for ASIN ${asin}`);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    const feesEstimate = response.data?.payload?.FeesEstimateResult?.FeesEstimate;
    console.log('feesEstimate:', JSON.stringify(feesEstimate, null, 2));
    
    if (feesEstimate?.TotalFeesEstimate?.Amount !== undefined) {
      const fee = parseFloat(feesEstimate.TotalFeesEstimate.Amount);
      console.log(`💰 Fee calculated for ASIN ${asin}: $${fee}`);
      return fee;
    }

    console.log(`❌ No fee estimate returned for ASIN ${asin}`);
    return 0.0;
  } catch (error) {
    console.error(`❌ Error calculating fees for ASIN ${asin}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return 0.0;
  }
}

// Test function
async function testCalculateFees() {
  console.log('🧪 Testing calculateFees function specifically...');
  
  try {
    // Get access token
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');
    
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json'
    };
    
    const marketplaceId = 'ATVPDKIKX0DER';
    
    // Test with real ASIN and price from the logs
    const testASIN = 'B0CZS8RZVN';
    const testPrice = 315.79;
    
    console.log(`\n🔬 Testing calculateFees with ASIN=${testASIN}, Price=${testPrice}`);
    
    const fee = await calculateFees(testASIN, testPrice, headers, marketplaceId);
    
    console.log(`\n🎯 FINAL RESULT: Fee for ASIN ${testASIN} is $${fee}`);
    
    if (fee > 0) {
      console.log('✅ SUCCESS! Fee calculation is working correctly');
    } else {
      console.log('❌ FAILURE! Fee calculation returned 0');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCalculateFees();
