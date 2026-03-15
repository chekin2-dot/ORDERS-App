/*
  # Create Merchant Product Catalog for Burkina Faso Market

  ## Overview
  This migration creates a comprehensive product catalog for merchants in Burkina Faso
  with realistic pricing in FCFA (West African CFA franc).

  ## Changes Made
  
  1. New Table: `merchant_product_catalog`
     - `id` (uuid, primary key)
     - `code` (text, unique) - Product code for easy reference
     - `name` (text) - Product name in French
     - `category_type` (text) - "Livraison" or "Service"
     - `category` (text) - Main category (Alimentations, Pharmacie, Boulangérie, Restaurants)
     - `subcategory` (text) - Product subcategory
     - `unit` (text) - Unit of measurement (kg, L, piece, sac, etc.)
     - `default_price` (numeric) - Suggested retail price in FCFA
     - `typical_brands` (text[]) - Common brands for this product
     - `description` (text) - Product description and notes
     - `search_terms` (text) - Normalized search terms
     - `created_at` (timestamp)

  2. Security
     - Enable RLS on merchant_product_catalog
     - Allow all authenticated users to read catalog
     
  3. Data Population
     - Alimentations: Céréales & riz, Huiles & condiments, Produits laitiers, Viandes & poissons, Conserves, Boissons
     - Pharmacie: Médicaments courants, Hygiène personnelle, Premiers soins
     - Boulangerie: Already populated in previous migration
     - Restaurants: Plats préparés, Boissons chaudes

  ## Notes
  - Prices are indicative and based on Burkina Faso market rates
  - Merchants can adjust prices when adding products to their inventory
  - 1000 FCFA ≈ 1.50 EUR / 1.70 USD (approximate)
*/

-- Create merchant product catalog table
CREATE TABLE IF NOT EXISTS merchant_product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('Livraison', 'Service')),
  category text NOT NULL,
  subcategory text DEFAULT '',
  unit text NOT NULL,
  default_price numeric NOT NULL CHECK (default_price >= 0),
  typical_brands text[] DEFAULT '{}',
  description text DEFAULT '',
  search_terms text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE merchant_product_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Authenticated users can view merchant product catalog"
  ON merchant_product_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_catalog_search ON merchant_product_catalog USING gin(to_tsvector('french', search_terms));
CREATE INDEX IF NOT EXISTS idx_merchant_catalog_category ON merchant_product_catalog(category);
CREATE INDEX IF NOT EXISTS idx_merchant_catalog_code ON merchant_product_catalog(code);

-- ============================================================================
-- CATEGORY: Livraison > Alimentations
-- ============================================================================

-- Subcategory: Céréales et riz
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-CEREAL-001', 'Riz brisé local 25 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'sac_25kg', 13500, ARRAY['Local', 'Import Asie'], 'Riz brisé très consommé, souvent vendu en vrac ou sac', 'riz brise local sac'),
('ALIM-CEREAL-002', 'Riz parfumé 5 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'sac_5kg', 4500, ARRAY['Royal Umbrella', 'Caprice', 'Tilda'], 'Riz parfumé pour occasions et ménages urbains', 'riz parfume sac'),
('ALIM-CEREAL-003', 'Riz basmati 1 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'kg', 1200, ARRAY['Tilda', 'Daawat'], 'Riz basmati de qualité supérieure', 'riz basmati'),
('ALIM-CEREAL-004', 'Maïs grain 5 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'sac_5kg', 2500, ARRAY['Production locale'], 'Base pour tô, bouillies, couscous local', 'mais grain sac to bouillie'),
('ALIM-CEREAL-005', 'Mil grain 5 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'sac_5kg', 2800, ARRAY['Production locale'], 'Céréale traditionnelle pour bouillies', 'mil grain sac bouillie'),
('ALIM-CEREAL-006', 'Sorgho grain 5 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'sac_5kg', 2600, ARRAY['Production locale'], 'Céréale locale pour tô et dolo', 'sorgho grain sac to dolo'),
('ALIM-CEREAL-007', 'Fonio précuit 1 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'kg', 1800, ARRAY['Marque locale'], 'Fonio précuit facile à préparer', 'fonio precuit'),
('ALIM-CEREAL-008', 'Pâtes alimentaires 500g', 'Livraison', 'Alimentations', 'Céréales et riz', 'paquet', 450, ARRAY['Panzani', 'Barilla', 'Marque locale'], 'Spaghetti, macaroni, coquillettes', 'pates alimentaires spaghetti macaroni'),
('ALIM-CEREAL-009', 'Couscous 1 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'kg', 900, ARRAY['Ferrero', 'Dari'], 'Couscous moyen ou fin', 'couscous'),
('ALIM-CEREAL-010', 'Semoule de maïs 1 kg', 'Livraison', 'Alimentations', 'Céréales et riz', 'kg', 600, ARRAY['Marque locale'], 'Pour préparation de tô et bouillies', 'semoule mais to bouillie');

-- Subcategory: Huiles et condiments
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-HUILE-001', 'Huile végétale 1L', 'Livraison', 'Alimentations', 'Huiles et condiments', 'litre', 1200, ARRAY['Dinor', 'Olitalia', 'Lesieur'], 'Huile de cuisine polyvalente', 'huile vegetale litre'),
('ALIM-HUILE-002', 'Huile d''arachide 1L', 'Livraison', 'Alimentations', 'Huiles et condiments', 'litre', 1500, ARRAY['Production locale', 'Sonacos'], 'Huile d''arachide locale', 'huile arachide litre'),
('ALIM-HUILE-003', 'Huile de palme 1L', 'Livraison', 'Alimentations', 'Huiles et condiments', 'litre', 800, ARRAY['Production locale'], 'Huile rouge pour sauces', 'huile palme rouge litre'),
('ALIM-HUILE-004', 'Beurre de karité 500g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'pot', 1200, ARRAY['Production locale'], 'Beurre de karité pour cuisine', 'beurre karite pot'),
('ALIM-COND-001', 'Sel fin 1 kg', 'Livraison', 'Alimentations', 'Huiles et condiments', 'kg', 300, ARRAY['Marque locale', 'La Baleine'], 'Sel de cuisine iodé', 'sel fin iode'),
('ALIM-COND-002', 'Cube Maggi 100 cubes', 'Livraison', 'Alimentations', 'Huiles et condiments', 'boite', 1800, ARRAY['Maggi'], 'Cubes d''assaisonnement', 'cube maggi assaisonnement'),
('ALIM-COND-003', 'Jumbo cube 48 cubes', 'Livraison', 'Alimentations', 'Huiles et condiments', 'boite', 1500, ARRAY['Jumbo'], 'Cubes d''assaisonnement Jumbo', 'jumbo cube assaisonnement'),
('ALIM-COND-004', 'Tomate concentrée 70g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'tube', 250, ARRAY['Pomo', 'Gino'], 'Concentré de tomate', 'tomate concentree tube'),
('ALIM-COND-005', 'Sauce tomate 400g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'boite', 600, ARRAY['Pomo', 'Del Monte'], 'Sauce tomate en conserve', 'sauce tomate conserve'),
('ALIM-COND-006', 'Piment en poudre 100g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'sachet', 400, ARRAY['Marque locale'], 'Piment moulu pour assaisonnement', 'piment poudre moulu'),
('ALIM-COND-007', 'Ail en poudre 100g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'sachet', 500, ARRAY['Marque locale'], 'Ail déshydraté en poudre', 'ail poudre'),
('ALIM-COND-008', 'Oignon en poudre 100g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'sachet', 450, ARRAY['Marque locale'], 'Oignon déshydraté en poudre', 'oignon poudre'),
('ALIM-COND-009', 'Vinaigre blanc 75cl', 'Livraison', 'Alimentations', 'Huiles et condiments', 'bouteille', 600, ARRAY['Marque locale'], 'Vinaigre pour assaisonnement', 'vinaigre blanc'),
('ALIM-COND-010', 'Moutarde 250g', 'Livraison', 'Alimentations', 'Huiles et condiments', 'pot', 800, ARRAY['Amora', 'Maille'], 'Moutarde de Dijon', 'moutarde pot');

-- Subcategory: Produits laitiers
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-LAIT-001', 'Lait en poudre 400g', 'Livraison', 'Alimentations', 'Produits laitiers', 'boite', 2800, ARRAY['Nido', 'Gloria', 'Régilait'], 'Lait entier en poudre', 'lait poudre boite'),
('ALIM-LAIT-002', 'Lait concentré sucré 397g', 'Livraison', 'Alimentations', 'Produits laitiers', 'boite', 1200, ARRAY['Nestlé', 'Gloria'], 'Lait concentré sucré', 'lait concentre sucre boite'),
('ALIM-LAIT-003', 'Lait concentré non sucré 410g', 'Livraison', 'Alimentations', 'Produits laitiers', 'boite', 900, ARRAY['Carnation', 'Idéal'], 'Lait évaporé non sucré', 'lait concentre non sucre evapore'),
('ALIM-LAIT-004', 'Lait liquide UHT 1L', 'Livraison', 'Alimentations', 'Produits laitiers', 'litre', 1100, ARRAY['Candia', 'Lactel'], 'Lait frais longue conservation', 'lait liquide uht frais'),
('ALIM-LAIT-005', 'Yaourt nature 125g', 'Livraison', 'Alimentations', 'Produits laitiers', 'pot', 300, ARRAY['Danone', 'Yoplait'], 'Yaourt nature individuel', 'yaourt nature pot'),
('ALIM-LAIT-006', 'Yaourt aux fruits 125g', 'Livraison', 'Alimentations', 'Produits laitiers', 'pot', 350, ARRAY['Danone', 'Yoplait'], 'Yaourt fruité individuel', 'yaourt fruits pot'),
('ALIM-LAIT-007', 'Fromage La vache qui rit 8 portions', 'Livraison', 'Alimentations', 'Produits laitiers', 'boite', 1200, ARRAY['La vache qui rit'], 'Fromage fondu en portions', 'fromage vache qui rit portions'),
('ALIM-LAIT-008', 'Beurre 250g', 'Livraison', 'Alimentations', 'Produits laitiers', 'plaquette', 1800, ARRAY['Président', 'Elle & Vire'], 'Beurre doux ou demi-sel', 'beurre plaquette'),
('ALIM-LAIT-009', 'Margarine 250g', 'Livraison', 'Alimentations', 'Produits laitiers', 'pot', 800, ARRAY['Planta', 'Blue Band'], 'Margarine végétale', 'margarine pot'),
('ALIM-LAIT-010', 'Crème fraîche 200ml', 'Livraison', 'Alimentations', 'Produits laitiers', 'pot', 1500, ARRAY['Président', 'Elle & Vire'], 'Crème fraîche épaisse', 'creme fraiche pot');

-- Subcategory: Viandes et poissons
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-VIANDE-001', 'Poulet entier congelé', 'Livraison', 'Alimentations', 'Viandes et poissons', 'piece', 3500, ARRAY['Import Brésil', 'Local'], 'Poulet entier surgelé', 'poulet entier congele surgele'),
('ALIM-VIANDE-002', 'Cuisses de poulet 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 2200, ARRAY['Import', 'Local'], 'Cuisses de poulet congelées', 'cuisse poulet kg congele'),
('ALIM-VIANDE-003', 'Ailes de poulet 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 1800, ARRAY['Import', 'Local'], 'Ailes de poulet congelées', 'aile poulet kg congele'),
('ALIM-VIANDE-004', 'Bœuf viande rouge 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 3500, ARRAY['Production locale'], 'Viande de bœuf fraîche', 'boeuf viande rouge kg'),
('ALIM-VIANDE-005', 'Mouton viande 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 4000, ARRAY['Production locale'], 'Viande de mouton fraîche', 'mouton viande kg'),
('ALIM-VIANDE-006', 'Saucisses de Francfort 500g', 'Livraison', 'Alimentations', 'Viandes et poissons', 'paquet', 1500, ARRAY['Aoste', 'Herta'], 'Saucisses sous vide', 'saucisse francfort paquet'),
('ALIM-VIANDE-007', 'Corned beef 340g', 'Livraison', 'Alimentations', 'Viandes et poissons', 'boite', 1800, ARRAY['Pigeon', 'Fray Bentos'], 'Bœuf en conserve', 'corned beef boeuf conserve boite'),
('ALIM-POISS-001', 'Sardines à l''huile 125g', 'Livraison', 'Alimentations', 'Viandes et poissons', 'boite', 600, ARRAY['Marque locale', 'Chancerelle'], 'Sardines en conserve', 'sardine huile conserve boite'),
('ALIM-POISS-002', 'Thon à l''huile 160g', 'Livraison', 'Alimentations', 'Viandes et poissons', 'boite', 1200, ARRAY['Petit Navire', 'Saupiquet'], 'Thon en conserve', 'thon huile conserve boite'),
('ALIM-POISS-003', 'Maquereau sauce tomate 425g', 'Livraison', 'Alimentations', 'Viandes et poissons', 'boite', 1500, ARRAY['Marque locale'], 'Maquereau en sauce', 'maquereau tomate conserve boite'),
('ALIM-POISS-004', 'Poisson fumé local 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 2500, ARRAY['Production locale'], 'Poisson séché fumé traditionnel', 'poisson fume seche local'),
('ALIM-POISS-005', 'Capitaine congelé 1kg', 'Livraison', 'Alimentations', 'Viandes et poissons', 'kg', 3000, ARRAY['Import', 'Local'], 'Filets de capitaine', 'capitaine poisson congele kg');

-- Subcategory: Conserves et épicerie
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-CONS-001', 'Haricots rouges 400g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'boite', 500, ARRAY['Marque locale', 'Bonduelle'], 'Haricots rouges en conserve', 'haricot rouge conserve boite'),
('ALIM-CONS-002', 'Petits pois 400g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'boite', 600, ARRAY['Bonduelle', 'Cassegrain'], 'Petits pois extra fins', 'petit pois conserve boite'),
('ALIM-CONS-003', 'Maïs doux 340g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'boite', 700, ARRAY['Bonduelle', 'Géant Vert'], 'Maïs doux en grains', 'mais doux conserve boite'),
('ALIM-CONS-004', 'Purée de tomate 140g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'tube', 400, ARRAY['Pomo', 'Gino'], 'Purée concentrée de tomate', 'puree tomate concentre tube'),
('ALIM-EPIC-001', 'Farine de blé 1kg', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'kg', 600, ARRAY['Francine', 'Marque locale'], 'Farine tout usage', 'farine ble kg'),
('ALIM-EPIC-002', 'Sucre en poudre 1kg', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'kg', 700, ARRAY['Daddy', 'Marque locale'], 'Sucre blanc cristallisé', 'sucre poudre kg'),
('ALIM-EPIC-003', 'Sucre en morceaux 1kg', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'kg', 750, ARRAY['Daddy', 'Marque locale'], 'Sucre en morceaux', 'sucre morceau kg'),
('ALIM-EPIC-004', 'Café moulu 250g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'paquet', 1500, ARRAY['Nescafé', 'Jacques Vabre'], 'Café moulu torréfié', 'cafe moulu paquet'),
('ALIM-EPIC-005', 'Café soluble 100g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'pot', 2500, ARRAY['Nescafé'], 'Café instantané', 'cafe soluble instantane pot'),
('ALIM-EPIC-006', 'Thé Lipton 25 sachets', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'boite', 800, ARRAY['Lipton', 'Elephant'], 'Sachets de thé noir', 'the lipton sachet boite'),
('ALIM-EPIC-007', 'Cacao en poudre 250g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'boite', 1200, ARRAY['Nesquik', 'Banania'], 'Chocolat en poudre', 'cacao chocolat poudre boite'),
('ALIM-EPIC-008', 'Lait concentré en tube 170g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'tube', 600, ARRAY['Nestlé'], 'Lait concentré sucré en tube', 'lait concentre tube'),
('ALIM-EPIC-009', 'Confiture fraise 370g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'pot', 1500, ARRAY['Bonne Maman', 'St Dalfour'], 'Confiture de fraise', 'confiture fraise pot'),
('ALIM-EPIC-010', 'Miel naturel 500g', 'Livraison', 'Alimentations', 'Conserves et épicerie', 'pot', 2500, ARRAY['Production locale'], 'Miel naturel du Burkina', 'miel naturel pot');

-- Subcategory: Boissons
INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
('ALIM-BOIS-001', 'Eau minérale 1.5L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 400, ARRAY['Lafi', 'Evian', 'Cristalline'], 'Eau minérale plate', 'eau minerale plate bouteille'),
('ALIM-BOIS-002', 'Eau gazeuse 1.5L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 600, ARRAY['Perrier', 'Badoit'], 'Eau pétillante', 'eau gazeuse petillante bouteille'),
('ALIM-BOIS-003', 'Coca-Cola 1.5L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 800, ARRAY['Coca-Cola'], 'Soda au cola', 'coca cola soda bouteille'),
('ALIM-BOIS-004', 'Fanta Orange 1.5L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 750, ARRAY['Fanta'], 'Soda à l''orange', 'fanta orange soda bouteille'),
('ALIM-BOIS-005', 'Sprite 1.5L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 750, ARRAY['Sprite'], 'Soda citron-lime', 'sprite soda bouteille'),
('ALIM-BOIS-006', 'Jus d''orange 1L', 'Livraison', 'Alimentations', 'Boissons', 'brique', 1200, ARRAY['Tropicana', 'Marque locale'], 'Jus d''orange 100%', 'jus orange brique'),
('ALIM-BOIS-007', 'Jus de bissap 1L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 800, ARRAY['Production locale'], 'Boisson locale à l''hibiscus', 'jus bissap hibiscus bouteille'),
('ALIM-BOIS-008', 'Jus de gingembre 1L', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 900, ARRAY['Production locale'], 'Boisson locale au gingembre', 'jus gingembre bouteille'),
('ALIM-BOIS-009', 'Lait fermenté dègue 50cl', 'Livraison', 'Alimentations', 'Boissons', 'sachet', 300, ARRAY['Production locale'], 'Lait fermenté traditionnel', 'lait fermente degue sachet'),
('ALIM-BOIS-010', 'Bière locale Flag 65cl', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 600, ARRAY['Brakina'], 'Bière blonde locale', 'biere flag locale bouteille'),
('ALIM-BOIS-011', 'Castel Beer 65cl', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 650, ARRAY['Castel'], 'Bière blonde', 'biere castel bouteille'),
('ALIM-BOIS-012', 'Vin rouge 75cl', 'Livraison', 'Alimentations', 'Boissons', 'bouteille', 3500, ARRAY['Différentes marques'], 'Vin de table', 'vin rouge bouteille');

-- ============================================================================
-- CATEGORY: Livraison > Pharmacie
-- ============================================================================

INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
-- Médicaments courants
('PHAR-MED-001', 'Paracétamol 500mg', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 500, ARRAY['Doliprane', 'Dafalgan'], 'Antalgique antipyrétique - 16 comprimés', 'paracetamol doliprane fievre douleur'),
('PHAR-MED-002', 'Ibuprofène 400mg', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 800, ARRAY['Advil', 'Nurofen'], 'Anti-inflammatoire - 12 comprimés', 'ibuprofene advil anti inflammatoire'),
('PHAR-MED-003', 'Aspirine 500mg', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 600, ARRAY['Aspégic', 'Aspirine UPSA'], 'Antalgique antipyrétique - 20 comprimés', 'aspirine antalgique fievre'),
('PHAR-MED-004', 'Antipaludéen ACT', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 1500, ARRAY['Coartem', 'Arinate'], 'Traitement du paludisme simple', 'antipaludeen paludisme malaria act'),
('PHAR-MED-005', 'Amoxicilline 500mg', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 2000, ARRAY['Clamoxyl'], 'Antibiotique - 12 gélules', 'amoxicilline antibiotique infection'),
('PHAR-MED-006', 'Vitamine C 500mg', 'Livraison', 'Pharmacie', 'Médicaments courants', 'boite', 1200, ARRAY['Laroscorbine'], 'Complément vitaminique - 30 comprimés', 'vitamine c complement'),
('PHAR-MED-007', 'Sirop pour la toux 125ml', 'Livraison', 'Pharmacie', 'Médicaments courants', 'flacon', 1500, ARRAY['Toplexil', 'Drill'], 'Sirop antitussif', 'sirop toux antitussif'),
('PHAR-MED-008', 'Collyre pour les yeux', 'Livraison', 'Pharmacie', 'Médicaments courants', 'flacon', 1200, ARRAY['Dacryoserum'], 'Solution oculaire stérile', 'collyre yeux oculaire'),
('PHAR-MED-009', 'Pommade cicatrisante', 'Livraison', 'Pharmacie', 'Médicaments courants', 'tube', 1800, ARRAY['Cicaderma', 'Bepanthen'], 'Crème réparatrice', 'pommade cicatrisante creme reparatrice'),
('PHAR-MED-010', 'Désinfectant Bétadine 125ml', 'Livraison', 'Pharmacie', 'Médicaments courants', 'flacon', 2500, ARRAY['Bétadine'], 'Antiseptique dermique', 'betadine desinfectant antiseptique'),

-- Hygiène personnelle
('PHAR-HYG-001', 'Savon antibactérien', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'piece', 600, ARRAY['Septivon', 'Dettol'], 'Savon désinfectant', 'savon antibacterien desinfectant'),
('PHAR-HYG-002', 'Dentifrice 75ml', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'tube', 800, ARRAY['Colgate', 'Signal'], 'Protection complète', 'dentifrice dent tube'),
('PHAR-HYG-003', 'Brosse à dents', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'piece', 400, ARRAY['Oral-B', 'Colgate'], 'Brosse à dents souple', 'brosse dent'),
('PHAR-HYG-004', 'Shampooing 400ml', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'flacon', 1500, ARRAY['Dove', 'Head & Shoulders'], 'Shampooing soin cheveux', 'shampooing cheveux'),
('PHAR-HYG-005', 'Gel douche 500ml', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'flacon', 1800, ARRAY['Dove', 'Palmolive'], 'Gel douche hydratant', 'gel douche hygiene'),
('PHAR-HYG-006', 'Déodorant spray 150ml', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'flacon', 1500, ARRAY['Rexona', 'Nivea'], 'Déodorant longue durée', 'deodorant spray'),
('PHAR-HYG-007', 'Serviettes hygiéniques', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'paquet', 1200, ARRAY['Always', 'Tampax'], 'Protection féminine - 10 pièces', 'serviette hygienique protection feminine'),
('PHAR-HYG-008', 'Couches bébé taille 3', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'paquet', 3500, ARRAY['Pampers', 'Huggies'], 'Couches 4-9kg - 36 pièces', 'couche bebe pampers'),
('PHAR-HYG-009', 'Lingettes bébé', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'paquet', 1500, ARRAY['Pampers', 'Mixa'], 'Lingettes douces - 72 pièces', 'lingette bebe'),
('PHAR-HYG-010', 'Crème solaire SPF50', 'Livraison', 'Pharmacie', 'Hygiène personnelle', 'tube', 4500, ARRAY['Nivea', 'Garnier'], 'Protection solaire haute', 'creme solaire protection'),

-- Premiers soins
('PHAR-SOIN-001', 'Pansements adhésifs', 'Livraison', 'Pharmacie', 'Premiers soins', 'boite', 800, ARRAY['Hansaplast', 'Urgo'], 'Assortiment de pansements', 'pansement adhesif'),
('PHAR-SOIN-002', 'Compresses stériles', 'Livraison', 'Pharmacie', 'Premiers soins', 'boite', 600, ARRAY['Marque locale'], 'Boîte de 10 compresses', 'compresse sterile'),
('PHAR-SOIN-003', 'Bande de gaze 5m', 'Livraison', 'Pharmacie', 'Premiers soins', 'rouleau', 500, ARRAY['Marque locale'], 'Bande pour pansement', 'bande gaze pansement'),
('PHAR-SOIN-004', 'Thermomètre digital', 'Livraison', 'Pharmacie', 'Premiers soins', 'piece', 2500, ARRAY['Omron', 'Beurer'], 'Thermomètre électronique', 'thermometre digital fievre'),
('PHAR-SOIN-005', 'Alcool 70° 250ml', 'Livraison', 'Pharmacie', 'Premiers soins', 'flacon', 1000, ARRAY['Marque locale'], 'Alcool à désinfecter', 'alcool desinfectant'),
('PHAR-SOIN-006', 'Eau oxygénée 250ml', 'Livraison', 'Pharmacie', 'Premiers soins', 'flacon', 800, ARRAY['Marque locale'], 'Solution désinfectante', 'eau oxygenee desinfectant'),
('PHAR-SOIN-007', 'Masques chirurgicaux', 'Livraison', 'Pharmacie', 'Premiers soins', 'boite', 1500, ARRAY['Marque locale'], 'Boîte de 50 masques', 'masque chirurgical protection'),
('PHAR-SOIN-008', 'Gel hydroalcoolique 100ml', 'Livraison', 'Pharmacie', 'Premiers soins', 'flacon', 1200, ARRAY['Sanytol', 'Marque locale'], 'Désinfectant mains', 'gel hydroalcoolique desinfectant main'),
('PHAR-SOIN-009', 'Gants latex boîte 100', 'Livraison', 'Pharmacie', 'Premiers soins', 'boite', 3000, ARRAY['Marque locale'], 'Gants à usage unique', 'gant latex'),
('PHAR-SOIN-010', 'Spray antimoustiques', 'Livraison', 'Pharmacie', 'Premiers soins', 'flacon', 2500, ARRAY['Insect Ecran', 'Cinq sur Cinq'], 'Répulsif anti-moustiques', 'spray antimoustique repulsif');

-- ============================================================================
-- CATEGORY: Livraison > Restaurants
-- ============================================================================

INSERT INTO merchant_product_catalog (code, name, category_type, category, subcategory, unit, default_price, typical_brands, description, search_terms) VALUES
-- Plats préparés
('REST-PLAT-001', 'Riz sauce arachide', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1500, ARRAY['Maison'], 'Plat complet avec viande', 'riz sauce arachide plat'),
('REST-PLAT-002', 'Riz gras', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1500, ARRAY['Maison'], 'Riz cuisiné avec légumes et viande', 'riz gras plat'),
('REST-PLAT-003', 'Tô sauce gombo', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1200, ARRAY['Maison'], 'Plat traditionnel', 'to sauce gombo plat traditionnel'),
('REST-PLAT-004', 'Poulet braisé + attiéké', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2500, ARRAY['Maison'], 'Poulet grillé avec attiéké', 'poulet braise attieke plat'),
('REST-PLAT-005', 'Poulet DG', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 3000, ARRAY['Maison'], 'Poulet Directeur Général avec légumes', 'poulet dg plat'),
('REST-PLAT-006', 'Brochettes bœuf (5)', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1500, ARRAY['Maison'], '5 brochettes de bœuf grillé', 'brochette boeuf grille'),
('REST-PLAT-007', 'Brochettes mouton (5)', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2000, ARRAY['Maison'], '5 brochettes de mouton grillé', 'brochette mouton grille'),
('REST-PLAT-008', 'Tiep bou dien', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2000, ARRAY['Maison'], 'Riz au poisson sénégalais', 'tiep bou dien riz poisson'),
('REST-PLAT-009', 'Alloco + poisson frit', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1800, ARRAY['Maison'], 'Bananes plantain frites avec poisson', 'alloco poisson frit banane plantain'),
('REST-PLAT-010', 'Couscous viande', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2500, ARRAY['Maison'], 'Couscous avec viande et légumes', 'couscous viande legume'),
('REST-PLAT-011', 'Yassa poulet', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2000, ARRAY['Maison'], 'Poulet mariné sauce oignon', 'yassa poulet oignon'),
('REST-PLAT-012', 'Ragoût bœuf + riz', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 2200, ARRAY['Maison'], 'Ragoût de bœuf avec riz blanc', 'ragout boeuf riz'),
('REST-PLAT-013', 'Omelette complète', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 800, ARRAY['Maison'], 'Omelette garnie + pain', 'omelette complete pain'),
('REST-PLAT-014', 'Sandwich jambon fromage', 'Livraison', 'Restaurants', 'Plats préparés', 'piece', 1000, ARRAY['Maison'], 'Sandwich baguette garni', 'sandwich jambon fromage baguette'),
('REST-PLAT-015', 'Hamburger complet', 'Livraison', 'Restaurants', 'Plats préparés', 'piece', 1500, ARRAY['Maison'], 'Burger avec steak, salade, tomate', 'hamburger burger'),
('REST-PLAT-016', 'Pizza margherita', 'Livraison', 'Restaurants', 'Plats préparés', 'piece', 3500, ARRAY['Maison'], 'Pizza tomate mozzarella', 'pizza margherita'),
('REST-PLAT-017', 'Pizza 4 fromages', 'Livraison', 'Restaurants', 'Plats préparés', 'piece', 4500, ARRAY['Maison'], 'Pizza aux 4 fromages', 'pizza fromage'),
('REST-PLAT-018', 'Salade composée', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1500, ARRAY['Maison'], 'Salade fraîche variée', 'salade composee fraiche'),
('REST-PLAT-019', 'Sauce feuilles + pâte', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 1200, ARRAY['Maison'], 'Sauce aux feuilles avec pâte', 'sauce feuille pate'),
('REST-PLAT-020', 'Haricot + gari', 'Livraison', 'Restaurants', 'Plats préparés', 'portion', 800, ARRAY['Maison'], 'Haricots rouges avec gari', 'haricot gari'),

-- Boissons chaudes
('REST-BOIS-001', 'Café noir', 'Livraison', 'Restaurants', 'Boissons chaudes', 'tasse', 300, ARRAY['Maison'], 'Café expresso', 'cafe noir expresso'),
('REST-BOIS-002', 'Café au lait', 'Livraison', 'Restaurants', 'Boissons chaudes', 'tasse', 500, ARRAY['Maison'], 'Café avec lait', 'cafe lait'),
('REST-BOIS-003', 'Thé Lipton', 'Livraison', 'Restaurants', 'Boissons chaudes', 'tasse', 300, ARRAY['Lipton'], 'Thé nature', 'the lipton'),
('REST-BOIS-004', 'Thé au lait', 'Livraison', 'Restaurants', 'Boissons chaudes', 'tasse', 500, ARRAY['Maison'], 'Thé avec lait', 'the lait'),
('REST-BOIS-005', 'Chocolat chaud', 'Livraison', 'Restaurants', 'Boissons chaudes', 'tasse', 600, ARRAY['Maison'], 'Boisson chocolatée chaude', 'chocolat chaud');
