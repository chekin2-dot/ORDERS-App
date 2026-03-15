/*
  # Add Admin Payment Management Policies

  1. Changes
    - Add policy for admins to update merchant_daily_payouts table (for marking payments as paid)
    - Add policy for admins to update drivers table (for updating balances after payment)
    - Add policy for admins to insert driver_earnings records (for recording payout transactions)
  
  2. Security
    - Only active admin users can perform these operations
    - Ensures proper payment tracking and audit trail
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can update merchant payouts" ON merchant_daily_payouts;
DROP POLICY IF EXISTS "Admins can update driver balances" ON drivers;
DROP POLICY IF EXISTS "Admins can insert driver earnings" ON driver_earnings;
DROP POLICY IF EXISTS "Admins can view all driver earnings" ON driver_earnings;

-- Allow admins to update merchant daily payouts
CREATE POLICY "Admins can update merchant payouts"
  ON merchant_daily_payouts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Allow admins to update driver balances
CREATE POLICY "Admins can update driver balances"
  ON drivers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Allow admins to insert driver earnings records (for payment tracking)
CREATE POLICY "Admins can insert driver earnings"
  ON driver_earnings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Allow admins to view all driver earnings
CREATE POLICY "Admins can view all driver earnings"
  ON driver_earnings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );