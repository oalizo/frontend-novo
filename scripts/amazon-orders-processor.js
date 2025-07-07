require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');

// =================== RATE LIMITING CONFIG ===================
const RATE_LIMITS = {
  getOrders: 0.0167, // 1 request per 60 seconds (3600 requests per hour)
  getOrderItems: 0.5  // 0.5 requests per second (1800 requests per hour)
};

const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 300000, // 5 minutes
  jitterFactor: 0.1
};

// =================== DATABASE CONFIG ===================
const dbConfig = {
  host: "aws-0-us-east-1.pooler.supabase.com",
  database: "postgres",
  user: "postgres.bvbnofnnbfdlnpuswlgy",
  password: "Bi88An6B9L0EIihL",
  port: 6543,
  ssl: { rejectUnauthorized: false }
};

// =================== AMAZON SP-API CONFIG ===================
let credentials = {
  refresh_token: null,
  lwa_app_id: null,
  lwa_client_secret: null,
};

// =================== LOAD CREDENTIALS FROM DATABASE ===================
async function loadCredentials() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const result = await client.query(`
      SELECT client_id, client_secret, refresh_token 
      FROM amazon_credentials 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const cred = result.rows[0];
      credentials.refresh_token = cred.refresh_token;
      credentials.lwa_app_id = cred.client_id;
      credentials.lwa_client_secret = cred.client_secret;
      console.log('✅ Amazon credentials loaded from database');
    } else {
      throw new Error('No Amazon credentials found in database');
    }
  } finally {
    await client.end();
  }
}

// =================== RATE LIMITER ===================
class RateLimiter {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.intervalMs = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
  }

  async acquire() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.intervalMs) {
      const delayMs = this.intervalMs - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delayMs}ms`);
      await this.sleep(delayMs);
    }
    
    this.lastRequestTime = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =================== RATE LIMITERS ===================
const rateLimiters = {
  getOrders: new RateLimiter(RATE_LIMITS.getOrders),
  getOrderItems: new RateLimiter(RATE_LIMITS.getOrderItems)
};

// =================== RETRY LOGIC ===================
async function retryWithBackoff(operation, operationName = 'operation', retries = RETRY_CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status < 600)) {
        if (attempt === retries) {
          console.error(`❌ ${operationName} failed after ${retries} attempts:`, error.message);
          throw error;
        }

        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1) + 
          Math.random() * RETRY_CONFIG.baseDelay * RETRY_CONFIG.jitterFactor,
          RETRY_CONFIG.maxDelay
        );

        console.log(`🔄 Rate limit hit (attempt ${attempt}/${retries}) for ${operationName}`);
        console.log(`   Waiting ${Math.round(delay)}ms before retry...`);
        
        // Check for rate limit info in response headers
        if (error.response?.headers['x-amzn-ratelimit-limit']) {
          console.log(`   Rate limit: ${error.response.headers['x-amzn-ratelimit-limit']}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-retryable errors, throw immediately
      throw error;
    }
  }
}

// =================== GET ACCESS TOKEN ===================
async function getAccessToken() {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const response = await axios.post('https://api.amazon.com/auth/o2/token', {
    grant_type: 'refresh_token',
    refresh_token: credentials.refresh_token,
    client_id: credentials.lwa_app_id,
    client_secret: credentials.lwa_client_secret,
  });
  
  return response.data.access_token;
}

// =================== CHECK IF ORDER EXISTS ===================
async function checkOrderExists(client, orderId) {
  const result = await client.query('SELECT order_id FROM orders WHERE order_id = $1', [orderId]);
  return result.rowCount > 0;
}

// =================== CALCULATE FEES ===================
async function calculateFees(asin, price, headers, marketplaceId) {
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
    await rateLimiters.getOrderItems.acquire();
    
    const response = await retryWithBackoff(async () => {
      return await axios.post(feesEndpoint, body, { headers: headersWithContentType });
    }, `calculateFees for ${asin}`);

    const feesEstimate = response.data?.payload?.FeesEstimateResult?.FeesEstimate;
    if (feesEstimate?.TotalFeesEstimate?.Amount !== undefined) {
      const fee = parseFloat(feesEstimate.TotalFeesEstimate.Amount);
      console.log(`💰 Fee calculated for ASIN ${asin}: $${fee}`);
      return fee;
    }
  } catch (error) {
    console.error(`❌ Error calculating fee for ASIN ${asin}:`, error.message);
  }
  
  return 0.0;
}

// =================== GET SHIPPING COST ===================
async function getShippingCost(asin) {
  try {
    const shippingUrl = `http://167.114.223.83:3007/api/produtos/shipping/${asin}`;
    const response = await axios.get(shippingUrl, { timeout: 10000 });
    
    if (response.status === 200) {
      const shippingCost = parseFloat(response.data?.customer_price_shipping || 0.0);
      console.log(`🚚 Shipping cost for ASIN ${asin}: $${shippingCost}`);
      return shippingCost;
    }
  } catch (error) {
    console.error(`❌ Error fetching shipping cost for ASIN ${asin}:`, error.message);
  }
  
  return 0.0;
}

// =================== PROCESS ORDER ITEMS ===================
async function processOrderItems(orderId, headers, endpoint, marketplaceId) {
  const processedItems = [];
  const itemsUrl = `${endpoint}/orders/v0/orders/${orderId}/orderItems`;
  
  try {
    await rateLimiters.getOrderItems.acquire();
    
    const response = await retryWithBackoff(async () => {
      return await axios.get(itemsUrl, { headers });
    }, `processOrderItems for ${orderId}`);

    const orderItems = response.data?.payload?.OrderItems || [];
    
    for (const item of orderItems) {
      try {
        const asin = item.ASIN;
        const amazonPrice = parseFloat(item.ItemPrice?.Amount || 0);
        
        const [amzFee, customerShipping] = await Promise.all([
          calculateFees(asin, amazonPrice, headers, marketplaceId),
          getShippingCost(asin)
        ]);
        
        const processedItem = {
          title: item.Title,
          sku: item.SellerSKU,
          asin: asin,
          amazon_price: amazonPrice,
          quantity_sold: item.QuantityOrdered,
          amz_fee: amzFee,
          customer_shipping: customerShipping
        };
        
        processedItems.push(processedItem);
        console.log(`✅ Successfully processed item: ASIN=${asin}, Price=$${amazonPrice}, Fee=$${amzFee}, Shipping=$${customerShipping}`);
        
      } catch (error) {
        console.error(`❌ Error processing item for order ${orderId}:`, error.message);
        continue;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to get items for order ${orderId}:`, error.message);
  }
  
  return processedItems;
}

// =================== INSERT NEW ORDER ===================
async function insertNewOrder(client, order, headers, endpoint, marketplaceId) {
  if (order.FulfillmentChannel !== "MFN") {
    console.log(`⏭️ Skipping non-MFN order ${order.AmazonOrderId}`);
    return 0;
  }

  const orderId = order.AmazonOrderId;
  console.log(`🆕 Processing new MFN order: ${orderId}`);
  let insertedCount = 0;
  
  const processedItems = await processOrderItems(orderId, headers, endpoint, marketplaceId);
  
  for (const item of processedItems) {
    try {
      await client.query(`
        INSERT INTO orders (
          purchase_date, order_id, order_status, fulfillment_channel, 
          latest_ship_date, title, sku, asin, amazon_price, quantity_sold,
          amazon_fee, customer_shipping
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        formatDate(order.PurchaseDate),
        orderId,
        order.OrderStatus,
        order.FulfillmentChannel,
        formatDate(order.LatestShipDate || ""),
        item.title,
        item.sku,
        item.asin,
        item.amazon_price,
        item.quantity_sold,
        item.amz_fee,
        item.customer_shipping
      ]);
      
      insertedCount++;
      console.log(`✅ Inserted new item for order ${orderId}: ASIN=${item.asin}`);
    } catch (error) {
      console.error(`❌ Error inserting order ${orderId}, ASIN ${item.asin}:`, error.message);
      continue;
    }
  }
  
  console.log(`📦 Inserted ${insertedCount} items for order ${orderId}`);
  return insertedCount;
}

// =================== STATUS UPDATE LOGIC ===================
function shouldUpdateStatus(existingStatus, newStatus) {
  const allowedUpdates = {
    "Pending": ["Unshipped", "Canceled"]
  };
  
  if (allowedUpdates[existingStatus] && allowedUpdates[existingStatus].includes(newStatus)) {
    console.log(`✅ Status update allowed: ${existingStatus} -> ${newStatus}`);
    return true;
  }
  
  console.log(`⏭️ Status update not allowed: ${existingStatus} -> ${newStatus}`);
  return false;
}

// =================== UPDATE EXISTING ORDER ===================
async function updateExistingOrder(client, order, headers, endpoint, marketplaceId) {
  let updatedCount = 0;
  const orderId = order.AmazonOrderId;
  const newStatus = order.OrderStatus;

  // Get existing order details
  const result = await client.query(
    'SELECT order_status, amazon_fee FROM orders WHERE order_id = $1',
    [orderId]
  );
  
  if (result.rowCount === 0) return 0;
  
  const existingStatus = result.rows[0].order_status;
  const existingFee = parseFloat(result.rows[0].amazon_fee || 0);

  // Check if status update is allowed
  if (shouldUpdateStatus(existingStatus, newStatus)) {
    await client.query(
      'UPDATE orders SET order_status = $1 WHERE order_id = $2',
      [newStatus, orderId]
    );
    updatedCount++;
    console.log(`📝 Updated order ${orderId} status: ${existingStatus} -> ${newStatus}`);
  }

  // Recalculate fees for orders with zero fees
  if (existingFee === 0) {
    console.log(`🔄 Recalculating fees for order ${orderId}`);
    const processedItems = await processOrderItems(orderId, headers, endpoint, marketplaceId);
    
    for (const item of processedItems) {
      await client.query(`
        UPDATE orders SET 
          amazon_fee = $1,
          customer_shipping = $2
        WHERE order_id = $3 AND asin = $4
      `, [
        item.amz_fee,
        item.customer_shipping,
        orderId,
        item.asin
      ]);
      updatedCount++;
      console.log(`💰 Updated fees for order ${orderId}, ASIN ${item.asin}: Fee=$${item.amz_fee}, Shipping=$${item.customer_shipping}`);
    }
  }

  return updatedCount;
}

// =================== DATE FORMATTING ===================
function formatDate(dateStr) {
  try {
    return new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.error(`❌ Date format error: ${dateStr}`);
    return dateStr;
  }
}

// =================== MAIN PROCESS ORDERS FUNCTION ===================
async function processOrders() {
  console.log('🚀 Starting Amazon order processing...');
  
  let client;
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    // Load Amazon credentials from database
    await loadCredentials();

    // Database connection
    client = new Client(dbConfig);
    await client.connect();
    console.log('✅ Database connected successfully');

    // Get access token
    const accessToken = await getAccessToken();
    const endpoint = "https://sellingpartnerapi-na.amazon.com";
    const marketplaceId = "ATVPDKIKX0DER";
    const headers = {
      "x-amz-access-token": accessToken,
      "Accept": "application/json"
    };

    // Date range - last 2 days like Python script
    const daysToFetch = 2;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);
    startDate.setHours(0, 0, 0, 0);

    const params = {
      MarketplaceIds: marketplaceId,
      CreatedAfter: startDate.toISOString(),
      FulfillmentChannels: "MFN"
    };

    console.log(`📅 Fetching orders from: ${startDate.toISOString()}`);

    let nextToken = null;
    do {
      if (nextToken) {
        params.NextToken = nextToken;
      }

      console.log('📡 Making API request to Amazon...');
      
      await rateLimiters.getOrders.acquire();
      
      const response = await retryWithBackoff(async () => {
        const url = `${endpoint}/orders/v0/orders`;
        return await axios.get(url, { headers, params });
      }, 'getOrders');

      const orders = response.data?.payload?.Orders || [];
      console.log(`📦 Retrieved ${orders.length} orders from this page`);

      // Process each order
      for (const order of orders) {
        try {
          const orderId = order.AmazonOrderId;
          const orderExists = await checkOrderExists(client, orderId);

          if (orderExists) {
            const updated = await updateExistingOrder(client, order, headers, endpoint, marketplaceId);
            updatedCount += updated;
          } else {
            const inserted = await insertNewOrder(client, order, headers, endpoint, marketplaceId);
            insertedCount += inserted;
          }
        } catch (error) {
          console.error(`❌ Error processing order ${order.AmazonOrderId}:`, error.message);
          continue;
        }
      }

      nextToken = response.data?.payload?.NextToken;
      if (!nextToken) {
        console.log('📄 Page completed. NextToken: none');
        break;
      } else {
        console.log('📄 Page completed. Moving to next page...');
      }

    } while (nextToken);

    console.log('\n=== SUMMARY ===');
    console.log(`Total orders processed: ${insertedCount + updatedCount}`);
    console.log(`New orders inserted: ${insertedCount}`);
    console.log(`Orders updated: ${updatedCount}`);
    console.log('Processing completed successfully!');
    
    // Return summary object for scheduler
    return {
      processedOrders: insertedCount + updatedCount,
      newOrders: insertedCount,
      updatedOrders: updatedCount,
      totalValue: 0, // TODO: calculate total value if needed
      success: true
    };

  } catch (error) {
    console.error('❌ Critical error during order processing:', error.message);
    
    // Return error object for scheduler
    return {
      processedOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      totalValue: 0,
      success: false,
      error: error.message
    };
    
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
  }
}

module.exports = { processOrders };
