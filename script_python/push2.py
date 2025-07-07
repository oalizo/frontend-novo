from datetime import datetime, timedelta
import requests
import psycopg2
import time
import logging
from creds import credentials
from dataclasses import dataclass
import pytz
from typing import Dict, Optional, List, Any, TypedDict, Union
from collections import deque

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('amazon_orders.log')
    ]
)

@dataclass
class AmazonOrderItem:
    purchase_date: str
    order_id: str
    order_status: str
    fulfillment_channel: str
    latest_ship_date: str
    title: str
    sku: str
    asin: str
    amazon_price: float
    quantity_sold: int
    amz_fee: float = 0.0
    customer_shipping: float = 0.0

class RateLimiter:
    def __init__(self, rate: float, burst: int) -> None:
        self.rate: float = rate
        self.burst: int = burst
        self.tokens: int = burst
        self.last_update: datetime = datetime.now()
        self.requests: deque[datetime] = deque()
        
    def acquire(self) -> None:
        now = datetime.now()
        while self.requests and (now - self.requests[0]).total_seconds() > 1:
            self.requests.popleft()
            
        if len(self.requests) >= self.burst:
            sleep_time = (self.requests[0] + timedelta(seconds=1) - now).total_seconds()
            if sleep_time > 0:
                time.sleep(sleep_time)
                
        self.requests.append(now)
        time.sleep(1/self.rate)

def format_date(date_str: str) -> str:
    """Format the ISO date string to YYYY-MM-DD HH:MM:SS format."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        logging.error(f"Date format error: {date_str}")
        return date_str
    
def get_api_response(url: str, headers: Dict[str, str], params: Optional[Dict] = None, retries: int = 3, delay: int = 20) -> Dict:
    """Handle API requests with retries and rate limiting."""
    for attempt in range(retries):
        time.sleep(2)  # Base delay between requests
        response = requests.get(url, headers=headers, params=params)
        
        logging.info(f"API Response Status: {response.status_code} for URL: {url}")
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            logging.warning(f"Rate limit hit, attempt {attempt + 1}/{retries}. Sleeping for {delay} seconds.")
            time.sleep(delay)
        else:
            logging.error(f"Failed request: {response.status_code} - {response.text}")
            if attempt < retries - 1:
                time.sleep(delay)
            continue
    
    logging.error("All retries failed.")
    return {}

def get_access_token() -> str:
    """Get access token from Amazon SP-API."""
    time.sleep(2)
    token_response = requests.post(
        "https://api.amazon.com/auth/o2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": credentials["refresh_token"],
            "client_id": credentials["lwa_app_id"],
            "client_secret": credentials["lwa_client_secret"],
        }
    )
    token_response.raise_for_status()
    return token_response.json()["access_token"]

def get_shipping_cost(asin: str) -> float:
    """Get shipping cost from external API."""
    try:
        shipping_url = f"http://167.114.223.83:3007/api/produtos/shipping/{asin}"
        response = requests.get(shipping_url, timeout=10)
        if response.status_code == 200:
            shipping_data = response.json()
            shipping_cost = float(shipping_data.get('customer_price_shipping', 0.0))
            logging.info(f"Shipping cost for ASIN {asin}: ${shipping_cost}")
            return shipping_cost
        else:
            logging.error(f"Failed to get shipping cost for ASIN {asin}: {response.status_code}")
            return 0.0
    except Exception as e:
        logging.error(f"Error fetching shipping cost for ASIN {asin}: {str(e)}")
        return 0.0

def should_update_status(existing_status: str, new_status: str) -> bool:
    """
    Determine if a status update is allowed based on business rules.
    Only allows updates from Pending to Unshipped or Canceled.
    """
    allowed_updates = {
        "Pending": {"Unshipped", "Canceled"}
    }
    
    if existing_status in allowed_updates and new_status in allowed_updates[existing_status]:
        logging.info(f"Status update allowed: {existing_status} -> {new_status}")
        return True
    
    logging.info(f"Status update not allowed: {existing_status} -> {new_status}")
    return False

def connect_db() -> psycopg2.extensions.connection:
    """Connect to the database using connection pooler."""
    return psycopg2.connect(
        host="aws-0-us-east-1.pooler.supabase.com",
        database="postgres",
        user="postgres.bvbnofnnbfdlnpuswlgy",
        password="Bi88An6B9L0EIihL",
        port=6543
    )    

def get_amz_fee_for_asin(asin: str, price: float, headers: Dict[str, str], marketplace_id: str, retries: int = 5, initial_delay: int = 2) -> float:
    """Calculate Amazon fees for a specific ASIN with robust error handling."""
    if price <= 0:
        logging.warning(f"Price is zero for ASIN {asin}. This should be investigated as all orders should have a price.")
        return 0.0

    fees_endpoint = f"https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/{asin}/feesEstimate"
    headers_with_content_type = headers.copy()
    headers_with_content_type['Content-Type'] = 'application/json'

    body = {
        "FeesEstimateRequest": {
            "MarketplaceId": marketplace_id,
            "IdType": "ASIN",
            "IdValue": asin,
            "IsAmazonFulfilled": False,
            "PriceToEstimateFees": {
                "ListingPrice": {
                    "CurrencyCode": "USD",
                    "Amount": price
                }
            },
            "Identifier": f"request_{asin}"
        }
    }

    delay = initial_delay
    for attempt in range(retries):
        try:
            time.sleep(2)
            response = requests.post(fees_endpoint, headers=headers_with_content_type, json=body)
            logging.info(f"Fee calculation attempt {attempt + 1} for ASIN {asin}, Status: {response.status_code}")

            if response.status_code == 200:
                fees_data = response.json()
                try:
                    fees_estimate_result = fees_data.get('payload', {}).get('FeesEstimateResult', {})
                    fees_estimate = fees_estimate_result.get('FeesEstimate', {})
                    total_fees_estimate = fees_estimate.get('TotalFeesEstimate', {})
                    amz_fee = total_fees_estimate.get('Amount', 0.0)
                    
                    logging.info(f"Successfully calculated fee for ASIN {asin}: ${amz_fee}")
                    if amz_fee == 0.0:
                        logging.warning(f"Received zero fee for ASIN {asin} with price ${price}. This should be investigated.")
                    
                    return amz_fee
                except Exception as e:
                    logging.error(f"Error parsing fee response for ASIN {asin}: {str(e)}")
                    if attempt < retries - 1:
                        continue
            elif response.status_code == 429:
                logging.warning(f"Rate limit hit for ASIN {asin}. Retrying in {delay} seconds.")
                time.sleep(delay)
                delay *= 2
            else:
                logging.error(f"Failed fee calculation for ASIN {asin}: {response.status_code} - {response.text}")
                if attempt < retries - 1:
                    time.sleep(delay)
                    continue

        except requests.exceptions.RequestException as e:
            logging.error(f"Network error calculating fee for ASIN {asin}: {str(e)}")
            if attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue

    logging.error(f"Failed to calculate fee for ASIN {asin} after {retries} attempts")
    return 0.0

def process_order_items(order_id: str, headers: Dict[str, str], endpoint: str, marketplace_id: str) -> List[Dict[str, Any]]:
    """Process order items with comprehensive fee and shipping calculations."""
    processed_items = []
    items_url = f"{endpoint}/orders/v0/orders/{order_id}/orderItems"
    items_response = get_api_response(items_url, headers)
    
    if not items_response or 'payload' not in items_response:
        logging.error(f"Failed to get items for order {order_id}")
        return processed_items

    order_items = items_response.get('payload', {}).get('OrderItems', [])
    logging.info(f"Processing {len(order_items)} items for order {order_id}")

    for item in order_items:
        try:
            price_info = item.get("ItemPrice", {})
            amazon_price = float(price_info.get("Amount", 0.0))
            asin = item["ASIN"]
            
            amz_fee = get_amz_fee_for_asin(asin, amazon_price, headers, marketplace_id)
            customer_shipping = get_shipping_cost(asin)
            
            processed_item = {
                "asin": asin,
                "title": item["Title"],
                "sku": item["SellerSKU"],
                "amazon_price": amazon_price,
                "quantity_sold": item["QuantityOrdered"],
                "amz_fee": amz_fee,
                "customer_shipping": customer_shipping
            }
            processed_items.append(processed_item)
            
            logging.info(f"Successfully processed item: ASIN={asin}, Price=${amazon_price}, Fee=${amz_fee}, Shipping=${customer_shipping}")
            
        except Exception as e:
            logging.error(f"Error processing item for order {order_id}: {str(e)}")
            continue
            
    return processed_items

def update_existing_order(
    cursor: psycopg2.extensions.cursor,
    order: Dict[str, Any],
    headers: Dict[str, str],
    endpoint: str,
    marketplace_id: str
) -> int:
    """
    Update existing order with new status if allowed and recalculate fees if necessary.
    Returns the number of updates performed.
    """
    updated_count = 0
    order_id = order["AmazonOrderId"]
    new_status = order["OrderStatus"]

    # Get existing order details
    cursor.execute(
        "SELECT order_status, amazon_fee FROM orders WHERE order_id = %s",
        (order_id,)
    )
    result = cursor.fetchone()
    
    if not result:
        logging.error(f"Order {order_id} not found in database during update attempt")
        return 0

    existing_status, existing_fee = result
    
    # Check if status update is allowed
    if should_update_status(existing_status, new_status):
        logging.info(f"Updating order {order_id} status from {existing_status} to {new_status}")
        cursor.execute("""
            UPDATE orders SET 
                order_status = %s,
                latest_ship_date = %s
            WHERE order_id = %s
        """, (
            new_status,
            format_date(order.get("LatestShipDate", "")),
            order_id
        ))
        updated_count += 1
    else:
        logging.info(f"Status update not needed for order {order_id}: {existing_status} -> {new_status}")

    # Recalculate fees if they're zero
    if existing_fee == 0.0 and order["FulfillmentChannel"] == "MFN":
        processed_items = process_order_items(order_id, headers, endpoint, marketplace_id)
        
        for item in processed_items:
            cursor.execute("""
                UPDATE orders SET 
                    amazon_fee = %s,
                    customer_shipping = %s
                WHERE order_id = %s AND asin = %s
            """, (
                item["amz_fee"],
                item["customer_shipping"],
                order_id,
                item["asin"]
            ))
            updated_count += 1
            logging.info(f"Updated fees for order {order_id}, ASIN {item['asin']}: Fee=${item['amz_fee']}, Shipping=${item['customer_shipping']}")

    return updated_count

def insert_new_order(
    cursor: psycopg2.extensions.cursor,
    order: Dict[str, Any],
    headers: Dict[str, str],
    endpoint: str,
    marketplace_id: str
) -> int:
    """
    Insert new order into database.
    Returns the number of items inserted.
    """
    if order["FulfillmentChannel"] != "MFN":
        logging.info(f"Skipping non-MFN order {order['AmazonOrderId']}")
        return 0

    order_id = order["AmazonOrderId"]
    inserted_count = 0
    
    processed_items = process_order_items(order_id, headers, endpoint, marketplace_id)
    logging.info(f"Processing new order {order_id} with {len(processed_items)} items")

    for item in processed_items:
        try:
            cursor.execute("""
                INSERT INTO orders (
                    purchase_date, order_id, order_status, fulfillment_channel,
                    latest_ship_date, title, sku, asin, amazon_price, 
                    quantity_sold, amazon_fee, customer_shipping
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                format_date(order["PurchaseDate"]),
                order_id,
                order["OrderStatus"],
                order["FulfillmentChannel"],
                format_date(order.get("LatestShipDate", "")),
                item["title"],
                item["sku"],
                item["asin"],
                item["amazon_price"],
                item["quantity_sold"],
                item["amz_fee"],
                item["customer_shipping"]
            ))
            inserted_count += 1
            logging.info(f"Inserted new item for order {order_id}: ASIN={item['asin']}")
        except Exception as e:
            logging.error(f"Error inserting order {order_id}, ASIN {item['asin']}: {str(e)}")
            continue

    return inserted_count

def process_orders() -> None:
    """
    Main function to process Amazon orders with comprehensive error handling
    and proper status management.
    """
    try:
        access_token = get_access_token()
        endpoint = "https://sellingpartnerapi-na.amazon.com"
        marketplace_id = "ATVPDKIKX0DER"
        headers = {
            "x-amz-access-token": access_token,
            "Accept": "application/json"
        }

        days_to_fetch = 2
        utc = pytz.UTC
        start_date = (datetime.now(utc) - timedelta(days=days_to_fetch)).replace(hour=0, minute=0, second=0, microsecond=0)
        created_after = start_date.isoformat().replace("+00:00", "Z")

        orders_url = f"{endpoint}/orders/v0/orders"
        initial_params = {
            "MarketplaceIds": marketplace_id,
            "CreatedAfter": created_after,
            "MaxResultsPerPage": 100
        }
        
        logging.info(f"Starting order processing for orders after: {created_after}")
        
        total_orders_processed = 0
        inserted_count = 0
        updated_count = 0
        next_token = None

        while True:
            current_params = (
                {"MarketplaceIds": marketplace_id, "NextToken": next_token, "MaxResultsPerPage": 100}
                if next_token
                else initial_params
            )
            
            logging.info(f"Fetching page {total_orders_processed//100 + 1} of orders")
            response = get_api_response(orders_url, headers, current_params)
            
            if not response or 'payload' not in response:
                logging.error("Invalid API response received")
                break

            current_orders = response.get('payload', {}).get('Orders', [])
            if not current_orders:
                logging.info("No more orders to process")
                break
                
            orders_count = len(current_orders)
            total_orders_processed += orders_count
            logging.info(f"Processing {orders_count} orders (Total processed: {total_orders_processed})")
            
            with connect_db() as conn:
                with conn.cursor() as cursor:
                    for order in current_orders:
                        order_id = order["AmazonOrderId"]
                        order_status = order["OrderStatus"]
                        
                        logging.info(f"Processing order {order_id} (Status: {order_status})")
                        
                        cursor.execute(
                            "SELECT order_id FROM orders WHERE order_id = %s",
                            (order_id,)
                        )
                        exists = cursor.fetchone()

                        try:
                            if exists:
                                # Update existing order if needed
                                updated_count += update_existing_order(
                                    cursor, order, headers, endpoint, marketplace_id
                                )
                            else:
                                # Insert new order
                                inserted_count += insert_new_order(
                                    cursor, order, headers, endpoint, marketplace_id
                                )
                        except Exception as e:
                            logging.error(f"Error processing order {order_id}: {str(e)}")
                            continue
                    
                    conn.commit()
            
            next_token = response.get('payload', {}).get('NextToken')
            if not next_token:
                logging.info("No more pages to fetch")
                break

        logging.info(f"Order processing completed: {inserted_count} new orders, {updated_count} updates")

    except Exception as e:
        logging.error(f"Critical error during order processing: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    try:
        logging.info("Starting Amazon order processing script")
        process_orders()
        logging.info("Amazon order processing completed successfully")
    except Exception as e:
        logging.error(f"Script execution failed: {str(e)}", exc_info=True)    