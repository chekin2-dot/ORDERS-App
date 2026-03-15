/*
  # Add quantity field and auto-update trigger to products table

  1. Changes
    - Add `quantity` column to products table (nullable integer, defaults to null to indicate "not tracked")
    - Create trigger to automatically update `updated_at` timestamp when product is modified
  
  2. Details
    - quantity: Stores available product quantity (null means quantity not tracked)
    - updated_at trigger: Automatically sets updated_at to current timestamp on any UPDATE
  
  3. Security
    - No RLS changes needed (existing policies still apply)
*/

-- Add quantity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN quantity INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();