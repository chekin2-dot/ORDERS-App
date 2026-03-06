/*
  # Enable realtime for user_notifications table

  1. Changes
    - Enable realtime publication for user_notifications table
    - This allows the Messages pages to receive real-time updates when notifications are dismissed
*/

ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
