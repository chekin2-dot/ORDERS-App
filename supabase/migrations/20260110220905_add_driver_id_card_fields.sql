/*
  # Add ID Card Fields for Drivers

  1. Changes
    - Add `id_card_front_url` column to `drivers` table for storing front ID card photo URL
    - Add `id_card_back_url` column to `drivers` table for storing back ID card photo URL
    - Both fields are optional text fields to store image URLs

  2. Security
    - No RLS changes needed as this extends existing table with same access patterns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'id_card_front_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN id_card_front_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'id_card_back_url'
  ) THEN
    ALTER TABLE drivers ADD COLUMN id_card_back_url text;
  END IF;
END $$;