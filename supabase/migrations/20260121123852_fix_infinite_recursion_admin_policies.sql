/*
  # Fix Infinite Recursion in Admin Policies
  
  1. Problem
    - Policies were checking admin_users table within admin_users policies
    - This caused infinite recursion
    
  2. Solution
    - Use is_admin() and is_super_admin() helper functions
    - These functions have SECURITY DEFINER and bypass RLS
    
  3. Security
    - Super admins have full control
    - Active admins can view all admins
    - Proper RLS without recursion
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Super admins have full access to admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Active admins can manage all notifications" ON system_notifications;

-- Restore correct policies for admin_users using helper functions
CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Restore correct policy for system_notifications using helper functions
CREATE POLICY "Active admins can manage all notifications"
  ON system_notifications
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));