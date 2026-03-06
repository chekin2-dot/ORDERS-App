# Testing Driver Order Assignment Flow

This guide walks through testing the complete driver order assignment and visibility flow.

## Test Accounts

- **Client:** +22676000001
- **Driver:** +22622222222

## Prerequisites

Before testing, ensure:

1. Driver account is properly set up and activated
2. Driver is verified (`verification_status = 'verified'`)
3. Driver is available (`is_available = true`)
4. Driver has delivery zones configured

Quick verification SQL:
```sql
SELECT
  up.phone,
  d.id as driver_id,
  d.is_available,
  d.verification_status,
  d.delivery_zones
FROM user_profiles up
JOIN drivers d ON d.user_id = up.id
WHERE up.phone = '+22622222222';
```

## Testing Steps

### Step 1: Open Driver App
1. Login as driver (+22622222222)
2. Navigate to "Mes Livraisons" (Deliveries tab)
3. Open browser/app console (important for debugging)

**Expected Console Output:**
```
Loading driver data
Setting up realtime subscription for driver: [driver_id]
=== Loading ongoing deliveries ===
Driver ID: [driver_id]
Profile ID: [user_id]
Query successful - Found deliveries: 0
Subscription status: SUBSCRIBED
Successfully subscribed to driver orders channel
```

### Step 2: Create Order as Client
1. In a separate browser/device, login as client (+22676000001)
2. Browse a merchant and add items to cart
3. Proceed to checkout
4. Select the driver (+22622222222) from the list
5. Confirm the driver selection

**Expected Client Console Output:**
```
=== handleConfirmDriver called ===
orderId: [order_id]
selectedDriver: {...}
Step 1: Getting authenticated user
User authenticated: [user_id]
Step 2: Assigning driver to order (pending driver acceptance)
Assigning driver_id: [driver_id]
Setting status to: pending_driver_acceptance
Order updated successfully: [{...}]
Driver ID assigned: [driver_id]
Status set to: pending_driver_acceptance
Notification sent to driver
```

### Step 3: Check Driver App Updates

**Automatic Update (via Realtime):**
Within 1-2 seconds, the driver app should automatically update and show:

**Expected Driver Console Output:**
```
Realtime update received: {...}
Event type: UPDATE
New order data: {...}
=== Loading ongoing deliveries ===
Driver ID: [driver_id]
Query successful - Found deliveries: 1
Delivery statuses: [{id: "...", status: "pending_driver_acceptance"}]
🔔 NEW ORDER DETECTED! Playing notification...
```

**Visual Changes:**
- Order appears in the delivery list
- "NOUVELLE DEMANDE" badge is visible
- "Accepter" and "Refuser" buttons are shown
- Notification sound plays
- Alert popup shows "Nouvelle Course!"
- Order shows earnings (1,000 F CFA or 1,500 F CFA for express)

**Manual Refresh (if automatic fails):**
- Pull down to refresh (pull-to-refresh gesture)
- Or tap the refresh icon in the header
- Order should appear after manual refresh

### Step 4: Driver Actions
Driver can now:
1. **Accept the order:** Tap "Accepter"
   - Status changes to 'accepted'
   - Client receives notification
   - Driver can see full order details

2. **Reject the order:** Tap "Refuser"
   - Status changes to 'rejected'
   - `driver_id` is cleared
   - Client receives notification to select another driver

## Troubleshooting

### Issue: Driver doesn't see the order at all (even after manual refresh)

**Diagnosis Steps:**

1. **Check driver ID assignment in database:**
```sql
SELECT id, client_id, driver_id, status, created_at
FROM orders
WHERE id = '[order_id_from_client_console]';
```

Expected: `driver_id` should match the driver's ID from prerequisites check.

2. **Check RLS policies allow driver to see order:**
```sql
-- Run as the driver's auth user
SELECT id, status, driver_id
FROM orders
WHERE driver_id = '[driver_id]'
AND status = 'pending_driver_acceptance';
```

If this returns empty, there's an RLS policy issue.

3. **Verify realtime subscription:**
Check driver console for "SUBSCRIBED" status. If missing, realtime isn't working.

### Issue: Realtime doesn't work, but manual refresh works

**Diagnosis:**
- Check browser console for WebSocket errors
- Verify Supabase realtime is enabled for the orders table
- Check that the subscription filter matches the driver_id exactly

**Workaround:**
- Use pull-to-refresh or the refresh button
- The order will appear correctly, just not automatically

### Issue: Order appears but driver can't accept/reject

**Diagnosis:**
Check RLS update policies:
```sql
-- Should allow driver to update their assigned orders
SELECT *
FROM pg_policies
WHERE tablename = 'orders'
AND policyname LIKE '%driver%update%';
```

## Success Criteria

✅ Driver sees new order within 2 seconds (realtime)
✅ Notification sound plays
✅ Alert popup appears
✅ Order shows correct status: "En attente de votre acceptation"
✅ Driver can accept the order
✅ Driver can reject the order
✅ Client receives appropriate notifications
✅ Manual refresh works as backup

## Additional Testing

### Test with Multiple Drivers
1. Create multiple driver accounts
2. Client selects Driver A
3. Verify Driver B does NOT see the order
4. Verify Driver A DOES see the order

### Test Express Orders
1. Create express delivery order
2. Verify driver sees "EXPRESS" tag
3. Verify earnings show 1,500 F CFA instead of 1,000 F CFA

### Test Status Workflow
1. Driver accepts order
2. Update status: Acceptée → Prête → En livraison → Livrée
3. Verify client sees status updates in real-time

## Performance Notes

- Initial query: < 500ms
- Realtime update latency: < 2 seconds
- Manual refresh: < 300ms
- Notification sound: Plays immediately upon detection

## Debugging Commands

**Enable verbose logging:**
All console logs are already in place. Just open browser/app console.

**Check current orders for driver:**
```sql
SELECT
  o.id,
  o.status,
  o.is_express,
  o.created_at,
  c.phone as client_phone,
  m.shop_name
FROM orders o
JOIN user_profiles c ON c.id = o.client_id
LEFT JOIN merchants m ON m.id = o.merchant_id
WHERE o.driver_id = (
  SELECT d.id FROM drivers d
  JOIN user_profiles up ON up.id = d.user_id
  WHERE up.phone = '+22622222222'
)
ORDER BY o.created_at DESC;
```

**Clear test orders:**
```sql
DELETE FROM orders
WHERE driver_id = (
  SELECT d.id FROM drivers d
  JOIN user_profiles up ON up.id = d.user_id
  WHERE up.phone = '+22622222222'
)
AND status IN ('pending_driver_acceptance', 'rejected');
```
