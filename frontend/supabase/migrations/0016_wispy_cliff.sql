/*
  # Create Orders Summary View
  
  1. Changes
    - Create orders_summary materialized view
    - Add indexes for performance
    - Set up proper permissions
    
  2. Details
    - Creates materialized view with order statistics
    - Adds unique index on order_item_id
    - Grants necessary permissions
*/

-- Create materialized view for orders summary
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

-- Create unique index required for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS orders_summary_order_item_id_idx 
ON orders_summary(order_item_id);

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS orders_summary_purchase_date_idx 
ON orders_summary(purchase_date);

CREATE INDEX IF NOT EXISTS orders_summary_order_status_idx 
ON orders_summary(order_status);

CREATE INDEX IF NOT EXISTS orders_summary_search_idx ON orders_summary
USING gin(to_tsvector('english',
  COALESCE(order_id, '') || ' ' ||
  COALESCE(sku, '') || ' ' ||
  COALESCE(asin, '') || ' ' ||
  COALESCE(title, '') || ' ' ||
  COALESCE(supplier_order_id, '') || ' ' ||
  COALESCE(customer_track_id, '') || ' ' ||
  COALESCE(notes, '')
));

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;

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

-- Create trigger to refresh view after order updates
DROP TRIGGER IF EXISTS refresh_orders_summary_trigger ON orders;
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant execute permission on refresh function
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;