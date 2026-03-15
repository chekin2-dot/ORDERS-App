/*
  # Update Categories Structure
  
  ## Changes
  - Add parent_id column to categories table for hierarchical structure
  - Update existing categories
  - Insert new category structure:
    - Livraison (parent)
      - Alimentations
      - Pharmacie
      - Boulangérie
      - Restaurants
    - Service (parent)
      - Electricien
      - Plombier
      - Mécanicien Auto
      - Mécanicien Moto
      - Taxi
      - Livreur
*/

-- Add parent_id column to support category hierarchy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN parent_id uuid REFERENCES categories(id);
  END IF;
END $$;

-- Clear existing categories
DELETE FROM categories;

-- Insert parent categories
INSERT INTO categories (id, name, name_fr, icon, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Delivery', 'Livraison', '🚚', NULL),
  ('00000000-0000-0000-0000-000000000002', 'Service', 'Service', '🔧', NULL);

-- Insert Livraison subcategories
INSERT INTO categories (name, name_fr, icon, parent_id) VALUES
  ('Food', 'Alimentations', '🍔', '00000000-0000-0000-0000-000000000001'),
  ('Pharmacy', 'Pharmacie', '💊', '00000000-0000-0000-0000-000000000001'),
  ('Bakery', 'Boulangérie', '🥖', '00000000-0000-0000-0000-000000000001'),
  ('Restaurant', 'Restaurants', '🍽️', '00000000-0000-0000-0000-000000000001');

-- Insert Service subcategories
INSERT INTO categories (name, name_fr, icon, parent_id) VALUES
  ('Electrician', 'Electricien', '⚡', '00000000-0000-0000-0000-000000000002'),
  ('Plumber', 'Plombier', '🔧', '00000000-0000-0000-0000-000000000002'),
  ('Auto Mechanic', 'Mécanicien Auto', '🚗', '00000000-0000-0000-0000-000000000002'),
  ('Moto Mechanic', 'Mécanicien Moto', '🏍️', '00000000-0000-0000-0000-000000000002'),
  ('Taxi', 'Taxi', '🚕', '00000000-0000-0000-0000-000000000002'),
  ('Driver', 'Livreur', '🛵', '00000000-0000-0000-0000-000000000002');

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);