/*
  # Fix tracking number column types

  1. Changes
    - Modify customer_track_id and supplier_tracking_number columns to TEXT type
    - Add check constraints to prevent empty strings
    - Ensure existing data is preserved
  
  2. Indexes
    - Add indexes for better query performance on tracking columns
*/

-- Modify customer_track_id column
ALTER TABLE orders 
  ALTER COLUMN customer_track_id TYPE TEXT,
  ALTER COLUMN customer_track_id DROP DEFAULT,
  ADD CONSTRAINT customer_track_id_not_empty 
    CHECK (customer_track_id IS NULL OR length(trim(customer_track_id)) > 0);

-- Modify supplier_tracking_number column  
ALTER TABLE orders
  ALTER COLUMN supplier_tracking_number TYPE TEXT,
  ALTER COLUMN supplier_tracking_number DROP DEFAULT,
  ADD CONSTRAINT supplier_tracking_number_not_empty 
    CHECK (supplier_tracking_number IS NULL OR length(trim(supplier_tracking_number)) > 0);

-- Add indexes for tracking number columns
CREATE INDEX IF NOT EXISTS idx_orders_customer_track_id ON orders(customer_track_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_tracking_number ON orders(supplier_tracking_number);