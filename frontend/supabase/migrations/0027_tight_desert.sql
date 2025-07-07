-- Drop existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS customer_track_id_valid;

-- Clean up any existing tracking numbers
UPDATE orders 
SET customer_track_id = NULL 
WHERE customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$' 
   OR customer_track_id !~ '^[A-Za-z0-9\-]+$'
   OR customer_track_id = '';

-- Add new constraint with proper validation
ALTER TABLE orders
ADD CONSTRAINT customer_track_id_valid 
  CHECK (
    customer_track_id IS NULL 
    OR (
      customer_track_id ~ '^[A-Za-z0-9\-]+$'
      AND length(trim(customer_track_id)) > 0
    )
  );

-- Create function to clean tracking numbers on insert/update
CREATE OR REPLACE FUNCTION clean_tracking_number()
RETURNS trigger AS $$
BEGIN
  -- Clean tracking number if not NULL
  IF NEW.customer_track_id IS NOT NULL THEN
    -- Remove any invalid characters
    NEW.customer_track_id = regexp_replace(NEW.customer_track_id, '[^A-Za-z0-9\-]', '', 'g');
    
    -- Set to NULL if empty after cleaning
    IF length(trim(NEW.customer_track_id)) = 0 THEN
      NEW.customer_track_id = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean tracking numbers
DROP TRIGGER IF EXISTS clean_tracking_number_trigger ON orders;
CREATE TRIGGER clean_tracking_number_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clean_tracking_number();