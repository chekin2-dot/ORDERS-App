/*
  # ORDERSApp Schema Setup
  
  1. Adds missing columns to categories table
  2. Creates all necessary tables for the marketplace
  3. Sets up RLS policies
  4. Populates initial data
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('client', 'merchant', 'driver');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'banned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_mode AS ENUM ('delivery', 'pickup');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('assigned', 'en_route_to_merchant', 'picked_up', 'en_route_to_client', 'delivered');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('inappropriate_behavior', 'suspected_fraud', 'theft_assault', 'non_compliant_delivery', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'name_fr'
  ) THEN
    ALTER TABLE categories ADD COLUMN name_fr text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN parent_id uuid REFERENCES categories(id);
  END IF;
END $$;

-- Clear existing categories
TRUNCATE categories CASCADE;

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

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL,
  phone text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text DEFAULT '',
  whatsapp_number text,
  neighborhood text,
  full_address text,
  latitude numeric,
  longitude numeric,
  profile_photo_url text,
  status user_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  category_id uuid REFERENCES categories(id),
  description text DEFAULT '',
  logo_url text,
  shop_photo_url text,
  address text NOT NULL,
  neighborhood text NOT NULL,
  latitude numeric,
  longitude numeric,
  opening_hours jsonb DEFAULT '{}',
  is_open boolean DEFAULT true,
  verification_status verification_status DEFAULT 'pending',
  identity_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_photo_url text,
  delivery_zones text[] DEFAULT '{}',
  is_available boolean DEFAULT false,
  verification_status verification_status DEFAULT 'pending',
  identity_photo_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  image_url text,
  is_available boolean DEFAULT true,
  category text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label text DEFAULT '',
  full_address text NOT NULL,
  neighborhood text NOT NULL,
  latitude numeric,
  longitude numeric,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES user_profiles(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  delivery_address_id uuid REFERENCES addresses(id),
  delivery_mode delivery_mode NOT NULL,
  payment_method payment_method NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric DEFAULT 0 CHECK (delivery_fee >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  status order_status DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id),
  status delivery_status DEFAULT 'assigned',
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reports Table
CREATE TABLE IF NOT EXISTS app_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES user_profiles(id),
  reported_user_id uuid NOT NULL REFERENCES user_profiles(id),
  order_id uuid REFERENCES orders(id),
  report_type report_type NOT NULL,
  description text NOT NULL,
  status report_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for merchants
CREATE POLICY "Anyone can view merchants"
  ON merchants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Merchants can update own shop"
  ON merchants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Merchants can insert own shop"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for drivers
CREATE POLICY "Drivers can view own driver profile"
  ON drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own driver profile"
  ON drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can insert own driver profile"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for products
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Merchants can manage own shop products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = products.merchant_id
      AND merchants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = products.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

-- RLS Policies for addresses
CREATE POLICY "Users can view their addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their addresses"
  ON addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Clients can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Merchants can view their shop orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = orders.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create their orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Merchants can update their shop orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = orders.merchant_id
      AND merchants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = orders.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);