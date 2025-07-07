export interface LogisticsEntry {
  id: number
  purchase_date: string
  store: string
  supplier_order_id: string
  asin: string
  quantity_sold: number
  title: string
  order_id: string
  latest_ship_date: string
  order_status: string
  handling_omd: string
  dead_line: string | null
  supplier_tracking_number: string
  provider: string
  date_time: string | null
  current_status: string | null
  shipping_status: string | null
  delivered_date: string | null
  delivery_info: string
  expected_date: string | null
  url_carrier: string | null
  origin_city: string
  destination_city: string
  notes: string | null
  ship_estimate: number
  received_date: string | null
  created_at: string
  updated_at: string
  archived_at?: string
}

export interface LogisticsResponse {
  data: LogisticsEntry[]
  total: number
}

export interface LogisticsStats {
  total_entries: number
  delivered_count: number
  in_transit_count: number
  pending_count: number
  delayed_count: number
}

export interface LogisticsParams {
  page?: number
  size?: number
  search?: string
  status?: string
  store?: string
  dateFrom?: string
  dateTo?: string
  archived?: boolean
}

export interface OrderExistsResponse {
  exists: boolean
  hasSameAsin: boolean
}