# Driver Order Visibility Debugging Guide

This guide helps debug why drivers may not see orders assigned to them.

## Test with Specific Phones

Client: +22676000001
Driver: +22622222222

## Step 1: Verify Driver Account Setup

Run this SQL to check if the driver account exists and is properly set up:

```sql
-- Find the driver's user profile
SELECT
  up.id as user_profile_id,
  up.phone,
  up.first_name,
  up.last_name,
  d.id as driver_id,
  d.is_available,
  d.verification_status,
  d.delivery_zones
FROM user_profiles up
LEFT JOIN drivers d ON d.user_id = up.id
WHERE up.phone = '+22622222222';
```

Expected result:
- Should return ONE row
- `driver_id` should NOT be null
- `verification_status` should be 'verified'
- `is_available` should be true

## Step 2: Find Orders Assigned to This Driver

```sql
-- Find the driver's ID first
WITH driver_info AS (
  SELECT d.id as driver_id
  FROM user_profiles up
  JOIN drivers d ON d.user_id = up.id
  WHERE up.phone = '+22622222222'
)
-- Now find all orders assigned to this driver
SELECT
  o.id,
  o.status,
  o.driver_id,
  o.client_id,
  o.created_at,
  c.phone as client_phone,
  c.first_name || ' ' || c.last_name as client_name
FROM orders o
JOIN user_profiles c ON c.id = o.client_id
WHERE o.driver_id IN (SELECT driver_id FROM driver_info)
ORDER BY o.created_at DESC
LIMIT 10;
```

## Step 3: Check RLS Policies

Run this to verify the driver can see their orders:

```sql
-- Check if RLS policies allow driver to see their orders
-- Run this as the driver user (use their auth.uid())
SELECT
  o.*
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM drivers d
  WHERE d.id = o.driver_id
    AND d.user_id = auth.uid()  -- This will be the driver's user_id
)
AND o.driver_id = 'PASTE_DRIVER_ID_HERE'
LIMIT 10;
```

## Step 4: Verify Realtime is Enabled

```sql
-- Check if realtime is enabled for orders table
SELECT schemaname, tablename, rl_enabled
FROM pg_tables
LEFT JOIN pg_publication_tables ON tablename = relname
WHERE tablename = 'orders';
```

## Step 5: Test Order Creation

Create a test order manually:

```sql
-- Get the client and driver IDs
WITH client_data AS (
  SELECT id as client_id FROM user_profiles WHERE phone = '+22676000001'
),
driver_data AS (
  SELECT d.id as driver_id FROM user_profiles up
  JOIN drivers d ON d.user_id = up.id
  WHERE up.phone = '+22622222222'
)
-- Insert test order
INSERT INTO orders (
  client_id,
  driver_id,
  status,
  total_amount,
  delivery_fee,
  payment_method,
  delivery_address
)
SELECT
  c.client_id,
  d.driver_id,
  'pending_driver_acceptance',
  5000,
  1000,
  'cash',
  'Test Address'
FROM client_data c, driver_data d
RETURNING *;
```

## Common Issues and Fixes

### Issue 1: Driver account not properly set up
**Symptom:** Driver ID is null in Step 1
**Fix:** Run activation command from DRIVER_ACTIVATION_COMMANDS.md

### Issue 2: Driver not verified
**Symptom:** `verification_status` is not 'verified'
**Fix:**
```sql
UPDATE drivers
SET verification_status = 'verified'
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');
```

### Issue 3: Driver not available
**Symptom:** `is_available` is false
**Fix:**
```sql
UPDATE drivers
SET is_available = true
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');
```

### Issue 4: Realtime not working
**Symptom:** Orders appear after manual refresh but not automatically
**Fix:** Check browser console for:
- "Successfully subscribed to driver orders channel"
- "Realtime update received" when order is created

If subscription fails, the issue is with Supabase realtime configuration.

## Testing Checklist

1. ✅ Driver account exists in `drivers` table
2. ✅ Driver is verified (`verification_status = 'verified'`)
3. ✅ Driver is available (`is_available = true`)
4. ✅ Driver has delivery zones configured
5. ✅ Client can create order
6. ✅ Order is assigned to driver (`driver_id` is set)
7. ✅ Order status is 'pending_driver_acceptance'
8. ✅ Driver can query their orders manually
9. ✅ Realtime subscription is established
10. ✅ Realtime events are received

## Console Debugging

When client selects driver, console should show:
```
=== handleConfirmDriver called ===
orderId: xxx
selectedDriver: {...}
Step 1: Getting authenticated user
User authenticated: xxx
Step 2: Assigning driver to order (pending driver acceptance)
Assigning driver_id: xxx
Setting status to: pending_driver_acceptance
Order updated successfully: [...]
Driver ID assigned: xxx
Status set to: pending_driver_acceptance
```

When driver app loads deliveries, console should show:
```
Setting up realtime subscription for driver: xxx
=== Loading ongoing deliveries ===
Driver ID: xxx
Profile ID: xxx
Query successful - Found deliveries: X
Subscription status: SUBSCRIBED
Successfully subscribed to driver orders channel
```

When order is assigned, driver console should show:
```
Realtime update received: {...}
Event type: UPDATE
New order data: {...}
=== Loading ongoing deliveries ===
Query successful - Found deliveries: X
```
