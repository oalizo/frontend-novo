/*
  # Fix tracking number columns

  1. Changes
    - Drop existing view
    - Modify tracking columns to use text with proper constraints
    - Recreate view with proper column types
*/

-- Drop existing objects
DROP MATERIALIZED VIEW IF EXISTS orders_summary CASCADE;
DROP FUNCTION IF EXISTS refresh_orders_summary() CASCADE;

-- Remove existing constraints
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS customer_track_id_valid,
DROP CONSTRAINT IF EXISTS supplier_tracking_number_valid;

-- Convert any scientific notation values back to full numbers
UPDATE orders 
SET customer_track_id = (
  CASE 
    WHEN customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$' 
    THEN trim(to_char(customer_track_id::numeric, '999999999999999999999999'))
    ELSE customer_track_id
  END
)
WHERE customer_track_id IS NOT NULL;

UPDATE orders
SET supplier_tracking_number = (
  CASE 
    WHEN supplier_tracking_number ~ E'^\\d+\\.?\\d*e[+-]?\\d+$'
    THEN trim(to_char(supplier_tracking_number::numeric, '999999999999999999999999'))
    ELSE supplier_tracking_number
  END
)
WHERE supplier_tracking_number IS NOT NULL;

-- Add new constraints that enforce text storage
ALTER TABLE orders
  ADD CONSTRAINT customer_track_id_valid 
    CHECK (customer_track_id IS NULL OR customer_track_id ~ '^[A-Za-z0-9\-]+$'),
  ADD CONSTRAINT supplier_tracking_number_valid 
    CHECK (supplier_tracking_number IS NULL OR supplier_tracking_number ~ '^[A-Za-z0-9\-]+$');

-- Recreate materialized view
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

-- Create indexes
CREATE UNIQUE INDEX orders_summary_pkey ON orders_summary(order_item_id);
CREATE INDEX orders_summary_purchase_date_idx ON orders_summary(purchase_date);
CREATE INDEX orders_summary_order_status_idx ON orders_summary(order_status);
CREATE INDEX orders_summary_tracking_idx ON orders_summary(customer_track_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS trigger AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      REFRESH MATERIALIZED VIEW orders_summary;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh orders_summary view: %', SQLERRM;
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

-- Create trigger
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;