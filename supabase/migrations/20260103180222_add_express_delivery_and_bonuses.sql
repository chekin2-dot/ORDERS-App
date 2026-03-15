/*
  # Add Express Delivery and Driver Bonuses

  ## New Features
  1. Express Delivery Support
    - Add `is_express` column to orders table (boolean)
    - Add `express_bonus` column to orders table for driver bonus
    - Add `delivery_time_minutes` column to track actual delivery time
    - Express deliveries completed within 10 minutes earn a bonus

  2. Driver Performance Tracking
    - Add columns to track driver earnings and bonuses
    - Enable tracking of express deliveries

  ## Changes
  - Modify `orders` table to support express delivery
  - Add bonus calculation logic
  - Update indexes for performance
*/

-- Add express delivery fields to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'is_express'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_express boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'express_bonus'
  ) THEN
    ALTER TABLE orders ADD COLUMN express_bonus numeric DEFAULT 0 CHECK (express_bonus >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_time_minutes'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_time_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_started_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_completed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_completed_at timestamptz;
  END IF;
END $$;

-- Add driver earnings tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'total_deliveries'
  ) THEN
    ALTER TABLE drivers ADD COLUMN total_deliveries integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE drivers ADD COLUMN total_earnings numeric DEFAULT 0 CHECK (total_earnings >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'express_deliveries'
  ) THEN
    ALTER TABLE drivers ADD COLUMN express_deliveries integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'total_bonuses'
  ) THEN
    ALTER TABLE drivers ADD COLUMN total_bonuses numeric DEFAULT 0 CHECK (total_bonuses >= 0);
  END IF;
END $$;

-- Create function to calculate express delivery bonus
CREATE OR REPLACE FUNCTION calculate_express_bonus(
  order_id uuid
) RETURNS numeric AS $$
DECLARE
  delivery_time integer;
  base_bonus numeric := 500;
BEGIN
  SELECT delivery_time_minutes INTO delivery_time
  FROM orders
  WHERE id = order_id AND is_express = true;

  IF delivery_time IS NOT NULL AND delivery_time <= 10 THEN
    RETURN base_bonus;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate delivery time and bonus
CREATE OR REPLACE FUNCTION update_delivery_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_completed_at IS NOT NULL AND NEW.delivery_started_at IS NOT NULL THEN
    NEW.delivery_time_minutes := EXTRACT(EPOCH FROM (NEW.delivery_completed_at - NEW.delivery_started_at)) / 60;
    
    IF NEW.is_express = true AND NEW.delivery_time_minutes <= 10 THEN
      NEW.express_bonus := 500;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivery_metrics ON orders;
CREATE TRIGGER trigger_update_delivery_metrics
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_metrics();

-- Create index for express deliveries
CREATE INDEX IF NOT EXISTS idx_orders_express ON orders(is_express, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_times ON orders(delivery_started_at, delivery_completed_at);
