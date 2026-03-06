/*
  # Fix System Notifications Deletion Policy

  1. Problem
    - Admins cannot delete system notifications they created
    - The is_admin() function might not be evaluating correctly in RLS context
    
  2. Solution
    - Recreate the delete policy with explicit admin check
    - Use a direct subquery instead of relying on is_admin function
    
  3. Security
    - Only active admins can delete notifications
    - Explicit check against admin_users table
*/

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Active admins can delete notifications" ON system_notifications;

-- Create a new explicit delete policy
CREATE POLICY "Active admins can delete notifications"
  ON system_notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );