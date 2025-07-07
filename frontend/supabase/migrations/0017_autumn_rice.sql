/*
  # Create Orders Table and View
  
  1. Changes
    - Create orders table with all required columns
    - Create orders_summary materialized view
    - Add necessary indexes and triggers
    
  2. Details
    - Adds proper column types and constraints
    - Sets up materialized view for efficient querying
    - Adds RLS policies for security
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  order_item_id SERIAL PRIMARY KEY,
  purchase_date TIMESTAMPTZ,
  order_id TEXT,
  order_status VARCHAR(50),
  fulfillment_channel VARCHAR(50),
  latest_ship_date DATE,
  title TEXT,
  sku VARCHAR(255),
  asin VARCHAR(255),
  amazon_price NUMERIC(10,2),
  quantity_sold INTEGER,
  supplier_order_id VARCHAR(255),
  supplier_tracking_number VARCHAR(255),
  amazon_fee NUMERIC(10,2),
  bundle_qty INTEGER,
  supplier_price NUMERIC(10,2),
  supplier_tax NUMERIC(10,2),
  supplier_shipping NUMERIC(10,2),
  customer_shipping NUMERIC(10,2),
  profit NUMERIC(10,2),
  source VARCHAR(255),
  notes TEXT,
  margin NUMERIC(10,2),
  roi NUMERIC(10,2),
  customer_track_id TEXT,
  customer_track_status TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(purchase_date, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_partial_search ON orders(order_id, sku, asin);
CREATE INDEX IF NOT EXISTS idx_supplier_order_id_lower ON orders(LOWER(supplier_order_id));
CREATE INDEX IF NOT EXISTS orders_amazon_fee_idx ON orders(amazon_fee);
CREATE INDEX IF NOT EXISTS orders_amazon_price_idx ON orders(amazon_price);
CREATE INDEX IF NOT EXISTS orders_purchase_date_idx ON orders(purchase_date);
CREATE INDEX IF NOT EXISTS orders_supplier_price_idx ON orders(supplier_price);

-- Create full text search index
CREATE INDEX IF NOT EXISTS orders_search_idx ON orders
USING gin(to_tsvector('english',
  COALESCE(order_id, '') || ' ' ||
  COALESCE(sku, '') || ' ' ||
  COALESCE(asin, '') || ' ' ||
  COALESCE(title, '') || ' ' ||
  COALESCE(supplier_order_id, '') || ' ' ||
  COALESCE(supplier_tracking_number, '') || ' ' ||
  COALESCE(order_status, '') || ' ' ||
  COALESCE(notes, '')
));

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.orders FOR DELETE
  TO authenticated
  USING (true);

-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS orders_summary AS
SELECT
  order_item_id,
  purchase_date,
  order_id,
  order_status,
  title,
  sku,
  asin,
  amazon_price,
  amazon_fee,
  supplier_price,
  supplier_tax,
  supplier_shipping,
  customer_shipping,
  profit,
  margin,
  roi,
  quantity_sold,
  supplier_order_id,
  customer_track_id,
  customer_track_status,
  notes
FROM orders;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS orders_summary_order_item_id_idx 
ON orders_summary(order_item_id);

-- Create additional indexes for materialized view
CREATE INDEX IF NOT EXISTS orders_summary_purchase_date_idx 
ON orders_summary(purchase_date);

CREATE INDEX IF NOT EXISTS orders_summary_order_status_idx 
ON orders_summary(order_status);

-- Create function to refresh the view
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS void AS $$
BEGIN
  -- Log start of refresh
  RAISE NOTICE 'Starting orders_summary refresh';
  
  BEGIN
    -- Attempt concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary';
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error refreshing orders_summary: %', SQLERRM;
    
    -- Attempt non-concurrent refresh as fallback
    BEGIN
      RAISE NOTICE 'Attempting non-concurrent refresh';
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully completed non-concurrent refresh';
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to refresh orders_summary: %', SQLERRM;
    END;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh view
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;