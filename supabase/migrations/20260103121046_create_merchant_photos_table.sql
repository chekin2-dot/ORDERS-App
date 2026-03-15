/*
  # Create merchant photos table for multiple shop images

  1. New Tables
    - `merchant_photos`
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, foreign key to merchants)
      - `photo_url` (text, photo URL)
      - `display_order` (integer, order of display)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `merchant_photos` table
    - Add policy for merchants to manage their own photos
    - Add policy for anyone to view merchant photos

  3. Important Notes
    - Merchants can have up to 5 photos
    - Photos are ordered by display_order
*/

CREATE TABLE IF NOT EXISTS merchant_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE merchant_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view merchant photos"
  ON merchant_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Merchants can insert their photos"
  ON merchant_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_photos.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update their photos"
  ON merchant_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_photos.merchant_id
      AND merchants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_photos.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete their photos"
  ON merchant_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_photos.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_merchant_photos_merchant ON merchant_photos(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_photos_order ON merchant_photos(merchant_id, display_order);