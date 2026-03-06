/*
  # Add delete policy for user_notifications

  1. Changes
    - Add DELETE policy for user_notifications table
    - Users can delete their own notification records from the Messages page
*/

CREATE POLICY "Users can delete own notifications"
  ON user_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
