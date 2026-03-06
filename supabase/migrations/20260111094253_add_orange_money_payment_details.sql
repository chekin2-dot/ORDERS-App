/*
  # Add Orange Money Payment Details

  1. Changes
    - Add `orange_money_number` column to `drivers` table
    - Add `orange_money_number` column to `merchants` table
    - Add `orange_money_name` column to both tables for account holder name

  2. Notes
    - Orange Money numbers are stored as text for flexibility
    - Account holder name helps verify payment identity
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'orange_money_number'
  ) THEN
    ALTER TABLE drivers ADD COLUMN orange_money_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'orange_money_name'
  ) THEN
    ALTER TABLE drivers ADD COLUMN orange_money_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'orange_money_number'
  ) THEN
    ALTER TABLE merchants ADD COLUMN orange_money_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'orange_money_name'
  ) THEN
    ALTER TABLE merchants ADD COLUMN orange_money_name text;
  END IF;
END $$;