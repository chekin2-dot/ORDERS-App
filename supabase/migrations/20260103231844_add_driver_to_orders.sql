/*
  # Add Driver Assignment to Orders

  ## Changes
  - Add `driver_id` column to orders table
  - This allows tracking which driver is assigned to each order
  - Required for driver-client messaging system
*/

-- Add driver_id column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
  END IF;
END $$;
