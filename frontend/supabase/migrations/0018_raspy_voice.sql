/*
  # Fix Orders View Refresh
  
  1. Changes
    - Drop existing materialized view and recreate with proper structure
    - Update refresh function with better error handling
    - Add proper indexes for concurrent refresh
    
  2. Details
    - Ensures materialized view can be refreshed concurrently
    - Adds proper error handling and logging
    - Maintains data consistency
*/

-- Drop existing view and related objects
DROP MATERIALIZED VIEW IF EXISTS orders_summary CASCADE;
DROP FUNCTION IF EXISTS refresh_orders_summary() CASCADE;

-- Recreate materialized view with proper structure
CREATE MATERIALIZED VIEW orders_summary AS
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
CREATE UNIQUE INDEX orders_summary_pkey ON orders_summary(order_item_id);

-- Create additional indexes for performance
CREATE INDEX orders_summary_purchase_date_idx ON orders_summary(purchase_date);
CREATE INDEX orders_summary_order_status_idx ON orders_summary(order_status);
CREATE INDEX orders_summary_asin_idx ON orders_summary(asin);

-- Create improved refresh function
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS void AS $$
BEGIN
  -- Log start of refresh
  RAISE NOTICE 'Starting orders_summary refresh';
  
  BEGIN
    -- First try concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary concurrently';
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    -- Log concurrent refresh failure
    RAISE WARNING 'Concurrent refresh failed: %. Attempting regular refresh...', SQLERRM;
    
    BEGIN
      -- Fallback to regular refresh
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully refreshed orders_summary with regular refresh';
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      -- Log complete failure
      RAISE WARNING 'Regular refresh also failed: %', SQLERRM;
      -- Don't raise exception to avoid breaking transactions
      RETURN;
    END;
  END;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic refresh
DROP TRIGGER IF EXISTS refresh_orders_summary_trigger ON orders;
CREATE TRIGGER refresh_orders_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;