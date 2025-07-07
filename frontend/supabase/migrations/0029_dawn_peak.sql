-- Drop existing trigger and function
DROP TRIGGER IF EXISTS clean_tracking_number_trigger ON orders;
DROP FUNCTION IF EXISTS clean_tracking_number();

-- Create improved function that preserves full number strings
CREATE OR REPLACE FUNCTION clean_tracking_number()
RETURNS trigger AS $$
DECLARE
  cleaned_number text;
BEGIN
  -- Clean tracking number if not NULL
  IF NEW.customer_track_id IS NOT NULL THEN
    -- Handle scientific notation by converting to plain string
    IF NEW.customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$' THEN
      -- Use arbitrary precision to avoid truncation
      cleaned_number := NEW.customer_track_id::numeric::text;
      -- Remove any decimal portion
      cleaned_number := split_part(cleaned_number, '.', 1);
      NEW.customer_track_id := cleaned_number;
    END IF;

    -- Remove any remaining invalid characters
    NEW.customer_track_id = regexp_replace(NEW.customer_track_id, '[^A-Za-z0-9\-]', '', 'g');
    
    -- Set to NULL if empty after cleaning
    IF length(trim(NEW.customer_track_id)) = 0 THEN
      NEW.customer_track_id = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER clean_tracking_number_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION clean_tracking_number();

-- Fix existing scientific notation values
UPDATE orders 
SET customer_track_id = (
  CASE 
    WHEN customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$' THEN
      split_part(customer_track_id::numeric::text, '.', 1)
    ELSE 
      customer_track_id
  END
)
WHERE customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$';