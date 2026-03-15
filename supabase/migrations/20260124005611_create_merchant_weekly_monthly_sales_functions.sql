/*
  # Create Merchant Weekly and Monthly Sales Functions

  1. New RPC Functions
    - `get_merchant_weekly_sales` - Calculates weekly sales for a merchant
      - Parameters:
        - merchant_uuid (uuid) - The merchant's ID
      - Returns: Current week sales breakdown
    
    - `get_merchant_monthly_sales` - Calculates monthly sales for a merchant
      - Parameters:
        - merchant_uuid (uuid) - The merchant's ID
      - Returns: Current month sales breakdown
  
  2. Returns (both functions)
    - total_sales: Total revenue from delivered orders
    - merchant_amount: 90% for the merchant
    - platform_commission: 10% for ORDERS App
    - order_count: Number of delivered orders
    - start_date: Start of period
    - end_date: End of period
  
  3. Features
    - Only counts delivered orders
    - Calculates 90/10 split
    - Week starts on Monday
    - Month is current calendar month
*/

-- Weekly sales function (current week, Monday to Sunday)
CREATE OR REPLACE FUNCTION get_merchant_weekly_sales(
  merchant_uuid uuid
)
RETURNS TABLE (
  total_sales numeric,
  merchant_amount numeric,
  platform_commission numeric,
  order_count bigint,
  start_date date,
  end_date date
) AS $$
BEGIN
  RETURN QUERY
  WITH week_range AS (
    SELECT 
      DATE_TRUNC('week', CURRENT_DATE)::date as week_start,
      (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date as week_end
  ),
  weekly_sales AS (
    SELECT 
      COALESCE(SUM(o.total), 0) as total,
      COUNT(o.id) as count
    FROM orders o, week_range wr
    WHERE 
      o.merchant_id = merchant_uuid
      AND o.status = 'delivered'
      AND DATE(o.updated_at) >= wr.week_start
      AND DATE(o.updated_at) <= wr.week_end
  )
  SELECT 
    ws.total,
    ROUND(ws.total * 0.90, 0) as merchant_amt,
    ROUND(ws.total * 0.10, 0) as platform_comm,
    ws.count,
    wr.week_start,
    wr.week_end
  FROM weekly_sales ws, week_range wr;
END;
$$ LANGUAGE plpgsql STABLE;

-- Monthly sales function (current calendar month)
CREATE OR REPLACE FUNCTION get_merchant_monthly_sales(
  merchant_uuid uuid
)
RETURNS TABLE (
  total_sales numeric,
  merchant_amount numeric,
  platform_commission numeric,
  order_count bigint,
  start_date date,
  end_date date
) AS $$
BEGIN
  RETURN QUERY
  WITH month_range AS (
    SELECT 
      DATE_TRUNC('month', CURRENT_DATE)::date as month_start,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date as month_end
  ),
  monthly_sales AS (
    SELECT 
      COALESCE(SUM(o.total), 0) as total,
      COUNT(o.id) as count
    FROM orders o, month_range mr
    WHERE 
      o.merchant_id = merchant_uuid
      AND o.status = 'delivered'
      AND DATE(o.updated_at) >= mr.month_start
      AND DATE(o.updated_at) <= mr.month_end
  )
  SELECT 
    ms.total,
    ROUND(ms.total * 0.90, 0) as merchant_amt,
    ROUND(ms.total * 0.10, 0) as platform_comm,
    ms.count,
    mr.month_start,
    mr.month_end
  FROM monthly_sales ms, month_range mr;
END;
$$ LANGUAGE plpgsql STABLE;