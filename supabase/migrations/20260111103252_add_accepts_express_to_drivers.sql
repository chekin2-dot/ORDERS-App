/*
  # Add Express Delivery Acceptance to Drivers

  1. Changes
    - Add `accepts_express_delivery` column to drivers table (boolean, default true)
    - This indicates whether a driver is willing to accept express delivery orders

  2. Security
    - No RLS changes needed - drivers can update their own preference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'accepts_express_delivery'
  ) THEN
    ALTER TABLE drivers ADD COLUMN accepts_express_delivery boolean DEFAULT true;
  END IF;
END $$;