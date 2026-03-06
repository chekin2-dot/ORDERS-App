# Quick Fix Guide - Driver Not Receiving Orders

If a driver is not seeing orders assigned to them, follow these steps in order:

## 🔍 Step 1: Verify Driver Setup (30 seconds)

Run this SQL in Supabase SQL Editor:

```sql
SELECT
  up.phone,
  d.id as driver_id,
  d.is_available,
  d.verification_status,
  d.delivery_zones
FROM user_profiles up
LEFT JOIN drivers d ON d.user_id = up.id
WHERE up.phone = '+22622222222';
```

**Check Results:**
- ✅ `driver_id` is NOT null → Driver record exists
- ✅ `is_available` is `true` → Driver is available
- ✅ `verification_status` is `'verified'` → Driver is verified
- ✅ `delivery_zones` has values → Driver has zones configured

**If ANY check fails, run the fix commands in Step 2.**

## 🔧 Step 2: Fix Driver Account (if needed)

```sql
-- Fix ALL common issues at once
UPDATE drivers
SET
  verification_status = 'verified',
  is_available = true,
  delivery_zones = CASE
    WHEN delivery_zones IS NULL OR array_length(delivery_zones, 1) = 0
    THEN ARRAY['Dakar-Plateau', 'Dakar-Point E', 'Dakar-Almadies', 'Dakar-Mermoz']
    ELSE delivery_zones
  END
WHERE user_id = (SELECT id FROM user_profiles WHERE phone = '+22622222222');
```

## 🧪 Step 3: Test Order Creation

1. **As Client (+22676000001):**
   - Create a new order
   - Select driver (+22622222222)
   - Note the Order ID from console

2. **Verify Order in Database:**
```sql
SELECT id, status, driver_id, created_at
FROM orders
WHERE id = 'PASTE_ORDER_ID_HERE';
```

Expected: `driver_id` should be populated and `status` should be `'pending_driver_acceptance'`

## 📱 Step 4: Check Driver App

1. **Open driver app (+22622222222)**
2. **Navigate to "Mes Livraisons" tab**
3. **Open browser console (F12 or Cmd+Option+I)**

**Look for these console messages:**
```
Setting up realtime subscription for driver: [id]
Subscription status: SUBSCRIBED
Successfully subscribed to driver orders channel
```

4. **Try manual refresh:**
   - Pull down to refresh, OR
   - Tap the refresh icon (↻) in the header

**Order should appear immediately after manual refresh.**

## 🔔 Step 5: Test Realtime Updates

With driver app still open:

1. Create another order as client
2. **Watch driver console** for:
```
Realtime update received: {...}
🔔 NEW ORDER DETECTED! Playing notification...
```

3. **Visual indicators:**
   - Sound plays
   - Alert popup appears
   - Order shows in list with "NOUVELLE DEMANDE" badge

## ❌ If Still Not Working

### Check 1: Verify RLS Policies

```sql
-- Driver should be able to see their orders
SELECT id, status, driver_id
FROM orders
WHERE driver_id IN (
  SELECT d.id FROM drivers d
  JOIN user_profiles up ON up.id = d.user_id
  WHERE up.phone = '+22622222222'
);
```

If this returns no rows but orders exist, **RLS policies are blocking access.**

**Fix:** Run the latest migration to update policies:
```sql
-- This should already be in place, but verify:
SELECT policyname
FROM pg_policies
WHERE tablename = 'orders'
AND policyname = 'Drivers can view their assigned orders';
```

### Check 2: Verify Realtime is Enabled

```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'orders';
```

Expected: Should return one row with `tablename = 'orders'`

If empty, realtime is not enabled. Contact your Supabase admin.

## 💡 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Driver not verified | Run Step 2 SQL |
| Driver not available | Run Step 2 SQL |
| No delivery zones | Run Step 2 SQL |
| Orders don't appear at all | Check RLS policies (Check 1) |
| Orders appear only after manual refresh | Realtime issue, but app still works |
| Can't accept/reject orders | Check driver UPDATE policies |

## ✅ Success Checklist

- [ ] Driver account exists and is verified
- [ ] Driver is available
- [ ] Driver has delivery zones configured
- [ ] Orders can be created and assigned
- [ ] Driver sees orders (at least after manual refresh)
- [ ] Driver receives realtime updates (ideal)
- [ ] Driver can accept orders
- [ ] Driver can reject orders
- [ ] Client receives notifications

## 🆘 Emergency Contact

If none of these steps work, check these files for detailed debugging:

1. `DRIVER_ORDER_VISIBILITY_DEBUG.md` - Comprehensive debugging guide
2. `TESTING_DRIVER_ORDER_FLOW.md` - Complete testing walkthrough
3. `verify_test_accounts.sql` - Diagnostic SQL script

**Console Logs:**
All important events are logged. Keep console open and look for errors or warnings.
