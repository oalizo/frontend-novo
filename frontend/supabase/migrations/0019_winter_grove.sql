/*
  # Fix Orders Trigger Function
  
  1. Changes
    - Update refresh function to return trigger instead of void
    - Improve error handling and logging
    - Maintain existing functionality
    
  2. Details
    - Fixes the "function must return type trigger" error
    - Preserves concurrent refresh capability
    - Adds better error handling
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS refresh_orders_summary_trigger ON orders;
DROP FUNCTION IF EXISTS refresh_orders_summary();

-- Create improved refresh function that returns trigger
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS trigger AS $$
BEGIN
  -- Log start of refresh
  RAISE NOTICE 'Starting orders_summary refresh';
  
  BEGIN
    -- First try concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary concurrently';
  EXCEPTION WHEN OTHERS THEN
    -- Log concurrent refresh failure
    RAISE WARNING 'Concurrent refresh failed: %. Attempting regular refresh...', SQLERRM;
    
    BEGIN
      -- Fallback to regular refresh
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully refreshed orders_summary with regular refresh';
    EXCEPTION WHEN OTHERS THEN
      -- Log complete failure
      RAISE WARNING 'Regular refresh also failed: %', SQLERRM;
    END;
  END;

  -- Return NEW for INSERT/UPDATE, OLD for DELETE
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger with proper timing
CREATE TRIGGER refresh_orders_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION refresh_orders_summary();

-- Grant permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;