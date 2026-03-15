/*
  # Create Merchant Daily Payouts Table

  1. New Tables
    - `merchant_daily_payouts` - Tracks daily payments to merchants
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, foreign key to merchants)
      - `payment_date` (date) - The date this payment is for
      - `total_sales` (numeric) - Total sales for the day
      - `merchant_amount` (numeric) - 90% for merchant
      - `platform_commission` (numeric) - 10% for ORDERS App
      - `payment_status` (text) - 'pending' or 'paid'
      - `paid_at` (timestamptz) - When payment was made
      - `orange_money_number` (text) - Merchant's Orange Money number
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `merchant_daily_payouts` table
    - Merchants can view their own payout records

  3. Notes
    - Payment is made daily for day-1 turnover
    - 90% goes to merchant, 10% to platform
    - Unique constraint on merchant_id + payment_date to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS merchant_daily_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  total_sales numeric NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  merchant_amount numeric NOT NULL DEFAULT 0 CHECK (merchant_amount >= 0),
  platform_commission numeric NOT NULL DEFAULT 0 CHECK (platform_commission >= 0),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  paid_at timestamptz,
  orange_money_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, payment_date)
);

-- Enable RLS
ALTER TABLE merchant_daily_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_daily_payouts
CREATE POLICY "Merchants can view own payouts"
  ON merchant_daily_payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_daily_payouts.merchant_id
      AND merchants.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_merchant_daily_payouts_merchant_date 
  ON merchant_daily_payouts(merchant_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_daily_payouts_status 
  ON merchant_daily_payouts(payment_status, payment_date DESC);