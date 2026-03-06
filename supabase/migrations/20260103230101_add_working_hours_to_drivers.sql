/*
  # Add Working Hours to Drivers Table

  ## Changes
  - Add `working_hours` column to drivers table to store driver availability schedule
  - This allows drivers to set their operating hours similar to merchants

  ## Notes
  - Uses JSONB format to store flexible schedule data
  - Default to empty object {}
*/

-- Add working_hours column to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'working_hours'
  ) THEN
    ALTER TABLE drivers ADD COLUMN working_hours jsonb DEFAULT '{}';
  END IF;
END $$;
