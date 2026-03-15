/*
  # Enable Realtime for Orders Table

  ## Summary
  This migration enables realtime replication for the orders table to ensure
  that drivers and clients receive instant updates when order status changes.

  ## Changes Made
  - Enable realtime replication for the orders table
  - This allows real-time subscriptions to work properly

  ## Impact
  - Drivers will see available orders appear in real-time
  - Accepted orders will disappear from available list instantly
  - Order status updates will sync across all connected clients
*/

-- Enable realtime for orders table
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Grant necessary permissions for realtime
DO $$
BEGIN
  -- Enable publication for realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
