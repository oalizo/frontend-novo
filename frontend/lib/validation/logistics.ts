import { z } from "zod"

// Define schema for logistics entry validation
export const logisticsEntrySchema = z.object({
  purchase_date: z.string().datetime(),
  store: z.string(),
  supplier_order_id: z.string().nullable(),
  asin: z.string(),
  quantity_sold: z.number().int().positive(),
  title: z.string(),
  order_id: z.string(),
  latest_ship_date: z.string().datetime().optional(),
  order_status: z.string(),
  handling_omd: z.string().nullable(),
  dead_line: z.string().datetime().nullable(),
  supplier_tracking_number: z.string().nullable(),
  provider: z.string().nullable(),
  date_time: z.string().datetime().nullable(),
  current_status: z.string().nullable(),
  shipping_status: z.string().nullable(),
  delivered_date: z.string().datetime().nullable(),
  delivery_info: z.string().nullable(),
  expected_date: z.string().datetime().nullable(),
  url_carrier: z.string().nullable(),
  origin_city: z.string().nullable(),
  destination_city: z.string().nullable(),
  ship_estimate: z.number().optional(),
  notes: z.string().nullable()
})

export type LogisticsEntryInput = z.infer<typeof logisticsEntrySchema>