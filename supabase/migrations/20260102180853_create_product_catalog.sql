/*
  # Create Product Catalog

  1. New Tables
    - `product_catalog`
      - `id` (uuid, primary key)
      - `name` (text) - Product name
      - `category` (text) - Main category (e.g., "Boulangerie / Viennoiseries / Pâtisserie")
      - `subcategory` (text) - Subcategory (e.g., "Pain", "Viennoiseries")
      - `search_terms` (text) - Normalized text for search
      - `is_night_product` (boolean) - Whether it's a night/emergency product
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `product_catalog` table
    - Add policy for authenticated users to read catalog

  3. Data
    - Populate with all products from the 16 categories
*/

-- Create product_catalog table
CREATE TABLE IF NOT EXISTS product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subcategory text DEFAULT '',
  search_terms text NOT NULL,
  is_night_product boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can view product catalog"
  ON product_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Create search index
CREATE INDEX IF NOT EXISTS idx_product_catalog_search ON product_catalog USING gin(to_tsvector('french', search_terms));
CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON product_catalog(category);

-- Insert products from category 1: Boulangerie / Viennoiseries / Pâtisserie
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
-- Pain
('Baguette blanche', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'baguette blanche pain'),
('Baguette tradition', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'baguette tradition pain'),
('Baguette complète', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'baguette complete pain'),
('Baguette aux céréales', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'baguette cereales pain'),
('Pain de mie nature', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain mie nature'),
('Pain de mie complet', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain mie complet'),
('Pain de mie sans croûte', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain mie sans croute'),
('Pain aux céréales', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain cereales'),
('Pain de campagne', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain campagne'),
('Pain de seigle', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain seigle'),
('Pain complet', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain complet'),
('Pain aux noix', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain noix'),
('Pain aux olives', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain olives'),
('Pain brioché', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain brioche'),
('Pain hamburger', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain hamburger burger'),
('Pain hot-dog', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain hot dog hotdog'),
('Pita', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pita pain'),
('Naan nature', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'naan nature pain'),
('Naan à l''ail', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'naan ail pain'),
('Tortillas de blé', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'tortillas ble pain'),
('Tortillas de maïs', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'tortillas mais pain'),
('Wraps', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'wraps pain'),
('Pain sans gluten', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pain', 'pain sans gluten'),
-- Viennoiseries
('Croissant nature', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'croissant nature viennoiserie'),
('Croissant au beurre', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'croissant beurre viennoiserie'),
('Pain au chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'pain chocolat chocolatine viennoiserie'),
('Chausson aux pommes', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'chausson pommes viennoiserie'),
('Brioche tranchée', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'brioche tranchee viennoiserie'),
('Brioche tressée', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'brioche tressee viennoiserie'),
('Brioche au sucre', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'brioche sucre viennoiserie'),
('Brioche aux pépites de chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'brioche pepites chocolat viennoiserie'),
('Donuts nature', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'donuts nature viennoiserie'),
('Donuts glacés', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'donuts glaces viennoiserie'),
('Donuts fourrés', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'donuts fourres chocolat confiture viennoiserie'),
('Muffins nature', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'muffins nature viennoiserie'),
('Muffins au chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'muffins chocolat viennoiserie'),
('Muffins aux myrtilles', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'muffins myrtilles viennoiserie'),
('Rolls à la cannelle', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'rolls cannelle viennoiserie'),
('Beignets au sucre', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'beignets sucre viennoiserie'),
('Beignets fourrés', 'Boulangerie / Viennoiseries / Pâtisserie', 'Viennoiseries', 'beignets fourres viennoiserie'),
-- Pâtisserie
('Éclair au chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'eclair chocolat patisserie'),
('Éclair au café', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'eclair cafe patisserie'),
('Tarte aux pommes', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'tarte pommes patisserie'),
('Tarte aux fraises', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'tarte fraises patisserie'),
('Tarte au citron meringuée', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'tarte citron meringuee patisserie'),
('Mille-feuille', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'mille feuille patisserie'),
('Opéra', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'opera patisserie gateau'),
('Forêt-noire', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'foret noire patisserie gateau'),
('Fraisier', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'fraisier patisserie gateau'),
('Paris-Brest', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'paris brest patisserie'),
('Cheesecake', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'cheesecake patisserie gateau'),
('Moelleux au chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'moelleux chocolat patisserie gateau'),
('Fondant au chocolat', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'fondant chocolat patisserie gateau'),
('Brownies', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'brownies chocolat patisserie'),
('Cookies', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'cookies chocolat noix patisserie'),
('Macarons assortis', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'macarons assortis patisserie'),
('Gâteau marbré', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'gateau marbre patisserie'),
('Gâteau yaourt', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'gateau yaourt patisserie'),
('Cupcakes variés', 'Boulangerie / Viennoiseries / Pâtisserie', 'Pâtisserie', 'cupcakes varies patisserie');

-- Category 2: Fruits & Légumes (will continue in next insert due to size)
