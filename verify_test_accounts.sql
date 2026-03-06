/*
  Verification Script for Test Accounts

  This script verifies the setup for:
  - Client: +22676000001
  - Driver: +22622222222

  Run this in the Supabase SQL Editor to diagnose any issues.
*/

-- ================================================
-- 1. CHECK CLIENT ACCOUNT
-- ================================================
SELECT
  '=== CLIENT ACCOUNT ===' as section,
  id,
  phone,
  first_name,
  last_name,
  role,
  email_confirmed
FROM user_profiles
WHERE phone = '+22676000001';

-- ================================================
-- 2. CHECK DRIVER ACCOUNT AND DRIVER RECORD
-- ================================================
SELECT
  '=== DRIVER ACCOUNT ===' as section,
  up.id as user_profile_id,
  up.phone,
  up.first_name,
  up.last_name,
  up.role,
  d.id as driver_id,
  d.is_available,
  d.verification_status,
  d.vehicle_type,
  d.delivery_zones,
  d.accepts_express_delivery
FROM user_profiles up
LEFT JOIN drivers d ON d.user_id = up.id
WHERE up.phone = '+22622222222';

-- ================================================
-- 3. CHECK RECENT ORDERS FOR THIS CLIENT-DRIVER PAIR
-- ================================================
SELECT
  '=== RECENT ORDERS ===' as section,
  o.id,
  o.status,
  o.driver_id,
  o.client_id,
  o.total_amount,
  o.delivery_fee,
  o.is_express,
  o.created_at,
  'Driver: ' || COALESCE(d_prof.first_name || ' ' || d_prof.last_name, 'None') as driver_name,
  'Client: ' || c_prof.first_name || ' ' || c_prof.last_name as client_name
FROM orders o
LEFT JOIN user_profiles c_prof ON c_prof.id = o.client_id
LEFT JOIN drivers d ON d.id = o.driver_id
LEFT JOIN user_profiles d_prof ON d_prof.id = d.user_id
WHERE c_prof.phone = '+22676000001'
ORDER BY o.created_at DESC
LIMIT 10;

-- ================================================
-- 4. CHECK IF DRIVER CAN SEE THEIR ASSIGNED ORDERS (RLS CHECK)
-- ================================================
SELECT
  '=== ORDERS VISIBLE TO DRIVER ===' as section,
  o.id,
  o.status,
  o.driver_id,
  o.created_at
FROM orders o
WHERE o.driver_id IN (
  SELECT d.id FROM drivers d
  JOIN user_profiles up ON up.id = d.user_id
  WHERE up.phone = '+22622222222'
)
ORDER BY o.created_at DESC
LIMIT 10;

-- ================================================
-- 5. CHECK REALTIME PUBLICATION FOR ORDERS TABLE
-- ================================================
SELECT
  '=== REALTIME CONFIG ===' as section,
  schemaname,
  tablename,
  'Realtime enabled: ' || CASE WHEN tablename IN (
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
  ) THEN 'YES' ELSE 'NO' END as realtime_status
FROM pg_tables
WHERE tablename = 'orders'
AND schemaname = 'public';

-- ================================================
-- 6. CHECK RLS POLICIES FOR DRIVERS
-- ================================================
SELECT
  '=== DRIVER RLS POLICIES ===' as section,
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'orders'
AND (policyname ILIKE '%driver%' OR qual::text ILIKE '%driver%')
ORDER BY policyname;

-- ================================================
-- 7. DIAGNOSTIC SUMMARY
-- ================================================
WITH
  client_check AS (
    SELECT COUNT(*) as exists FROM user_profiles WHERE phone = '+22676000001'
  ),
  driver_profile_check AS (
    SELECT COUNT(*) as exists FROM user_profiles WHERE phone = '+22622222222'
  ),
  driver_record_check AS (
    SELECT COUNT(*) as exists FROM drivers d
    JOIN user_profiles up ON up.id = d.user_id
    WHERE up.phone = '+22622222222'
  ),
  driver_verified_check AS (
    SELECT COUNT(*) as exists FROM drivers d
    JOIN user_profiles up ON up.id = d.user_id
    WHERE up.phone = '+22622222222' AND d.verification_status = 'verified'
  ),
  driver_available_check AS (
    SELECT COUNT(*) as exists FROM drivers d
    JOIN user_profiles up ON up.id = d.user_id
    WHERE up.phone = '+22622222222' AND d.is_available = true
  ),
  orders_check AS (
    SELECT COUNT(*) as count FROM orders o
    JOIN user_profiles c ON c.id = o.client_id
    WHERE c.phone = '+22676000001'
  )
SELECT
  '=== DIAGNOSTIC SUMMARY ===' as section,
  CASE WHEN (SELECT exists FROM client_check) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as client_exists,
  CASE WHEN (SELECT exists FROM driver_profile_check) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as driver_profile_exists,
  CASE WHEN (SELECT exists FROM driver_record_check) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as driver_record_exists,
  CASE WHEN (SELECT exists FROM driver_verified_check) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as driver_verified,
  CASE WHEN (SELECT exists FROM driver_available_check) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as driver_available,
  (SELECT count FROM orders_check) as total_orders_from_client;

-- ================================================
-- 8. QUICK FIX COMMANDS (if needed)
-- ================================================
/*
-- Uncomment and run these if any checks fail:

-- Fix: Driver not verified
UPDATE drivers
SET verification_status = 'verified'
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');

-- Fix: Driver not available
UPDATE drivers
SET is_available = true
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');

-- Fix: Driver missing delivery zones (example for Dakar-Plateau)
UPDATE drivers
SET delivery_zones = ARRAY['Dakar-Plateau', 'Dakar-Point E', 'Dakar-Almadies']
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');

-- Create test order (if needed for testing)
WITH
  client_data AS (SELECT id FROM user_profiles WHERE phone = '+22676000001'),
  driver_data AS (
    SELECT d.id as driver_id, d.user_id as driver_user_id
    FROM drivers d
    JOIN user_profiles up ON up.id = d.user_id
    WHERE up.phone = '+22622222222'
  ),
  test_merchant AS (SELECT id FROM merchants LIMIT 1)
INSERT INTO orders (
  client_id,
  merchant_id,
  driver_id,
  status,
  total_amount,
  delivery_fee,
  payment_method,
  delivery_address,
  is_express
)
SELECT
  c.id,
  m.id,
  d.driver_id,
  'pending_driver_acceptance',
  5000,
  1000,
  'cash',
  'Test Address - Dakar',
  false
FROM client_data c, driver_data d, test_merchant m
RETURNING id, status, driver_id;

-- Send notification to driver about the test order
-- (Replace ORDER_ID and DRIVER_USER_ID with actual values from above)
INSERT INTO user_notifications (user_id, title, message, type, data)
VALUES (
  'DRIVER_USER_ID',
  'Test - Nouvelle course!',
  'Ceci est un test de notification de course.',
  'new_order_request',
  '{"order_id": "ORDER_ID"}'::jsonb
);
*/
