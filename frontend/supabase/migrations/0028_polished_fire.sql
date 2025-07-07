-- Drop existing trigger and function
DROP TRIGGER IF EXISTS clean_tracking_number_trigger ON orders;
DROP FUNCTION IF EXISTS clean_tracking_number();

-- Create improved function to handle scientific notation
CREATE OR REPLACE FUNCTION clean_tracking_number()
RETURNS trigger AS $$
BEGIN
  -- Clean tracking number if not NULL
  IF NEW.customer_track_id IS NOT NULL THEN
    -- Handle scientific notation
    IF NEW.customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$' THEN
      -- Convert to regular number string and remove decimals
      NEW.customer_track_id = trim(to_char(NEW.customer_track_id::numeric, '999999999999999999999999'));
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

-- Clean up existing scientific notation values
UPDATE orders 
SET customer_track_id = trim(to_char(customer_track_id::numeric, '999999999999999999999999'))
WHERE customer_track_id ~ E'^\\d+\\.?\\d*e[+-]?\\d+$';