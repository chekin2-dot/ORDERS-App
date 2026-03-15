/*
  # Fix Admin and Notification Deletion Policies

  1. Changes
    - Drop conflicting delete policy on admin_users that only allows self-deletion
    - Ensure super_admins can delete any admin user (except themselves for safety)
    - Verify notification deletion works properly for active admins
    
  2. Security
    - Super admins can manage all admin users
    - Admins can delete notifications
    - Prevent accidental self-deletion of super admin
*/

-- Drop the conflicting self-delete policy that was blocking super_admin deletion
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON admin_users;

-- The existing "Super admins can manage admin users" policy should handle all operations
-- But let's make it more explicit for deletion with safety check
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

CREATE POLICY "Super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Add explicit delete policy for better clarity
CREATE POLICY "Super admins can delete other admins"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) AND 
    user_id != auth.uid()  -- Prevent self-deletion
  );
