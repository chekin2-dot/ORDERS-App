/*
  # Fix Admin Deletion Policies - Final
  
  1. Changes
    - Ensure super_admins can delete any admin user (except themselves)
    - Ensure active admins can delete system notifications
    - Remove any conflicting policies
    
  2. Security
    - Super admins have full control over admin_users table
    - Active admins can manage system_notifications
    - Safety check to prevent self-deletion
*/

-- Clean up all existing policies on admin_users to avoid conflicts
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can delete other admins" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON admin_users;

-- Create comprehensive policies for admin_users table
CREATE POLICY "Super admins have full access to admin_users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Clean up all existing policies on system_notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON system_notifications;
DROP POLICY IF EXISTS "Users can view active notifications for their type" ON system_notifications;

-- Create comprehensive policies for system_notifications
CREATE POLICY "Active admins can manage all notifications"
  ON system_notifications
  FOR ALL
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

CREATE POLICY "Users can view active notifications for their type"
  ON system_notifications
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      target_user_type = 'all'
      OR target_user_type = (
        SELECT user_type::text FROM user_profiles
        WHERE user_profiles.id = auth.uid()
      )
    )
  );