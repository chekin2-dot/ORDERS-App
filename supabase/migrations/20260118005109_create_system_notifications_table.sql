/*
  # Create System Notifications Table

  1. New Tables
    - `system_notifications`
      - `id` (uuid, primary key)
      - `title` (text)
      - `message` (text)
      - `target_user_type` (text) - 'all', 'client', 'merchant', 'driver'
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `system_notifications` table
    - Add policy for admin users to manage notifications
    - Add policy for users to view active notifications relevant to them
*/

CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_user_type text NOT NULL DEFAULT 'all' CHECK (target_user_type IN ('all', 'client', 'merchant', 'driver')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all notifications"
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

CREATE INDEX IF NOT EXISTS idx_system_notifications_target ON system_notifications(target_user_type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC);
