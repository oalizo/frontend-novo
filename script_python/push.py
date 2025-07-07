import requests
import datetime
import psycopg2
import time
import logging
from creds import credentials  # Certifique-se de que este módulo contém suas credenciais de forma segura
from dataclasses import dataclass
import pytz

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    amz_fee: float = 0.0  # Nova propriedade para a taxa da Amazon

def format_date(date_str):
    """Format the ISO date string to MM-DD-YYYY HH:MM format."""
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ").strftime("%m-%d-%Y %H:%M")
    except ValueError:
        logging.error(f"Date format error: {date_str}")
        return date_str

def get_api_response(url, headers, params=None, retries=3, delay=20):
    """Handle API requests with retries and delays."""
    for attempt in range(retries):
        time.sleep(2)  # Adiciona um intervalo de 2 segundos antes de cada chamada à API
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            logging.warning(f"Rate limit hit, attempt {attempt + 1}/{retries}. Sleeping for {delay} seconds.")
            time.sleep(delay)
        else:
            logging.error(f"Failed request: {response.status_code} - {response.text}")
        time.sleep(delay)
    logging.error("All retries failed.")
    return {}

def get_access_token():
    time.sleep(2)  # Adiciona um intervalo de 2 segundos antes de cada chamada à API
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

def connect_db():
    return psycopg2.connect(
        user="postgres",
        password="alissemli*",
        host="35.170.141.148",
        port="5432",
        database="oalizo"
    )

def get_amz_fee_for_asin(asin, price, headers, marketplace_id, retries=5, initial_delay=2):
    if price <= 0:
        logging.error(f"Invalid price: {price}. Price must be greater than 0 to estimate fees.")
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

            if response.status_code == 200:
                fees_data = response.json()
                try:
                    # Verificando a estrutura correta da resposta
                    fees_estimate_result = fees_data.get('payload', {}).get('FeesEstimateResult', {})
                    fees_estimate = fees_estimate_result.get('FeesEstimate', {})
                    total_fees_estimate = fees_estimate.get('TotalFeesEstimate', {})
                    amz_fee = total_fees_estimate.get('Amount', 0.0)

                    return amz_fee
                except KeyError as e:
                    logging.error(f"Erro na estrutura da resposta para o ASIN {asin}: {str(e)}")
                    return 0.0
            elif response.status_code == 429:
                logging.warning(f"Rate limit hit or quota exceeded for ASIN {asin}. Retrying in {delay} seconds.")
                time.sleep(delay)
                delay *= 2
            else:
                logging.error(f"Failed to get fee estimate for ASIN {asin}: {response.text}")
                return 0.0
        except requests.exceptions.RequestException as e:
            logging.error(f"Exception during fee estimation for ASIN {asin}: {str(e)}")
            time.sleep(delay)
            delay *= 2

    logging.error(f"Exceeded maximum retries to get fee estimate for ASIN {asin}.")
    return 0.0


def process_orders():
    access_token = get_access_token()
    endpoint = "https://sellingpartnerapi-na.amazon.com"
    marketplace_id = "ATVPDKIKX0DER"
    headers = {"x-amz-access-token": access_token}

    # Buscar pedidos dos últimos 7 dias com timezone-aware datetime
    days_to_fetch = 7
    utc = pytz.UTC  # Utilizar o fuso horário UTC
    start_date = (datetime.datetime.now(utc) - datetime.timedelta(days=days_to_fetch)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Formatar a data para o padrão ISO 8601 com UTC "Z"
    created_after = start_date.isoformat().replace("+00:00", "Z")

    orders_url = f"{endpoint}/orders/v0/orders"
    params = {"MarketplaceIds": marketplace_id, "CreatedAfter": created_after}
    
    logging.info(f"Fetching orders from Amazon created after: {created_after}")
    
    orders = []
    next_token = None

    while True:
        if next_token:
            params['NextToken'] = next_token
            params.pop("CreatedAfter", None)  # Remove o CreatedAfter para as chamadas subsequentes com o NextToken
        
        response = get_api_response(orders_url, headers, params)
        
        if 'payload' in response and 'Orders' in response['payload']:
            orders.extend(response['payload']['Orders'])
            logging.info(f"Fetched {len(response['payload']['Orders'])} orders from current page.")
        else:
            logging.info("No more orders found in the response.")
            break

        # Verificar se existe um NextToken para paginar
        next_token = response['payload'].get('NextToken', None)
        if not next_token:
            break
    
    logging.info(f"Total orders fetched: {len(orders)}")

    if not orders:
        logging.info("No orders returned from Amazon.")
        return

    inserted_count = 0
    updated_count = 0

    with connect_db() as conn:
        with conn.cursor() as cursor:
            for order in orders:
                order_id = order["AmazonOrderId"]
                order_status = order["OrderStatus"]

                logging.info(f"Processing order {order_id} from Amazon (Status: {order_status})...")

                # Verifique se o pedido já está no banco de dados
                cursor.execute("SELECT order_id, order_status, amazon_fee FROM orders WHERE order_id = %s", (order_id,))
                result = cursor.fetchone()

                # Se o pedido for "Canceled", pula o cálculo da fee
                if order_status == "Canceled":
                    logging.info(f"Order {order_id} is canceled. Skipping fee calculation.")
                    continue  # Pula para o próximo pedido

                if result:
                    # Pedido já existe no banco de dados
                    existing_order_id, existing_status, existing_amz_fee = result
                    new_status = order_status

                    logging.info(f"Order {existing_order_id} exists in database with status: {existing_status}. Amazon status: {new_status}. Fee: {existing_amz_fee}")

                    # Verifique se a taxa é 0.0, e se for, recalcular e atualizar
                    if existing_amz_fee == 0.0:
                        logging.info(f"Order {existing_order_id} has a fee of 0.0. Recalculating fee...")
                        
                        items_url = f"{endpoint}/orders/v0/orders/{order_id}/orderItems"
                        time.sleep(2)  # Adiciona intervalo de 2 segundos antes de consultar itens da ordem
                        items = get_api_response(items_url, headers)
                        for item in items.get('payload', {}).get('OrderItems', []):
                            amazon_price = float(item.get("ItemPrice", {}).get("Amount", 0.0))
                            asin = item["ASIN"]

                            # Calcular as taxas baseadas no preço e no ASIN
                            amz_fee = get_amz_fee_for_asin(asin, amazon_price, headers, marketplace_id)

                            # Atualizar a taxa no banco de dados
                            logging.info(f"Updating fee for order {order_id} to {amz_fee}")
                            cursor.execute("""
                                UPDATE orders SET amazon_fee = %s WHERE order_id = %s
                            """, (amz_fee, order_id))
                            updated_count += 1

                    # Se o status no banco for "Ordered", não atualize o status
                    if existing_status != "Ordered":
                        # Atualizar o status se for diferente e não for "Ordered"
                        if new_status != existing_status:
                            logging.info(f"Updating order {existing_order_id} with new status: {new_status}")
                            cursor.execute("""
                                UPDATE orders SET 
                                    order_status = %s, 
                                    fulfillment_channel = %s, 
                                    latest_ship_date = %s
                                WHERE order_id = %s
                            """, (
                                new_status, 
                                order["FulfillmentChannel"],
                                format_date(order["LatestShipDate"]),
                                existing_order_id
                            ))
                            updated_count += 1
                        else:
                            logging.info(f"Order {existing_order_id} status is already up to date.")
                    else:
                        logging.info(f"Order {existing_order_id} has status 'Ordered'. Status will not be updated.")
                else:
                    # Pedido novo, inseri-lo no banco de dados
                    logging.info(f"New order {order_id} found. Inserting into database.")

                    if order["FulfillmentChannel"] == "MFN":
                        items_url = f"{endpoint}/orders/v0/orders/{order_id}/orderItems"
                        time.sleep(2)  # Adiciona intervalo de 2 segundos antes de consultar itens da ordem
                        items = get_api_response(items_url, headers)
                        for item in items.get('payload', {}).get('OrderItems', []):
                            amazon_price = float(item.get("ItemPrice", {}).get("Amount", 0.0))
                            asin = item["ASIN"]

                            # Calcular as taxas baseadas no preço e no ASIN
                            amz_fee = get_amz_fee_for_asin(asin, amazon_price, headers, marketplace_id)

                            # Inserir o pedido no banco de dados
                            order_item = AmazonOrderItem(
                                purchase_date=format_date(order["PurchaseDate"]),
                                order_id=order_id,
                                order_status=order["OrderStatus"],
                                fulfillment_channel=order["FulfillmentChannel"],
                                latest_ship_date=format_date(order["LatestShipDate"]),
                                title=item["Title"],
                                sku=item["SellerSKU"],
                                asin=asin,
                                amazon_price=amazon_price,
                                quantity_sold=item["QuantityOrdered"],
                                amz_fee=amz_fee
                            )

                            logging.info(f"Inserting order {order_id} into the database.")
                            cursor.execute("""
                            INSERT INTO orders (
                                purchase_date, order_id, order_status, fulfillment_channel,
                                latest_ship_date, title, sku, asin, amazon_price, quantity_sold, amazon_fee
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                order_item.purchase_date, order_item.order_id, order_item.order_status,
                                order_item.fulfillment_channel, order_item.latest_ship_date, 
                                order_item.title, order_item.sku, order_item.asin, 
                                order_item.amazon_price, order_item.quantity_sold, order_item.amz_fee
                            ))
                            inserted_count += 1
            
            conn.commit()

    logging.info(f"Script completed successfully! {inserted_count} new orders were added to the database.")
    logging.info(f"{updated_count} orders were updated in the database.")


# Executar o processamento de pedidos
process_orders()
