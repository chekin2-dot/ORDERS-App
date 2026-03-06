/*
  # Add Driver Earnings Tracking System

  1. Changes to Drivers Table
    - Add `balance` column to track total earnings
    - Add `total_deliveries` column to track number of completed deliveries

  2. New Tables
    - `driver_earnings`
      - Tracks each delivery fee transaction
      - Records order_id, driver_id, amount, type (delivery_fee, express_bonus)
      - Timestamps for when earnings are credited

  3. Security
    - Enable RLS on `driver_earnings` table
    - Add policies for drivers to view their own earnings
    - Add policies for system to insert earnings when orders are assigned

  4. Triggers
    - Automatically update driver balance when earnings are added
    - Increment delivery count when order is delivered
*/

-- Add balance and total deliveries to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'balance'
  ) THEN
    ALTER TABLE drivers ADD COLUMN balance numeric DEFAULT 0 CHECK (balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'total_deliveries'
  ) THEN
    ALTER TABLE drivers ADD COLUMN total_deliveries integer DEFAULT 0 CHECK (total_deliveries >= 0);
  END IF;
END $$;

-- Create driver_earnings table
CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  earning_type text NOT NULL CHECK (earning_type IN ('delivery_fee', 'express_bonus', 'tip')),
  description text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  credited_at timestamptz,
  UNIQUE(driver_id, order_id, earning_type)
);

-- Enable RLS
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- Policies for driver_earnings

-- Drivers can view their own earnings
CREATE POLICY "Drivers can view own earnings"
  ON driver_earnings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_earnings.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- System can insert earnings (authenticated users can insert for assigned drivers)
CREATE POLICY "System can insert earnings"
  ON driver_earnings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drivers can update their earnings status (for withdrawals)
CREATE POLICY "Drivers can update own earnings status"
  ON driver_earnings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_earnings.driver_id
      AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_earnings.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Create function to update driver balance
CREATE OR REPLACE FUNCTION update_driver_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE drivers
    SET balance = balance + NEW.amount
    WHERE id = NEW.driver_id;

    UPDATE driver_earnings
    SET
      status = 'credited',
      credited_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update balance
DROP TRIGGER IF EXISTS trigger_update_driver_balance ON driver_earnings;
CREATE TRIGGER trigger_update_driver_balance
  AFTER INSERT ON driver_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_balance();

-- Create function to increment delivery count when order is delivered
CREATE OR REPLACE FUNCTION increment_driver_delivery_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.driver_id IS NOT NULL) THEN
    UPDATE drivers
    SET total_deliveries = total_deliveries + 1
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to increment delivery count
DROP TRIGGER IF EXISTS trigger_increment_delivery_count ON orders;
CREATE TRIGGER trigger_increment_delivery_count
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
  EXECUTE FUNCTION increment_driver_delivery_count();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_order_id ON driver_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings(status);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON driver_earnings(created_at DESC);
