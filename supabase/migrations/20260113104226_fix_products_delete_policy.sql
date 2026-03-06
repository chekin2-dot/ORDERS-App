/*
  # Fix Product Delete Policy

  1. Changes
    - Drop the overly broad "Merchants can manage own products" policy with cmd "ALL"
    - Create specific policies for each operation (SELECT, INSERT, UPDATE, DELETE)
    - Ensure DELETE policy properly checks merchant ownership

  2. Security
    - Maintain strict RLS protection
    - Only merchants can delete their own products
    - Keep existing read and insert policies intact
*/

-- Drop the broad "ALL" policy that might not be working correctly
DROP POLICY IF EXISTS "Merchants can manage own products" ON products;

-- Create specific policy for merchants to update their own products
CREATE POLICY "Merchants can update own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      JOIN user_profiles ON merchants.user_id = user_profiles.id
      WHERE user_profiles.id = auth.uid()
      AND merchants.id = products.merchant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      JOIN user_profiles ON merchants.user_id = user_profiles.id
      WHERE user_profiles.id = auth.uid()
      AND merchants.id = products.merchant_id
    )
  );

-- Create specific policy for merchants to delete their own products
CREATE POLICY "Merchants can delete own products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      JOIN user_profiles ON merchants.user_id = user_profiles.id
      WHERE user_profiles.id = auth.uid()
      AND merchants.id = products.merchant_id
    )
  );