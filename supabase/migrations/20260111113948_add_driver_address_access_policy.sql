/*
  # Add Driver Address Access Policy

  ## Summary
  This migration adds an RLS policy allowing drivers to view delivery address
  details for orders assigned to them. This is necessary for the map navigation feature.

  ## Changes Made
  - Add policy allowing drivers to view addresses for their assigned orders
  
  ## Security
  - Drivers can only view addresses for orders where they are assigned as driver_id
  - No other address data is exposed to drivers
*/

-- Allow drivers to view delivery addresses for their assigned orders
CREATE POLICY "Drivers can view addresses for their orders"
  ON addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN drivers ON drivers.id = orders.driver_id
      WHERE orders.delivery_address_id = addresses.id
      AND drivers.user_id = auth.uid()
    )
  );
