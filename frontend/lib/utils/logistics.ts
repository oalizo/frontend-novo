import { Order } from "@/lib/api/orders"
import { LogisticsEntryInput } from "../validation/logistics"
import { getStoreFromSku } from "./store-identifier"

export function createLogisticsEntry(order: Order): LogisticsEntryInput {
  if (!order) {
    throw new Error('Invalid order data');
  }

  const store = getStoreFromSku(order.sku)
  
  return {
    purchase_date: order.purchase_date,
    store,
    supplier_order_id: order.supplier_order_id || null,
    asin: order.asin,
    quantity_sold: order.quantity_sold,
    title: order.title,
    order_id: order.order_id,
    latest_ship_date: order.latest_ship_date,
    order_status: 'ordered',
    handling_omd: null,
    dead_line: null,
    supplier_tracking_number: null,
    provider: null,
    date_time: null,
    current_status: null,
    shipping_status: null,
    delivered_date: null,
    delivery_info: null,
    expected_date: null,
    url_carrier: null,
    origin_city: null,
    destination_city: null,
    ship_estimate: order.customer_shipping || 0,
    notes: order.notes || null
  }
}