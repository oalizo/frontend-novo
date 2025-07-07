/*
  # Fix tracking number columns with view handling

  1. Changes
    - Drop materialized view
    - Modify tracking columns to TEXT
    - Recreate materialized view
    - Add constraints and indexes
*/

-- First drop the materialized view and related objects
DROP MATERIALIZED VIEW IF EXISTS orders_summary CASCADE;

-- Now modify the columns
ALTER TABLE orders 
  ALTER COLUMN customer_track_id TYPE TEXT,
  ALTER COLUMN customer_track_id DROP DEFAULT,
  ADD CONSTRAINT customer_track_id_not_empty 
    CHECK (customer_track_id IS NULL OR length(trim(customer_track_id)) > 0);

ALTER TABLE orders
  ALTER COLUMN supplier_tracking_number TYPE TEXT,
  ALTER COLUMN supplier_tracking_number DROP DEFAULT,
  ADD CONSTRAINT supplier_tracking_number_not_empty 
    CHECK (supplier_tracking_number IS NULL OR length(trim(supplier_tracking_number)) > 0);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_track_id ON orders(customer_track_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_tracking_number ON orders(supplier_tracking_number);

-- Recreate the materialized view
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

-- Create required indexes for the view
CREATE UNIQUE INDEX orders_summary_pkey ON orders_summary(order_item_id);
CREATE INDEX orders_summary_purchase_date_idx ON orders_summary(purchase_date);
CREATE INDEX orders_summary_order_status_idx ON orders_summary(order_status);

-- Recreate the refresh function
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'Processing % operation on orders table', TG_OP;
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary concurrently';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Concurrent refresh failed: %. Attempting regular refresh...', SQLERRM;
    
    BEGIN
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully completed regular refresh';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Regular refresh failed: %', SQLERRM;
    END;
  END;

  CASE TG_OP
    WHEN 'DELETE' THEN RETURN OLD;
    WHEN 'UPDATE' THEN RETURN NEW;
    WHEN 'INSERT' THEN RETURN NEW;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;