/*
  # Fix Orders Summary View
  
  1. Changes
    - Add unique index to orders_summary view
    - Update refresh function to handle concurrent updates
    - Add better error handling
    
  2. Details
    - Creates unique index on order_item_id
    - Modifies refresh function to use CONCURRENTLY
    - Adds proper error handling and logging
*/

-- First, create unique index on orders_summary
CREATE UNIQUE INDEX IF NOT EXISTS orders_summary_order_item_id_idx 
ON orders_summary(order_item_id);

-- Update the refresh function with better error handling
CREATE OR REPLACE FUNCTION refresh_orders_summary()
RETURNS void AS $$
BEGIN
  -- Log start of refresh
  RAISE NOTICE 'Starting orders_summary refresh';
  
  BEGIN
    -- Attempt concurrent refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY orders_summary;
    RAISE NOTICE 'Successfully refreshed orders_summary';
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error refreshing orders_summary: %', SQLERRM;
    
    -- Attempt non-concurrent refresh as fallback
    BEGIN
      RAISE NOTICE 'Attempting non-concurrent refresh';
      REFRESH MATERIALIZED VIEW orders_summary;
      RAISE NOTICE 'Successfully completed non-concurrent refresh';
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to refresh orders_summary: %', SQLERRM;
    END;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh view after order updates
DROP TRIGGER IF EXISTS refresh_orders_summary_trigger ON orders;
CREATE TRIGGER refresh_orders_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_orders_summary();

-- Grant necessary permissions
GRANT SELECT ON orders_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_orders_summary() TO authenticated;