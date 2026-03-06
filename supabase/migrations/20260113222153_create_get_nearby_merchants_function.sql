/*
  # Create Get Nearby Merchants Function

  1. New RPC Functions
    - `get_nearby_merchants` - Returns merchants within specified distance
      - Parameters: 
        - user_lat (numeric) - User's latitude
        - user_lon (numeric) - User's longitude  
        - max_distance_km (numeric) - Maximum distance in kilometers (default 5km)
      - Returns: Array of merchants with distance information
  
  2. Returns
    - id: Merchant ID
    - shop_name: Shop name
    - neighborhood: Merchant neighborhood
    - category_name: Category name (French)
    - category_icon: Category icon
    - distance: Distance from user in kilometers
    - logo_url: Merchant logo URL
  
  3. Features
    - Only returns merchants with GPS coordinates
    - Sorted by distance (closest first)
    - Limited to 10 results for performance
    - Includes category information for display
*/

CREATE OR REPLACE FUNCTION get_nearby_merchants(
  user_lat numeric,
  user_lon numeric,
  max_distance_km numeric DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  shop_name text,
  neighborhood text,
  category_name text,
  category_icon text,
  distance numeric,
  logo_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.shop_name,
    m.neighborhood,
    COALESCE(c.name_fr, c.name) as category_name,
    c.icon as category_icon,
    ROUND(calculate_distance(user_lat, user_lon, m.latitude, m.longitude)::numeric, 2) as distance,
    m.logo_url
  FROM merchants m
  LEFT JOIN categories c ON c.id = m.category_id
  WHERE 
    m.latitude IS NOT NULL 
    AND m.longitude IS NOT NULL
    AND m.verification_status = 'verified'
    AND calculate_distance(user_lat, user_lon, m.latitude, m.longitude) <= max_distance_km
  ORDER BY distance ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;