/*
  # Add TAXI Category with Subcategories

  1. New Categories
    - `TAXI` (parent category)
      - Main taxi service category
    - `TAXI AUTO` (subcategory)
      - Car taxi services
    - `TAXI MOTO` (subcategory)
      - Motorcycle taxi services
  
  2. Changes
    - Insert TAXI as main category if it doesn't exist
    - Insert TAXI AUTO and TAXI MOTO as subcategories under TAXI
    - Add appropriate icons for visual representation
*/

-- Insert TAXI parent category
DO $$
DECLARE
  taxi_category_id uuid;
BEGIN
  -- Check if TAXI category exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'TAXI') THEN
    INSERT INTO categories (name, name_fr, icon, parent_id)
    VALUES ('Taxi Services', 'TAXI', 'car-taxi-front', NULL)
    RETURNING id INTO taxi_category_id;
  ELSE
    SELECT id INTO taxi_category_id FROM categories WHERE name_fr = 'TAXI';
  END IF;

  -- Insert TAXI AUTO subcategory
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'TAXI AUTO') THEN
    INSERT INTO categories (name, name_fr, icon, parent_id)
    VALUES ('Car Taxi', 'TAXI AUTO', 'car', taxi_category_id);
  END IF;

  -- Insert TAXI MOTO subcategory
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'TAXI MOTO') THEN
    INSERT INTO categories (name, name_fr, icon, parent_id)
    VALUES ('Motorcycle Taxi', 'TAXI MOTO', 'bike', taxi_category_id);
  END IF;
END $$;
