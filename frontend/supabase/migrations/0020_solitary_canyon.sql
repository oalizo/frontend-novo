/*
  # Fix Orders Trigger Function and View
  
  1. Changes
    - Drop existing trigger and function
    - Create new trigger function with proper row handling
    - Recreate materialized view with proper indexes
    - Add proper error handling
    
  2. Details
    - Fixes the "column order_item_id does not exist" error
    - Ensures proper row-level trigger functionality
    - Maintains data consistency
*/

-- Drop existing objects
DROP TRIGGER IF EXISTS refresh_orders_summary_trigger ON orders;
DROP FUNCTION IF EXISTS refresh_orders_summary() CASCADE;
DROP MATERIALIZED VIEW IF EXISTS orders_summary CASCADE;

-- Recreate materialized view with proper structure
CREATE MATERIALIZED VIEW orders_summary AS
SELECT
  o.order_item_id,
  o.purchase_date,
  o.order_id,
  o.order_status,
  o.title,
  o.sku,
  o.asin,
  o.amazon_price,
  o.amazon_fee,
  o.supplier_price,
  o.supplier_tax,
  o.supplier_shipping,
  o.customer_shipping,
  o.profit,
  o.margin,
  o.roi,
  o.quantity_sold,
  o.supplier_order_id,
  o.customer_track_id,
  o.customer_track_status,
  o.notes
FROM orders o;

-- Create required indexes
CREATE UNIQUE INDEX orders_summary_pkey ON orders_summary(order_item_id);
CREATE INDEX orders_summary_purchase_date_idx ON orders_summary(purchase_date);
CREATE INDEX orders_summary_order_status_idx ON orders_summary(order_status);

-- Create improved trigger function
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS trigger AS $$
BEGIN
  -- Log operation type
  RAISE NOTICE 'Processing % operation on orders table', TG_OP;
  
  BEGIN
    -- Attempt concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary concurrently';
  EXCEPTION WHEN OTHERS THEN
    -- Log error and attempt non-concurrent refresh
    RAISE WARNING 'Concurrent refresh failed: %. Attempting regular refresh...', SQLERRM;
    
    BEGIN
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully completed regular refresh';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Regular refresh failed: %', SQLERRM;
    END;
  END;

  -- Return appropriate record based on operation
  CASE TG_OP
    WHEN 'DELETE' THEN RETURN OLD;
    WHEN 'UPDATE' THEN RETURN NEW;
    WHEN 'INSERT' THEN RETURN NEW;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;