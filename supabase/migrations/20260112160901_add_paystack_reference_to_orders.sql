/*
  # Add Paystack Payment Reference Field

  1. Changes
    - Add `paystack_reference` field to orders table to store Paystack payment reference
    - Add `paystack_access_code` field to store Paystack access code for payment popup
    
  2. Security
    - No RLS changes needed, inherits existing order policies
*/

DO $$
BEGIN
  -- Add paystack_reference if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paystack_reference'
  ) THEN
    ALTER TABLE orders ADD COLUMN paystack_reference text;
  END IF;

  -- Add paystack_access_code if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paystack_access_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN paystack_access_code text;
  END IF;
END $$;