/*
  # Create Merchant Daily Sales Function

  1. New RPC Functions
    - `get_merchant_daily_sales` - Calculates daily sales for a merchant
      - Parameters:
        - merchant_uuid (uuid) - The merchant's ID
        - target_date (date) - The date to calculate sales for
      - Returns: Object with sales breakdown
  
  2. Returns
    - date: The target date
    - total_sales: Total revenue from delivered orders
    - merchant_amount: 90% for the merchant
    - platform_commission: 10% for ORDERS App
    - order_count: Number of delivered orders
    - payment_status: 'pending' or 'paid'
    - paid_at: When payment was made (if paid)
  
  3. Features
    - Only counts delivered orders
    - Calculates 90/10 split
    - Checks payout table for payment status
*/

CREATE OR REPLACE FUNCTION get_merchant_daily_sales(
  merchant_uuid uuid,
  target_date date
)
RETURNS TABLE (
  date date,
  total_sales numeric,
  merchant_amount numeric,
  platform_commission numeric,
  order_count bigint,
  payment_status text,
  paid_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_sales AS (
    SELECT 
      target_date as sale_date,
      COALESCE(SUM(o.total), 0) as total,
      COUNT(o.id) as count
    FROM orders o
    WHERE 
      o.merchant_id = merchant_uuid
      AND o.status = 'delivered'
      AND DATE(o.updated_at) = target_date
  )
  SELECT 
    ds.sale_date,
    ds.total,
    ROUND(ds.total * 0.90, 0) as merchant_amt,
    ROUND(ds.total * 0.10, 0) as platform_comm,
    ds.count,
    COALESCE(p.payment_status, 'pending') as status,
    p.paid_at
  FROM daily_sales ds
  LEFT JOIN merchant_daily_payouts p 
    ON p.merchant_id = merchant_uuid 
    AND p.payment_date = target_date;
END;
$$ LANGUAGE plpgsql STABLE;