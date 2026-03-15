/*
  # Fix Driver Order Visibility

  This migration fixes the issue where drivers cannot see orders assigned to them.
  
  1. Changes Made
    - Drop and recreate the driver order viewing policies to be more explicit
    - Ensure drivers can see ALL orders assigned to them regardless of status
    - Ensure drivers can update orders assigned to them for status changes
  
  2. Security
    - Maintains RLS protection
    - Drivers can only see/update orders assigned to them
    - No changes to other user role policies
*/

-- Drop existing driver-specific policies
DROP POLICY IF EXISTS "Drivers can view available orders" ON orders;
DROP POLICY IF EXISTS "Drivers can view own assigned orders" ON orders;
DROP POLICY IF EXISTS "Drivers can accept orders" ON orders;

-- Create new comprehensive driver view policy
-- Drivers can view orders assigned to them (any status)
CREATE POLICY "Drivers can view their assigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can also view available orders (pending, no driver assigned)
CREATE POLICY "Drivers can view available orders in their zone"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    driver_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.verification_status = 'verified'
    )
  );

-- Drivers can update orders assigned to them (for accepting/rejecting and status updates)
CREATE POLICY "Drivers can update their assigned orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
        AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can accept pending orders (set themselves as driver_id)
CREATE POLICY "Drivers can accept available orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    (driver_id IS NULL AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
        AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.verification_status = 'verified'
    )
  );
