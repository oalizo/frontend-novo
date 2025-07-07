# Comparação Detalhada: push2.py vs amazon-orders-processor.js

## Objetivo
Comparar função por função para garantir que o JavaScript reproduza exatamente o comportamento do Python que funcionava.

## 📋 Estrutura Geral

### Python (push2.py)
```python
def process_orders() -> None:
    # 1. Get access token
    # 2. Set up parameters  
    # 3. Loop through pages
    # 4. For each order:
    #    - Check if exists
    #    - If exists: update_existing_order()
    #    - If not: insert_new_order()
```

### JavaScript (amazon-orders-processor.js)
```javascript
async function processOrders() {
    // 1. Get access token ✅
    // 2. Set up parameters ✅
    // 3. Loop through pages ✅
    // 4. For each order:
    //    - Mixed logic ❌ (problema!)
    //    - insertOrUpdateOrder() combined ❌
}
```

## 🔍 Comparação Função por Função

### 1. GET ACCESS TOKEN

#### Python ✅
```python
def get_access_token() -> str:
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
    return token_response.json()["access_token"]
```

#### JavaScript ✅
```javascript
async function getAmazonAccessToken() {
    const credentials = await getAmazonCredentials();
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', credentials.refresh_token);
    params.append('client_id', credentials.client_id);
    params.append('client_secret', credentials.client_secret);
    
    const response = await axios.post('https://api.amazon.com/auth/o2/token', params);
    return response.data.access_token;
}
```
**Status: ✅ IGUAL**

---

### 2. RATE LIMITING

#### Python ✅
```python
class RateLimiter:
    def __init__(self, rate: float, burst: int) -> None:
        self.rate: float = rate
        self.burst: int = burst
        # ... implementation
    
    def acquire(self) -> None:
        # Rate limiting logic
        time.sleep(1/self.rate)
```

#### JavaScript ✅
```javascript
class RateLimiter {
    constructor(rate, burst) {
        this.rate = rate;
        this.burst = burst;
        this.requests = [];
    }
    
    async acquire() {
        // Similar implementation
        await new Promise(resolve => setTimeout(resolve, 1000 / this.rate));
    }
}
```
**Status: ✅ IGUAL**

---

### 3. MAIN LOOP STRUCTURE ⚠️

#### Python ✅
```python
def process_orders() -> None:
    # Setup
    for order in current_orders:
        order_id = order["AmazonOrderId"]
        order_status = order["OrderStatus"]
        
        cursor.execute(
            "SELECT order_id FROM orders WHERE order_id = %s",
            (order_id,)
        )
        exists = cursor.fetchone()

        if exists:
            updated_count += update_existing_order(cursor, order, headers, endpoint, marketplace_id)
        else:
            inserted_count += insert_new_order(cursor, order, headers, endpoint, marketplace_id)
```

#### JavaScript ❌
```javascript
async function processOrders() {
    // Setup
    for (const order of orders) {
        // Fetch order items first ❌ (diferente!)
        const orderItemsResponse = await getApiResponse(...);
        const orderItems = orderItemsResponse.payload?.OrderItems || [];
        
        for (const item of orderItems) {  // ❌ Loop interno desnecessário
            const result = await insertOrUpdateOrder(order, orderItems, credentials);
        }
    }
}
```
**Status: ❌ ESTRUTURA DIFERENTE**

**PROBLEMA:** JS faz fetch de items ANTES de checar se order existe!

---

### 4. CHECK IF ORDER EXISTS

#### Python ✅
```python
cursor.execute(
    "SELECT order_id FROM orders WHERE order_id = %s",
    (order_id,)
)
exists = cursor.fetchone()
```

#### JavaScript ❌
```javascript
const existingOrder = await client.query(
    'SELECT order_item_id, order_status, amazon_price FROM orders WHERE order_id = $1',
    [order.AmazonOrderId]
);
```
**Status: ❌ QUERY DIFERENTE**

**PROBLEMA:** JS faz SELECT complexo, Python faz SELECT simples

---

### 5. INSERT NEW ORDER

#### Python ✅
```python
def insert_new_order(cursor, order, headers, endpoint, marketplace_id) -> int:
    # 1. Check MFN filter
    if order["FulfillmentChannel"] != "MFN":
        return 0
    
    # 2. Process all items
    processed_items = process_order_items(order_id, headers, endpoint, marketplace_id)
    
    # 3. Insert each item
    for item in processed_items:
        cursor.execute("""
            INSERT INTO orders (
                purchase_date, order_id, order_status, fulfillment_channel,
                latest_ship_date, title, sku, asin, amazon_price, 
                quantity_sold, amazon_fee, customer_shipping
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (...))
```

#### JavaScript ❌
```javascript
// Não existe função separada!
// Lógica misturada em insertOrUpdateOrder()
```
**Status: ❌ FUNÇÃO AUSENTE**

---

### 6. UPDATE EXISTING ORDER

#### Python ✅
```python
def update_existing_order(cursor, order, headers, endpoint, marketplace_id) -> int:
    order_id = order["AmazonOrderId"]
    new_status = order["OrderStatus"]

    # Get existing details
    cursor.execute("SELECT order_status, amazon_fee FROM orders WHERE order_id = %s", (order_id,))
    existing_status, existing_fee = cursor.fetchone()
    
    # Check if update is allowed
    if should_update_status(existing_status, new_status):
        cursor.execute("""
            UPDATE orders SET 
                order_status = %s,
                latest_ship_date = %s
            WHERE order_id = %s
        """, (new_status, format_date(order.get("LatestShipDate", "")), order_id))
```

#### JavaScript ❌
```javascript
// Lógica misturada em insertOrUpdateOrder()
// Não verifica should_update_status corretamente
```
**Status: ❌ FUNÇÃO AUSENTE**

---

### 7. PROCESS ORDER ITEMS

#### Python ✅
```python
def process_order_items(order_id, headers, endpoint, marketplace_id) -> List[Dict]:
    processed_items = []
    items_url = f"{endpoint}/orders/v0/orders/{order_id}/orderItems"
    items_response = get_api_response(items_url, headers)
    
    for item in order_items:
        price_info = item.get("ItemPrice", {})
        amazon_price = float(price_info.get("Amount", 0.0))
        asin = item["ASIN"]
        
        # Calculate fees
        amz_fee = get_amz_fee_for_asin(asin, amazon_price, headers, marketplace_id)
        customer_shipping = get_shipping_cost(asin)
        
        processed_items.append({
            "asin": asin,
            "title": item["Title"],
            "sku": item["SellerSKU"],
            "amazon_price": amazon_price,
            "quantity_sold": item["QuantityOrdered"],
            "amz_fee": amz_fee,
            "customer_shipping": customer_shipping
        })
    
    return processed_items
```

#### JavaScript ✅
```javascript
async function processOrderItems(orderId, headers, endpoint) {
    // Similar implementation exists
}
```
**Status: ✅ EXISTE MAS NÃO É USADA CORRETAMENTE**

---

### 8. SHOULD UPDATE STATUS

#### Python ✅
```python
def should_update_status(existing_status: str, new_status: str) -> bool:
    allowed_updates = {
        "Pending": {"Unshipped", "Canceled"}
    }
    
    if existing_status in allowed_updates and new_status in allowed_updates[existing_status]:
        return True
    return False
```

#### JavaScript ⚠️
```javascript
function shouldUpdateStatus(existingStatus, newStatus) {
    const allowedUpdates = {
        'Pending': ['Unshipped', 'Canceled']
    };
    
    if (allowedUpdates[existingStatus] && allowedUpdates[existingStatus].includes(newStatus)) {
        return true;
    }
    return false;
}
```
**Status: ✅ EXISTE MAS NÃO É USADA**

---

### 9. MFN FILTER

#### Python ✅
```python
if order["FulfillmentChannel"] != "MFN":
    logging.info(f"Skipping non-MFN order {order['AmazonOrderId']}")
    return 0
```

#### JavaScript ❌
```javascript
// Não filtra MFN!
// Processa TODOS os fulfillment channels
```
**Status: ❌ FILTRO AUSENTE**

---

### 10. ZERO REVENUE HANDLING

#### Python ❌
```python
# Não implementado no Python original
```

#### JavaScript ✅
```javascript
function isZeroRevenueStatus(status) {
    const zeroRevenueStatuses = ['Canceled', 'Refunded'];
    return zeroRevenueStatuses.includes(status);
}
```
**Status: ✅ ADICIONADO NO JS (correto)**

---

## 🚨 PROBLEMAS PRINCIPAIS IDENTIFICADOS

### 1. **ESTRUTURA ERRADA**
- **Python:** Checa se order existe → chama função específica
- **JavaScript:** Faz tudo em uma função misturada

### 2. **MFN FILTER AUSENTE**
- **Python:** Só processa orders MFN
- **JavaScript:** Processa tudo

### 3. **ORDEM ERRADA DE OPERAÇÕES**
- **Python:** Check existence → fetch items (se necessário)
- **JavaScript:** Fetch items → check existence

### 4. **FUNÇÕES AUSENTES**
- `insert_new_order()` separada
- `update_existing_order()` separada
- `should_update_status()` não é usada

### 5. **PROCESSAMENTO DE ITEMS**
- **Python:** Processa TODOS os items
- **JavaScript:** Pega só o primeiro `orderItems[0]`

## 📋 AÇÕES NECESSÁRIAS

1. ✅ Separar `insertOrUpdateOrder()` em duas funções
2. ✅ Implementar filtro MFN
3. ✅ Corrigir ordem de operações
4. ✅ Usar `should_update_status()` 
5. ✅ Processar todos os items de uma order
6. ✅ Simplificar query de check existence

## 🎯 PRÓXIMOS PASSOS

1. Reescrever `amazon-orders-processor.js` seguindo estrutura do Python
2. Testar com dados reais
3. Confirmar compatibilidade total
