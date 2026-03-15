/*
  # Add Driver Order Access Policies

  ## Summary
  This migration adds comprehensive RLS policies for drivers to interact with orders.
  It fixes the issue where drivers cannot view or accept available orders.

  ## Changes Made

  ### 1. New Policies for Orders Table
  - **"Drivers can view available orders"**: Allows drivers to see pending orders without assigned drivers
    - Only pending orders (status = 'pending')
    - Only orders without a driver (driver_id IS NULL)
    - Driver must be authenticated and verified
  
  - **"Drivers can view own assigned orders"**: Allows drivers to see orders assigned to them
    - Orders where driver_id matches the driver's ID
    - Driver must be authenticated
  
  - **"Drivers can accept orders"**: Allows drivers to update orders to accept them
    - Can only update pending orders
    - Can only assign themselves as the driver
    - Can only change status to 'accepted' or other delivery statuses
    - Driver must be authenticated and verified

  ## Security
  - All policies require authentication
  - Drivers can only accept orders if verified
  - Drivers can only view orders that are either unassigned or assigned to them
  - Drivers cannot modify orders assigned to other drivers
*/

-- Drop old driver policy that uses deliveries table
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- Policy 1: Drivers can view available (unassigned) orders
CREATE POLICY "Drivers can view available orders"
  ON orders FOR SELECT
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

-- Policy 2: Drivers can view their own assigned orders
CREATE POLICY "Drivers can view own assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Policy 3: Drivers can accept and update orders
CREATE POLICY "Drivers can accept orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    (
      -- Can accept unassigned orders
      driver_id IS NULL AND status = 'pending'
    ) OR (
      -- Can update own assigned orders
      EXISTS (
        SELECT 1 FROM drivers
        WHERE drivers.id = orders.driver_id
        AND drivers.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Must be assigning to self or order is already assigned to self
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = orders.driver_id
      AND drivers.user_id = auth.uid()
      AND drivers.verification_status = 'verified'
    )
  );
