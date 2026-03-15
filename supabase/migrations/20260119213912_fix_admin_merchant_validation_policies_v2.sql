/*
  # Fix Admin Merchant Validation Policies

  ## Problem
  Admins cannot validate merchants using SQL UPDATE commands because RLS policies
  only allow users to update their own profiles (auth.uid() = id).

  ## Solution
  Add admin-specific policies that allow active admins to:
  - Update ANY user_profile (including status field)
  - Update ANY merchant record (including verification_status)

  ## Changes
  1. Drop existing restrictive UPDATE policies
  2. Create new policies:
     - Users can update own profile (non-admin users)
     - Admins can update any profile
     - Merchants can update own shop
     - Admins can update any merchant record
  
  ## Security
  - Only active admins (is_active = true) can perform admin operations
  - Regular users can still only update their own records
*/

-- Drop existing restrictive policies for user_profiles updates
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create separate policies for regular users and admins
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Drop existing restrictive policies for merchants updates
DROP POLICY IF EXISTS "Merchants can update own shop" ON merchants;

-- Create separate policies for merchants and admins
CREATE POLICY "Merchants can update own shop"
  ON merchants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any merchant"
  ON merchants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );
