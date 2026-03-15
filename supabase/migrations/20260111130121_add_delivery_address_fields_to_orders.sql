/*
  # Add delivery address fields to orders table
  
  1. Changes
    - Add `delivery_address` (text) to store the full delivery address
    - Add `delivery_neighborhood` (text) to store the neighborhood name
    - Add `delivery_latitude` (numeric) to store GPS coordinates
    - Add `delivery_longitude` (numeric) to store GPS coordinates
  
  2. Notes
    - These fields are needed to track delivery locations for each order
    - Coordinates help drivers navigate to the client's location
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_neighborhood'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_neighborhood text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_latitude'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_longitude'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_longitude numeric;
  END IF;
END $$;