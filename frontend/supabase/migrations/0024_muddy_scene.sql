/*
  # Recreate orders summary view

  1. Changes
    - Drop existing view if exists
    - Recreate materialized view with proper structure
    - Add required indexes
    - Create refresh function and trigger
*/

-- Drop existing objects if they exist
DROP MATERIALIZED VIEW IF EXISTS orders_summary CASCADE;
DROP FUNCTION IF EXISTS refresh_orders_summary() CASCADE;

-- Create materialized view
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

-- Create required indexes
CREATE UNIQUE INDEX orders_summary_pkey ON orders_summary(order_item_id);
CREATE INDEX orders_summary_purchase_date_idx ON orders_summary(purchase_date);
CREATE INDEX orders_summary_order_status_idx ON orders_summary(order_status);
CREATE INDEX orders_summary_tracking_idx ON orders_summary(customer_track_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS trigger AS $$
BEGIN
  BEGIN
    -- Attempt concurrent refresh first
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to regular refresh if concurrent fails
    BEGIN
      REFRESH MATERIALIZED VIEW orders_summary;
    EXCEPTION WHEN OTHERS THEN
      -- Log failure but don't block the transaction
      RAISE WARNING 'Failed to refresh orders_summary view: %', SQLERRM;
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

-- Create trigger
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;