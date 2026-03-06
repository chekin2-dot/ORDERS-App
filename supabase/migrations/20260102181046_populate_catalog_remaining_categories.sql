/*
  # Populate Product Catalog - Remaining Categories

  Adds categories 7-16 including surgelés, boissons, hygiene, entretien, and night products
*/

-- Category 7: Surgelés
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Mélange de légumes surgelés', 'Surgelés', 'Légumes surgelés', 'melange legumes surgeles'),
('Épinards hachés surgelés', 'Surgelés', 'Légumes surgelés', 'epinards haches surgeles'),
('Haricots verts surgelés', 'Surgelés', 'Légumes surgelés', 'haricots verts surgeles'),
('Petits pois surgelés', 'Surgelés', 'Légumes surgelés', 'petits pois surgeles'),
('Frites surgelées', 'Surgelés', 'Légumes surgelés', 'frites surgelees'),
('Pizza surgelée', 'Surgelés', 'Plats préparés', 'pizza surgelee'),
('Lasagnes surgelées', 'Surgelés', 'Plats préparés', 'lasagnes surgelees'),
('Glace vanille', 'Surgelés', 'Glaces & desserts glacés', 'glace vanille'),
('Glace chocolat', 'Surgelés', 'Glaces & desserts glacés', 'glace chocolat'),
('Glace fraise', 'Surgelés', 'Glaces & desserts glacés', 'glace fraise'),
('Cônes glacés', 'Surgelés', 'Glaces & desserts glacés', 'cones glaces'),
('Sorbets', 'Surgelés', 'Glaces & desserts glacés', 'sorbets glaces');

-- Category 8: Boissons
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Eau minérale plate 0,5L', 'Boissons', 'Boissons non alcoolisées', 'eau minerale plate 0.5L'),
('Eau minérale plate 1,5L', 'Boissons', 'Boissons non alcoolisées', 'eau minerale plate 1.5L'),
('Eau minérale plate 5L', 'Boissons', 'Boissons non alcoolisées', 'eau minerale plate 5L'),
('Eau gazeuse', 'Boissons', 'Boissons non alcoolisées', 'eau gazeuse'),
('Cola', 'Boissons', 'Boissons non alcoolisées', 'cola soda'),
('Soda orange', 'Boissons', 'Boissons non alcoolisées', 'soda orange'),
('Soda citron', 'Boissons', 'Boissons non alcoolisées', 'soda citron'),
('Boisson énergisante', 'Boissons', 'Boissons non alcoolisées', 'boisson energisante energy'),
('Jus d''orange', 'Boissons', 'Boissons non alcoolisées', 'jus orange 100'),
('Jus de pomme', 'Boissons', 'Boissons non alcoolisées', 'jus pomme 100'),
('Jus multifruits', 'Boissons', 'Boissons non alcoolisées', 'jus multifruits'),
('Nectar de mangue', 'Boissons', 'Boissons non alcoolisées', 'nectar mangue jus'),
('Thé glacé', 'Boissons', 'Boissons non alcoolisées', 'the glace'),
('Limonade', 'Boissons', 'Boissons non alcoolisées', 'limonade'),
('Café moulu', 'Boissons', 'Chaud', 'cafe moulu'),
('Café soluble', 'Boissons', 'Chaud', 'cafe soluble instantane'),
('Thé noir', 'Boissons', 'Chaud', 'the noir'),
('Thé vert', 'Boissons', 'Chaud', 'the vert'),
('Infusion verveine', 'Boissons', 'Chaud', 'infusion verveine'),
('Infusion camomille', 'Boissons', 'Chaud', 'infusion camomille'),
('Cacao en poudre', 'Boissons', 'Chaud', 'cacao poudre chocolat'),
('Bière blonde', 'Boissons', 'Boissons alcoolisées', 'biere blonde alcool'),
('Vin rouge', 'Boissons', 'Boissons alcoolisées', 'vin rouge alcool'),
('Vin blanc', 'Boissons', 'Boissons alcoolisées', 'vin blanc alcool');

-- Category 9: Huiles, vinaigres, sauces & condiments
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Huile de tournesol', 'Huiles, vinaigres, sauces & condiments', 'Huiles', 'huile tournesol'),
('Huile d''olive', 'Huiles, vinaigres, sauces & condiments', 'Huiles', 'huile olive'),
('Huile d''arachide', 'Huiles, vinaigres, sauces & condiments', 'Huiles', 'huile arachide'),
('Vinaigre blanc', 'Huiles, vinaigres, sauces & condiments', 'Vinaigres', 'vinaigre blanc'),
('Vinaigre balsamique', 'Huiles, vinaigres, sauces & condiments', 'Vinaigres', 'vinaigre balsamique'),
('Ketchup', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'ketchup sauce'),
('Mayonnaise', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'mayonnaise sauce'),
('Moutarde', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'moutarde sauce'),
('Sauce barbecue', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'sauce barbecue'),
('Sauce soja', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'sauce soja'),
('Sauce pimentée', 'Huiles, vinaigres, sauces & condiments', 'Sauces', 'sauce pimentee chili'),
('Cornichons', 'Huiles, vinaigres, sauces & condiments', 'Condiments', 'cornichons'),
('Olives vertes', 'Huiles, vinaigres, sauces & condiments', 'Condiments', 'olives vertes'),
('Olives noires', 'Huiles, vinaigres, sauces & condiments', 'Condiments', 'olives noires');

-- Category 10: Épices & aides culinaires
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Sel fin', 'Épices & aides culinaires', 'Sel & poivre', 'sel fin'),
('Gros sel', 'Épices & aides culinaires', 'Sel & poivre', 'gros sel'),
('Poivre noir', 'Épices & aides culinaires', 'Sel & poivre', 'poivre noir moulu'),
('Paprika', 'Épices & aides culinaires', 'Épices', 'paprika epice'),
('Curry', 'Épices & aides culinaires', 'Épices', 'curry epice'),
('Cumin', 'Épices & aides culinaires', 'Épices', 'cumin epice'),
('Curcuma', 'Épices & aides culinaires', 'Épices', 'curcuma epice'),
('Gingembre en poudre', 'Épices & aides culinaires', 'Épices', 'gingembre poudre epice'),
('Cannelle', 'Épices & aides culinaires', 'Épices', 'cannelle epice'),
('Piment', 'Épices & aides culinaires', 'Épices', 'piment epice'),
('Bouillon cube légumes', 'Épices & aides culinaires', 'Bouillons', 'bouillon cube legumes'),
('Bouillon cube volaille', 'Épices & aides culinaires', 'Bouillons', 'bouillon cube volaille');

-- Category 11: Produits pour bébé
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Lait infantile 1er âge', 'Produits pour bébé', 'Alimentation bébé', 'lait infantile 1er age bebe'),
('Lait infantile 2e âge', 'Produits pour bébé', 'Alimentation bébé', 'lait infantile 2e age bebe'),
('Petits pots légumes', 'Produits pour bébé', 'Alimentation bébé', 'petits pots legumes bebe'),
('Petits pots fruits', 'Produits pour bébé', 'Alimentation bébé', 'petits pots fruits bebe'),
('Céréales infantiles', 'Produits pour bébé', 'Alimentation bébé', 'cereales infantiles bebe'),
('Couches', 'Produits pour bébé', 'Hygiène bébé', 'couches bebe'),
('Lingettes bébé', 'Produits pour bébé', 'Hygiène bébé', 'lingettes bebe'),
('Crème pour le change', 'Produits pour bébé', 'Hygiène bébé', 'creme change bebe');

-- Category 12: Hygiène & beauté
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Savon solide', 'Hygiène & beauté', 'Hygiène corporelle', 'savon solide'),
('Gel douche', 'Hygiène & beauté', 'Hygiène corporelle', 'gel douche'),
('Shampoing', 'Hygiène & beauté', 'Hygiène corporelle', 'shampoing'),
('Après-shampoing', 'Hygiène & beauté', 'Hygiène corporelle', 'apres shampoing'),
('Crème hydratante', 'Hygiène & beauté', 'Hygiène corporelle', 'creme hydratante corps'),
('Déodorant', 'Hygiène & beauté', 'Hygiène corporelle', 'deodorant'),
('Rasoirs jetables', 'Hygiène & beauté', 'Hygiène corporelle', 'rasoirs jetables'),
('Dentifrice', 'Hygiène & beauté', 'Hygiène bucco-dentaire', 'dentifrice'),
('Brosse à dents', 'Hygiène & beauté', 'Hygiène bucco-dentaire', 'brosse dents'),
('Bain de bouche', 'Hygiène & beauté', 'Hygiène bucco-dentaire', 'bain bouche'),
('Serviettes hygiéniques', 'Hygiène & beauté', 'Hygiène féminine', 'serviettes hygieniques'),
('Tampons', 'Hygiène & beauté', 'Hygiène féminine', 'tampons'),
('Protège-slips', 'Hygiène & beauté', 'Hygiène féminine', 'protege slips');

-- Category 13: Entretien de la maison
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Lessive liquide', 'Entretien de la maison', 'Lessive & linge', 'lessive liquide'),
('Lessive en poudre', 'Entretien de la maison', 'Lessive & linge', 'lessive poudre'),
('Assouplissant', 'Entretien de la maison', 'Lessive & linge', 'assouplissant'),
('Liquide vaisselle', 'Entretien de la maison', 'Nettoyants', 'liquide vaisselle'),
('Nettoyant multi-surfaces', 'Entretien de la maison', 'Nettoyants', 'nettoyant multi surfaces'),
('Nettoyant sol', 'Entretien de la maison', 'Nettoyants', 'nettoyant sol'),
('Javel', 'Entretien de la maison', 'Nettoyants', 'javel desinfectant'),
('Éponges', 'Entretien de la maison', 'Accessoires', 'eponges'),
('Sacs poubelle', 'Entretien de la maison', 'Accessoires', 'sacs poubelle'),
('Papier essuie-tout', 'Entretien de la maison', 'Accessoires', 'papier essuie tout'),
('Papier toilette', 'Entretien de la maison', 'Accessoires', 'papier toilette'),
('Mouchoirs en papier', 'Entretien de la maison', 'Accessoires', 'mouchoirs papier');

-- Category 14: Animaux
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Croquettes chiens', 'Animaux', 'Chiens', 'croquettes chiens'),
('Pâtée chiens', 'Animaux', 'Chiens', 'patee boites chiens'),
('Croquettes chats', 'Animaux', 'Chats', 'croquettes chats'),
('Pâtée chats', 'Animaux', 'Chats', 'patee sachets chats'),
('Litière', 'Animaux', 'Chats', 'litiere chats');

-- Category 15: Divers
INSERT INTO product_catalog (name, category, subcategory, search_terms) VALUES
('Piles AA', 'Divers / Services', 'Batteries', 'piles aa batteries'),
('Piles AAA', 'Divers / Services', 'Batteries', 'piles aaa batteries'),
('Ampoules', 'Divers / Services', 'Électricité', 'ampoules'),
('Briquets', 'Divers / Services', 'Fumeurs', 'briquets'),
('Allumettes', 'Divers / Services', 'Fumeurs', 'allumettes');

-- Category 16: Produits de nuit / urgence
INSERT INTO product_catalog (name, category, subcategory, search_terms, is_night_product) VALUES
('Préservatifs classiques (3)', 'Produits de nuit / urgence', 'Contraception', 'preservatifs classiques 3', true),
('Préservatifs extra-fins', 'Produits de nuit / urgence', 'Contraception', 'preservatifs extra fins', true),
('Préservatifs parfumés', 'Produits de nuit / urgence', 'Contraception', 'preservatifs parfumes textures', true),
('Lubrifiant intime', 'Produits de nuit / urgence', 'Contraception', 'lubrifiant intime gel', true),
('Test de grossesse', 'Produits de nuit / urgence', 'Tests', 'test grossesse', true),
('Paracétamol 500mg', 'Produits de nuit / urgence', 'Médicaments', 'paracetamol 500mg', true),
('Ibuprofène', 'Produits de nuit / urgence', 'Médicaments', 'ibuprofene', true),
('Désinfectant', 'Produits de nuit / urgence', 'Premiers soins', 'desinfectant antiseptique', true),
('Pansements', 'Produits de nuit / urgence', 'Premiers soins', 'pansements adhesifs', true),
('Boisson énergisante canette', 'Produits de nuit / urgence', 'Boissons & snacks', 'boisson energisante canette', true),
('Cola canette', 'Produits de nuit / urgence', 'Boissons & snacks', 'cola canette', true),
('Eau 0,5L', 'Produits de nuit / urgence', 'Boissons & snacks', 'eau minerale 0.5L', true),
('Biscuits sucrés', 'Produits de nuit / urgence', 'Boissons & snacks', 'biscuits sucres petits paquets', true),
('Chips', 'Produits de nuit / urgence', 'Boissons & snacks', 'chips pommes terre sachet', true),
('Arachides grillées', 'Produits de nuit / urgence', 'Boissons & snacks', 'arachides grillees sachet', true),
('Sandwich omelette', 'Produits de nuit / urgence', 'Boissons & snacks', 'sandwich pain omelette', true),
('Cigarettes paquet', 'Produits de nuit / urgence', 'Tabac', 'cigarettes paquet', true),
('Cigarettes unité', 'Produits de nuit / urgence', 'Tabac', 'cigarettes unite', true),
('Chargeur universel', 'Produits de nuit / urgence', 'Électronique', 'chargeur telephone universel', true),
('Câble USB', 'Produits de nuit / urgence', 'Électronique', 'cable charge usb micro usb-c', true),
('Gel hydroalcoolique', 'Produits de nuit / urgence', 'Hygiène', 'gel hydroalcoolique flacon', true);
