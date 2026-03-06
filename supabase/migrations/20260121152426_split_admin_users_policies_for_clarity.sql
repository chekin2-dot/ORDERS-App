/*
  # Split Admin Users ALL Policy Into Specific Operations
  
  1. Problem
    - The "ALL" policy might not be properly handling DELETE operations
    - Need explicit policies for INSERT, UPDATE, DELETE for better control
    
  2. Solution
    - Remove the broad "ALL" policy
    - Create specific policies for each operation (INSERT, UPDATE, DELETE)
    - Maintain the SELECT policy for all admins
    
  3. Security
    - Only super admins can manage (insert, update, delete) other admins
    - All admins can view the admin list
*/

-- Drop the broad ALL policy
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create specific policies for super admins
CREATE POLICY "Super admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));