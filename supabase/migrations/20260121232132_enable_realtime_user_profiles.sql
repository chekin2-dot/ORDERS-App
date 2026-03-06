/*
  # Enable Realtime for User Profiles GPS Tracking
  
  1. Changes
    - Enable realtime replication for user_profiles table
    - Set replica identity to FULL to include old values in updates
    - This allows subscribers to receive real-time GPS coordinate updates
  
  2. Security
    - Existing RLS policies continue to apply
    - Only authorized users can see location updates based on existing policies
*/

-- Enable replica identity FULL to get old values in realtime updates
ALTER TABLE user_profiles REPLICA IDENTITY FULL;

-- Enable realtime for user_profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;