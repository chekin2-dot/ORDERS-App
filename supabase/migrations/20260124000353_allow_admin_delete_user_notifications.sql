/*
  # Allow Admins to Delete User Notifications

  1. Problem
    - When admins delete system_notifications, the CASCADE delete fails
    - The RLS policy on user_notifications only allows users to delete their own
    - This blocks the admin from deleting system notifications
    
  2. Solution
    - Add a policy allowing admins to delete any user notifications
    - This enables the CASCADE delete to work properly
    
  3. Security
    - Only active admins can delete any user notifications
    - Regular users can still only delete their own
*/

-- Add policy for admins to delete any user notifications
CREATE POLICY "Admins can delete any user notifications"
  ON user_notifications
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