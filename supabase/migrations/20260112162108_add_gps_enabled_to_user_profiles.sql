/*
  # Add GPS Enabled Control for Clients

  1. Changes
    - Add `gps_enabled` field to user_profiles table
    - Defaults to `true` for existing users (backward compatibility)
    - Allows clients to control whether they want to share GPS location
    
  2. Security
    - No RLS changes needed, inherits existing user_profiles policies
    
  3. Important Notes
    - When GPS is disabled, drivers cannot see client's exact location
    - Client will be warned that order delivery requires GPS activation
*/

DO $$
BEGIN
  -- Add gps_enabled field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gps_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN gps_enabled boolean DEFAULT true;
  END IF;
END $$;