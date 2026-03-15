/*
  # Add Merchant Categories

  1. Changes
    - Delete existing empty categories
    - Add all required merchant categories
    
  2. Categories Added
    - Alimentations
    - Pharmacies
    - Restaurants
    - Boulangéries
    - Electriciens
    - Plombiers
    - Garages Autos
    - Garages Motos
    - Cliniques à Domicile
*/

-- Delete empty categories
DELETE FROM categories WHERE name_fr = '' OR name_fr IS NULL;

-- Insert merchant categories if they don't exist
DO $$
BEGIN
  -- Alimentations
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Alimentations') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Groceries', 'Alimentations', 'shopping-bag');
  END IF;

  -- Pharmacies
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Pharmacies') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Pharmacies', 'Pharmacies', 'pill');
  END IF;

  -- Restaurants
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Restaurants') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Restaurants', 'Restaurants', 'utensils');
  END IF;

  -- Boulangéries
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Boulangéries') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Bakeries', 'Boulangéries', 'croissant');
  END IF;

  -- Electriciens
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Electriciens') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Electricians', 'Electriciens', 'zap');
  END IF;

  -- Plombiers
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Plombiers') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Plumbers', 'Plombiers', 'droplet');
  END IF;

  -- Garages Autos
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Garages Autos') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Auto Garages', 'Garages Autos', 'car');
  END IF;

  -- Garages Motos
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Garages Motos') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Motorcycle Garages', 'Garages Motos', 'bike');
  END IF;

  -- Cliniques à Domicile
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name_fr = 'Cliniques à Domicile') THEN
    INSERT INTO categories (name, name_fr, icon) VALUES ('Home Clinics', 'Cliniques à Domicile', 'heart-pulse');
  END IF;
END $$;
