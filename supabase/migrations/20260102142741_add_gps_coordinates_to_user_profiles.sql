/*
  # Add GPS Coordinates to User Profiles
  
  ## Changes
  - Add latitude and longitude columns to user_profiles table
  - These will store GPS location for clients, merchants, and drivers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(latitude, longitude);