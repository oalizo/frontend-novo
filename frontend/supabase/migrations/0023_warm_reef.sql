/*
  # Fix tracking number constraints

  1. Changes
    - Drop existing constraints
    - Add new constraints that allow empty strings
    - Clean up any invalid data
*/

-- First drop the existing constraints
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS customer_track_id_not_empty,
  DROP CONSTRAINT IF EXISTS supplier_tracking_number_not_empty;

-- Clean up any invalid data
UPDATE orders 
SET customer_track_id = NULL 
WHERE customer_track_id = '';

UPDATE orders 
SET supplier_tracking_number = NULL 
WHERE supplier_tracking_number = '';

-- Add new constraints that only validate non-empty strings
ALTER TABLE orders
  ADD CONSTRAINT customer_track_id_valid 
    CHECK (customer_track_id IS NULL OR customer_track_id <> ''),
  ADD CONSTRAINT supplier_tracking_number_valid 
    CHECK (supplier_tracking_number IS NULL OR supplier_tracking_number <> '');

-- Refresh materialized view to ensure consistency
REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;