/*
  # Update Get Nearby Merchants Function to Include Shop Photos

  1. Changes
    - Drop and recreate `get_nearby_merchants` function to return merchant photos
    - Returns the first uploaded merchant photo from merchant_photos table
    - Falls back to shop_photo_url if no photos uploaded
    - Provides consistent visual representation across the app

  2. Returns
    - id: Merchant ID
    - shop_name: Shop name
    - neighborhood: Merchant neighborhood
    - category_name: Category name (French)
    - category_icon: Category icon
    - distance: Distance from user in kilometers
    - logo_url: Merchant logo URL
    - shop_photo_url: First uploaded shop photo or fallback image
*/

DROP FUNCTION IF EXISTS get_nearby_merchants(numeric, numeric, numeric);

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
  logo_url text,
  shop_photo_url text
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
    m.logo_url,
    COALESCE(
      (SELECT mp.photo_url FROM merchant_photos mp
       WHERE mp.merchant_id = m.id
       ORDER BY mp.display_order ASC
       LIMIT 1),
      m.shop_photo_url
    ) as shop_photo_url
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
