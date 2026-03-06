/*
  # Initial Schema for ORDERSApp (BOLT AI)
  
  ## Overview
  Multi-sided marketplace connecting clients, merchants, and delivery drivers.
  
  ## New Tables
  
  ### 1. user_profiles
  - `id` (uuid, references auth.users)
  - `user_type` (enum: client, merchant, driver)
  - `phone` (text, unique)
  - `first_name` (text)
  - `last_name` (text)
  - `whatsapp_number` (text)
  - `neighborhood` (text)
  - `full_address` (text)
  - `profile_photo_url` (text)
  - `status` (enum: pending, active, suspended, banned)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. merchants
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `shop_name` (text)
  - `category_id` (uuid, references categories)
  - `description` (text)
  - `logo_url` (text)
  - `shop_photo_url` (text)
  - `address` (text)
  - `neighborhood` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `opening_hours` (jsonb)
  - `is_open` (boolean)
  - `verification_status` (enum: pending, verified, rejected)
  - `identity_photo_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. drivers
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `vehicle_type` (text)
  - `vehicle_photo_url` (text)
  - `delivery_zones` (text[])
  - `is_available` (boolean)
  - `verification_status` (enum: pending, verified, rejected)
  - `identity_photo_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. categories
  - `id` (uuid, primary key)
  - `name` (text)
  - `name_fr` (text)
  - `icon` (text)
  - `created_at` (timestamptz)
  
  ### 5. products
  - `id` (uuid, primary key)
  - `merchant_id` (uuid, references merchants)
  - `name` (text)
  - `description` (text)
  - `price` (numeric)
  - `image_url` (text)
  - `is_available` (boolean)
  - `category` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 6. addresses
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `label` (text)
  - `full_address` (text)
  - `neighborhood` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `is_default` (boolean)
  - `created_at` (timestamptz)
  
  ### 7. orders
  - `id` (uuid, primary key)
  - `order_number` (text, unique)
  - `client_id` (uuid, references user_profiles)
  - `merchant_id` (uuid, references merchants)
  - `delivery_address_id` (uuid, references addresses)
  - `delivery_mode` (enum: delivery, pickup)
  - `payment_method` (enum: cash, mobile_money)
  - `subtotal` (numeric)
  - `delivery_fee` (numeric)
  - `total` (numeric)
  - `status` (enum: pending, accepted, preparing, ready, in_delivery, delivered, cancelled, rejected)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 8. order_items
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `product_id` (uuid, references products)
  - `product_name` (text)
  - `quantity` (integer)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `created_at` (timestamptz)
  
  ### 9. deliveries
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `driver_id` (uuid, references drivers)
  - `status` (enum: assigned, en_route_to_merchant, picked_up, en_route_to_client, delivered)
  - `assigned_at` (timestamptz)
  - `picked_up_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 10. reports
  - `id` (uuid, primary key)
  - `reporter_id` (uuid, references user_profiles)
  - `reported_user_id` (uuid, references user_profiles)
  - `order_id` (uuid, references orders)
  - `report_type` (enum: inappropriate_behavior, suspected_fraud, theft_assault, non_compliant_delivery, other)
  - `description` (text)
  - `status` (enum: pending, investigating, resolved, dismissed)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users based on user type
  - Restrict access to identity photos to admins only
*/

-- Create enums
CREATE TYPE user_type AS ENUM ('client', 'merchant', 'driver');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'banned');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE delivery_mode AS ENUM ('delivery', 'pickup');
CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'rejected');
CREATE TYPE delivery_status AS ENUM ('assigned', 'en_route_to_merchant', 'picked_up', 'en_route_to_client', 'delivered');
CREATE TYPE report_type AS ENUM ('inappropriate_behavior', 'suspected_fraud', 'theft_assault', 'non_compliant_delivery', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');

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
  profile_photo_url text,
  status user_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
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
CREATE TABLE IF NOT EXISTS reports (
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
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for categories (public read)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for merchants
CREATE POLICY "Anyone can view verified merchants"
  ON merchants FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

CREATE POLICY "Merchants can view own shop"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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
CREATE POLICY "Drivers can view own profile"
  ON drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own profile"
  ON drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can insert own profile"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Merchants can view drivers for delivery"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    verification_status = 'verified' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'merchant'
    )
  );

-- RLS Policies for products
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = products.merchant_id
      AND merchants.verification_status = 'verified'
    )
  );

CREATE POLICY "Merchants can manage own products"
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
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Clients can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Merchants can view orders for their shop"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = orders.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      JOIN drivers ON drivers.id = deliveries.driver_id
      WHERE deliveries.order_id = orders.id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Merchants can update orders for their shop"
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

-- RLS Policies for order_items
CREATE POLICY "Users can view order items for accessible orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM merchants
          WHERE merchants.id = orders.merchant_id
          AND merchants.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM deliveries
          JOIN drivers ON drivers.id = deliveries.driver_id
          WHERE deliveries.order_id = orders.id
          AND drivers.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Clients can insert order items for own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- RLS Policies for deliveries
CREATE POLICY "Users can view deliveries for accessible orders"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliveries.order_id
      AND (
        orders.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM merchants
          WHERE merchants.id = orders.merchant_id
          AND merchants.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = deliveries.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN merchants ON merchants.id = orders.merchant_id
      WHERE orders.id = deliveries.order_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update own deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = deliveries.driver_id
      AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = deliveries.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- RLS Policies for reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_merchants_category ON merchants(category_id);
CREATE INDEX idx_merchants_verification ON merchants(verification_status);
CREATE INDEX idx_merchants_neighborhood ON merchants(neighborhood);
CREATE INDEX idx_drivers_verification ON drivers(verification_status);
CREATE INDEX idx_drivers_available ON drivers(is_available);
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- Insert default categories
INSERT INTO categories (name, name_fr, icon) VALUES
  ('Pharmacy', 'Pharmacie', 'pill'),
  ('Bakery', 'Boulangerie', 'croissant'),
  ('Convenience Store', 'Dépanneur', 'store'),
  ('Taxi', 'Taxi', 'car'),
  ('Plumber', 'Plombier', 'wrench'),
  ('Electrician', 'Électricien', 'zap')
ON CONFLICT DO NOTHING;