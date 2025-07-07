import axios from 'axios';
import { format, subDays } from 'date-fns';
import { AMAZON_CONFIG } from './config';
import { getAccessToken } from './auth';
import pool from '../db';
import { logger } from '../utils/logger';

interface AmazonOrderItem {
  purchase_date: string;
  order_id: string;
  order_status: string;
  fulfillment_channel: string;
  latest_ship_date: string;
  title: string;
  sku: string;
  asin: string;
  amazon_price: number;
  quantity_sold: number;
  amazon_fee: number;
  customer_shipping: number;
}

// Rate Limiter para controlar chamadas da API
class RateLimiter {
  private requests: Date[] = [];
  private rate: number;
  private burst: number;

  constructor(rate: number, burst: number) {
    this.rate = rate;
    this.burst = burst;
  }

  async acquire(): Promise<void> {
    const now = new Date();
    // Remove requests older than 1 second
    this.requests = this.requests.filter(req => (now.getTime() - req.getTime()) < 1000);
    
    if (this.requests.length >= this.burst) {
      const sleepTime = 1000 - (now.getTime() - this.requests[0].getTime());
      if (sleepTime > 0) {
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }
    
    this.requests.push(now);
    await new Promise(resolve => setTimeout(resolve, 1000 / this.rate));
  }
}

const rateLimiter = new RateLimiter(1, 10); // 1 req/sec, burst 10

// Regras de negócio para atualização de status
function shouldUpdateStatus(existingStatus: string, newStatus: string): boolean {
  const allowedUpdates: Record<string, Set<string>> = {
    'Pending': new Set(['Unshipped', 'Canceled'])
  };
  
  if (existingStatus in allowedUpdates && allowedUpdates[existingStatus].has(newStatus)) {
    logger.info(`Status update allowed: ${existingStatus} -> ${newStatus}`);
    return true;
  }
  
  logger.info(`Status update not allowed: ${existingStatus} -> ${newStatus}`);
  return false;
}

// Verificar se status deve ter amazon_price = 0 (não gera revenue)
function shouldZeroPrice(status: string): boolean {
  const zeroRevenueStatuses = ['Canceled', 'Refunded'];
  return zeroRevenueStatuses.includes(status);
}

async function getApiResponse(url: string, headers: any, params?: any, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimiter.acquire();
      const response = await axios.get(url, { headers, params });
      logger.info(`API Response Status: ${response.status} for URL: ${url}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn(`Rate limit hit, attempt ${attempt + 1}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, 20000));
        continue;
      }
      logger.error(`Failed request: ${error.response?.status} - ${error.message}`);
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 20000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('All retries failed');
}

async function getShippingCost(asin: string): Promise<number> {
  try {
    const shippingUrl = `http://167.114.223.83:3007/api/produtos/shipping/${asin}`;
    const response = await axios.get(shippingUrl, { timeout: 10000 });
    
    if (response.status === 200) {
      const shippingCost = parseFloat(response.data?.customer_price_shipping || 0);
      logger.info(`Shipping cost for ASIN ${asin}: $${shippingCost}`);
      return shippingCost;
    } else {
      logger.error(`Failed to get shipping cost for ASIN ${asin}: ${response.status}`);
      return 0;
    }
  } catch (error: any) {
    logger.error(`Error getting shipping cost for ASIN ${asin}:`, error.message);
    return 0;
  }
}

async function getAmzFeeForAsin(
  asin: string, 
  price: number, 
  headers: any, 
  retries = 5
): Promise<number> {
  if (price <= 0) {
    logger.warn(`Price is zero for ASIN ${asin}. This should be investigated as all orders should have a price.`);
    return 0;
  }

  const endpoint = `${AMAZON_CONFIG.API_URL}/products/fees/v0/items/${asin}/feesEstimate`;
  
  const body = {
    FeesEstimateRequest: {
      MarketplaceId: AMAZON_CONFIG.MARKETPLACE_ID,
      IdType: "ASIN",
      IdValue: asin,
      IsAmazonFulfilled: false,
      PriceToEstimateFees: {
        ListingPrice: {
          CurrencyCode: "USD",
          Amount: price
        }
      },
      Identifier: `request_${asin}`
    }
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimiter.acquire();
      const response = await axios.post(endpoint, body, {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });

      const feesEstimate = response.data?.payload?.FeesEstimateResult?.FeesEstimate;
      return feesEstimate?.TotalFeesEstimate?.Amount || 0;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      logger.error(`Failed to get fee estimate for ASIN ${asin}:`, error);
      return 0;
    }
  }

  return 0;
}

async function processOrderItems(orderId: string, headers: any, endpoint: string): Promise<AmazonOrderItem[]> {
  try {
    const itemsUrl = `${endpoint}/orders/v0/orders/${orderId}/orderItems`;
    const itemsResponse = await getApiResponse(itemsUrl, headers);
    const items = itemsResponse?.payload?.OrderItems || [];
    
    logger.info(`Processing ${items.length} items for order ${orderId}`);
    
    const processedItems: AmazonOrderItem[] = [];
    
    for (const item of items) {
      const priceInfo = item?.ItemPrice || {};
      const amazonPrice = parseFloat(priceInfo.Amount || 0);
      const asin = item.ASIN;
      
      // Calculate fees and shipping
      const amzFee = await getAmzFeeForAsin(asin, amazonPrice, headers);
      const customerShipping = await getShippingCost(asin);
      
      const processedItem: Partial<AmazonOrderItem> = {
        asin,
        title: item.Title,
        sku: item.SellerSKU,
        amazon_price: amazonPrice,
        quantity_sold: item.QuantityOrdered,
        amazon_fee: amzFee,
        customer_shipping: customerShipping
      };
      
      logger.info(`Successfully processed item: ASIN=${asin}, Price=$${amazonPrice}, Fee=$${amzFee}, Shipping=$${customerShipping}`);
      processedItems.push(processedItem as AmazonOrderItem);
    }
    
    return processedItems;
  } catch (error: any) {
    logger.error(`Error processing items for order ${orderId}:`, error);
    return [];
  }
}

async function updateExistingOrder(client: any, order: any, headers: any, endpoint: string): Promise<number> {
  const orderId = order.AmazonOrderId;
  const newStatus = order.OrderStatus;
  
  // Get existing order details
  const existingOrder = await client.query(
    'SELECT order_status, amazon_fee FROM orders WHERE order_id = $1',
    [orderId]
  );
  
  if (existingOrder.rows.length === 0) {
    logger.error(`Order ${orderId} not found in database during update attempt`);
    return 0;
  }
  
  const { order_status: existingStatus, amazon_fee: existingFee } = existingOrder.rows[0];
  let updatedCount = 0;
  
  // Check if status update is allowed
  if (shouldUpdateStatus(existingStatus, newStatus)) {
    logger.info(`Updating order ${orderId} status from ${existingStatus} to ${newStatus}`);
    
    // Se o novo status deve ter amazon_price = 0, zerar também amazon_fee
    if (shouldZeroPrice(newStatus)) {
      await client.query(`
        UPDATE orders SET 
          order_status = $1,
          latest_ship_date = $2,
          amazon_price = 0,
          amazon_fee = 0
        WHERE order_id = $3`,
        [newStatus, order.LatestShipDate, orderId]
      );
      logger.info(`Zeroed amazon_price and amazon_fee for ${newStatus} order ${orderId}`);
    } else {
      await client.query(`
        UPDATE orders SET 
          order_status = $1,
          latest_ship_date = $2
        WHERE order_id = $3`,
        [newStatus, order.LatestShipDate, orderId]
      );
    }
    updatedCount = 1;
  } else {
    logger.info(`Status update not needed for order ${orderId}: ${existingStatus} -> ${newStatus}`);
  }
  
  // Recalculate fees if they are 0 and order is not canceled/refunded
  if (existingFee === 0 && !shouldZeroPrice(newStatus)) {
    logger.info(`Order ${orderId} has fee of 0. Recalculating...`);
    const items = await processOrderItems(orderId, headers, endpoint);
    
    for (const item of items) {
      await client.query(`
        UPDATE orders SET 
          amazon_fee = $1,
          customer_shipping = $2
        WHERE order_id = $3 AND asin = $4`,
        [item.amazon_fee, item.customer_shipping, orderId, item.asin]
      );
      
      logger.info(`Updated fees for order ${orderId}, ASIN ${item.asin}: Fee=$${item.amazon_fee}, Shipping=$${item.customer_shipping}`);
      updatedCount = 1;
    }
  }
  
  return updatedCount;
}

async function insertNewOrder(client: any, order: any, headers: any, endpoint: string): Promise<number> {
  const orderId = order.AmazonOrderId;
  const orderStatus = order.OrderStatus;
  
  logger.info(`New order ${orderId} found. Inserting into database.`);
  
  if (order.FulfillmentChannel !== "MFN") {
    logger.info(`Skipping non-MFN order ${orderId}`);
    return 0;
  }
  
  const items = await processOrderItems(orderId, headers, endpoint);
  let insertedCount = 0;
  
  for (const item of items) {
    // Se o status deve ter amazon_price = 0, zerar os valores
    const finalAmazonPrice = shouldZeroPrice(orderStatus) ? 0 : item.amazon_price;
    const finalAmazonFee = shouldZeroPrice(orderStatus) ? 0 : item.amazon_fee;
    
    await client.query(`
      INSERT INTO orders (
        purchase_date, order_id, order_status, fulfillment_channel,
        latest_ship_date, title, sku, asin, amazon_price, 
        quantity_sold, amazon_fee, customer_shipping
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        order.PurchaseDate,
        orderId,
        orderStatus,
        order.FulfillmentChannel,
        order.LatestShipDate,
        item.title,
        item.sku,
        item.asin,
        finalAmazonPrice,
        item.quantity_sold,
        finalAmazonFee,
        item.customer_shipping
      ]
    );
    
    logger.info(`Inserted order ${orderId} with ${shouldZeroPrice(orderStatus) ? 'zeroed' : 'normal'} pricing`);
    insertedCount++;
  }
  
  return insertedCount;
}

export async function processOrders() {
  try {
    const accessToken = await getAccessToken();
    const endpoint = "https://sellingpartnerapi-na.amazon.com";
    const headers = {
      'x-amz-access-token': accessToken,
      'Accept': 'application/json'
    };

    // Get orders from last 2 days (same as push2.py)
    const daysToFetch = 2;
    const startDate = subDays(new Date(), daysToFetch);
    startDate.setHours(0, 0, 0, 0);
    const createdAfter = startDate.toISOString();

    logger.info(`Starting order processing for orders after: ${createdAfter}`);

    let totalOrdersProcessed = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let nextToken = null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      do {
        const params: any = {
          MarketplaceIds: AMAZON_CONFIG.MARKETPLACE_ID,
          MaxResultsPerPage: 100
        };

        if (nextToken) {
          params.NextToken = nextToken;
        } else {
          params.CreatedAfter = createdAfter;
        }

        logger.info(`Fetching page ${Math.floor(totalOrdersProcessed / 100) + 1} of orders`);
        const response = await getApiResponse(
          `${AMAZON_CONFIG.API_URL}/orders/v0/orders`,
          headers,
          params
        );

        if (!response?.payload?.Orders) {
          logger.info("No more orders to process");
          break;
        }

        const currentOrders = response.payload.Orders;
        const ordersCount = currentOrders.length;
        totalOrdersProcessed += ordersCount;
        
        logger.info(`Processing ${ordersCount} orders (Total processed: ${totalOrdersProcessed})`);

        for (const order of currentOrders) {
          const orderId = order.AmazonOrderId;
          const orderStatus = order.OrderStatus;

          logger.info(`Processing order ${orderId} (Status: ${orderStatus})`);

          // Check if order exists
          const existingOrder = await client.query(
            'SELECT order_id FROM orders WHERE order_id = $1',
            [orderId]
          );

          try {
            if (existingOrder.rows.length > 0) {
              // Update existing order
              updatedCount += await updateExistingOrder(client, order, headers, endpoint);
            } else {
              // Insert new order
              insertedCount += await insertNewOrder(client, order, headers, endpoint);
            }
          } catch (error: any) {
            logger.error(`Error processing order ${orderId}: ${error.message}`);
            continue;
          }
        }

        nextToken = response.payload.NextToken;
      } while (nextToken);

      await client.query('COMMIT');
      logger.info(`Order processing completed: ${insertedCount} new orders, ${updatedCount} updates`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error processing orders:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error(`Critical error during order processing: ${error.message}`, error);
    throw error;
  }
}