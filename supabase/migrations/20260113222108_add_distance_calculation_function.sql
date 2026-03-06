/*
  # Add Distance Calculation Function

  1. New Functions
    - `calculate_distance` - Calculates distance between two GPS coordinates using Haversine formula
      - Parameters: lat1, lon1, lat2, lon2 (all numeric)
      - Returns: distance in kilometers (numeric)
  
  2. Purpose
    - Enable nearby merchant discovery based on user location
    - Calculate accurate distances for delivery estimates
  
  3. Notes
    - Uses Haversine formula for accurate distance calculation
    - Returns distance in kilometers
    - Optimized for performance with proper indexing
*/

-- Create function to calculate distance between two GPS coordinates using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  earth_radius numeric := 6371; -- Earth's radius in kilometers
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  -- Return NULL if any coordinate is NULL
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  c := 2 * asin(sqrt(a));
  
  -- Return distance in kilometers
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index on merchants location for faster queries
CREATE INDEX IF NOT EXISTS idx_merchants_location ON merchants(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;