/*
  # Add Policy for Clients to View Drivers

  1. Changes
    - Add RLS policy allowing clients to view verified and available drivers
    - This is needed for the driver selection feature during order creation

  2. Security
    - Clients can only see drivers who are:
      - Verified (verification_status = 'verified')
      - Available (is_available = true)
    - Identity photos and sensitive information remain protected
*/

CREATE POLICY "Clients can view available drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    verification_status = 'verified' AND
    is_available = true AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'client'
    )
  );