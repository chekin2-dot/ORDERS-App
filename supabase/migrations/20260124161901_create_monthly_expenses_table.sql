/*
  # Create Monthly Expenses Table

  1. New Tables
    - `monthly_expenses`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the expense
      - `amount` (numeric) - Monthly cost in dollars
      - `logo_url` (text, nullable) - URL to the logo image
      - `payment_ussd` (text, nullable) - USSD code for payment
      - `description` (text, nullable) - Optional description
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `monthly_expenses` table
    - Add policy for admins to manage expenses
    - Add policy for admins to view expenses
*/

CREATE TABLE IF NOT EXISTS monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  logo_url text,
  payment_ussd text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view expenses
CREATE POLICY "Admins can view monthly expenses"
  ON monthly_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Policy for admins to insert expenses
CREATE POLICY "Admins can insert monthly expenses"
  ON monthly_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Policy for admins to update expenses
CREATE POLICY "Admins can update monthly expenses"
  ON monthly_expenses
  FOR UPDATE
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

-- Policy for admins to delete expenses
CREATE POLICY "Admins can delete monthly expenses"
  ON monthly_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Insert default expenses
INSERT INTO monthly_expenses (name, amount, logo_url, payment_ussd, description)
VALUES 
  ('Bolt', 400.00, 'https://logowik.com/content/uploads/images/bolt4655.logowik.com.webp', '*144*8*2*1*21466127*1974#', 'Bolt monthly subscription'),
  ('Supabase Database', 35.00, 'https://supabase.com/dashboard/_next/image?url=%2Fdashboard%2Fimg%2Fsupabase-logo.png&w=64&q=75', '*144*8*2*1*21466127*1974#', 'Supabase database hosting')
ON CONFLICT DO NOTHING;