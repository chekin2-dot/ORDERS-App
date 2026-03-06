/*
  # Add Payment Status and Transaction Tracking

  1. Changes
    - Add `payment_status` field to track payment state (pending, processing, completed, failed)
    - Add `payment_transaction_id` to store payment gateway transaction ID
    - Add `payment_processed_at` timestamp for when payment was completed
    - Add `payment_error_message` for failed payment details
    
  2. Security
    - No RLS changes needed, inherits existing order policies
*/

DO $$
BEGIN
  -- Add payment_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  -- Add payment_transaction_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_transaction_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_transaction_id text;
  END IF;

  -- Add payment_processed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_processed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_processed_at timestamptz;
  END IF;

  -- Add payment_error_message if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_error_message'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_error_message text;
  END IF;
END $$;