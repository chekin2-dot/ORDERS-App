/*
  # Create Admin System

  1. New Tables
    - `admin_users` - Admin user roles
    - `admin_action_logs` - Log all admin actions

  2. Functions
    - `is_admin` - Check if user is admin
    - `get_platform_stats` - Platform statistics

  3. Security
    - RLS enabled
    - Only admins can access
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'moderator',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create admin_action_logs table
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES user_profiles(id),
  target_order_id uuid REFERENCES orders(id),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin ON admin_action_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON admin_action_logs(created_at DESC);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = user_uuid AND role = 'super_admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view all admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- RLS Policies for admin_action_logs
CREATE POLICY "Admins can view all action logs"
  ON admin_action_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert action logs"
  ON admin_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));
