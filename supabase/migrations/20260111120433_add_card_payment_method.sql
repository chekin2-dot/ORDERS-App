/*
  # Add Card Payment Method

  ## Summary
  This migration adds 'card' as a payment method option to support Visa card payments
  alongside existing cash and mobile money (Orange Money) options.

  ## Changes Made
  - Add 'card' value to payment_method enum type
  
  ## Security
  - No RLS changes needed as this only extends an existing enum
*/

-- Add 'card' to the payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
