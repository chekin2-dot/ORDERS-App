/*
  # Split System Notifications Policies for Clarity
  
  1. Problem
    - The "ALL" policy might not be properly handling all operations
    - Need explicit policies for each operation type
    
  2. Solution
    - Remove the broad "ALL" policy
    - Create specific policies for INSERT, UPDATE, DELETE
    - Keep the user-specific SELECT policy
    
  3. Security
    - Only active admins can manage notifications
    - Users can view notifications targeted to them
*/

-- Drop the broad ALL policy
DROP POLICY IF EXISTS "Active admins can manage all notifications" ON system_notifications;

-- Create specific policies for admins
CREATE POLICY "Active admins can insert notifications"
  ON system_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Active admins can update notifications"
  ON system_notifications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Active admins can delete notifications"
  ON system_notifications
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));