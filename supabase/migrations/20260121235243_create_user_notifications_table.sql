/*
  # Create user_notifications table

  1. New Tables
    - `user_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `notification_id` (uuid, foreign key to system_notifications)
      - `is_read` (boolean, default false)
      - `dismissed_at` (timestamptz, when user closed notification)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_notifications` table
    - Add policy for users to read their own notifications
    - Add policy for users to update their own notifications

  3. Purpose
    - Track which system notifications each user has seen/dismissed
    - Display dismissed notifications in the Messages page
*/

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES system_notifications(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_dismissed_at ON user_notifications(dismissed_at);
