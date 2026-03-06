/*
  # Add Admin Access Policies for Orders

  1. Changes
    - Add policy to allow admins to view all orders
    - Add policy to allow admins to view all order items
    - Add policy to allow admins to view all merchants
    - Add policy to allow admins to view all drivers
    
  2. Security
    - Policies check if user is in admin_users table
    - Admins can read all data for management purposes
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
  DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
  DROP POLICY IF EXISTS "Admins can view all merchants" ON merchants;
  DROP POLICY IF EXISTS "Admins can view all drivers" ON drivers;
  DROP POLICY IF EXISTS "Admins can update orders" ON orders;
END $$;

-- Allow admins to read all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to read all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to read all merchants
CREATE POLICY "Admins can view all merchants"
  ON merchants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to read all drivers
CREATE POLICY "Admins can view all drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to update order status
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );