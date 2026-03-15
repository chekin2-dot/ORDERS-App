# Admin Merchant Validation Guide

## Problem Fixed
Previously, admins couldn't validate merchants using SQL commands because RLS policies only allowed users to update their own records. This has been fixed with new admin-specific policies.

## How to Validate a Merchant

### Step 1: View Pending Merchants
```sql
SELECT
  m.user_id,
  up.first_name,
  up.last_name,
  up.phone,
  m.shop_name,
  m.verification_status,
  up.status as account_status
FROM merchants m
JOIN user_profiles up ON m.user_id = up.id
WHERE m.verification_status = 'pending'
ORDER BY m.created_at DESC;
```

### Step 2: Validate a Merchant (Single Command)
Replace `USER_ID_HERE` with the actual merchant's user_id:

```sql
-- Update both tables in one transaction
BEGIN;

UPDATE user_profiles
SET status = 'active'
WHERE id = 'USER_ID_HERE' AND user_type = 'merchant';

UPDATE merchants
SET verification_status = 'verified'
WHERE user_id = 'USER_ID_HERE';

COMMIT;
```

### Step 3: Verify the Update
```sql
SELECT
  up.first_name,
  up.last_name,
  up.status as account_status,
  m.shop_name,
  m.verification_status
FROM user_profiles up
JOIN merchants m ON m.user_id = up.id
WHERE up.id = 'USER_ID_HERE';
```

## Why It Works Now

The new RLS policies allow:
- **Active admins** can update ANY user profile or merchant record
- **Regular users** can only update their own records
- **Merchants** can only update their own shop details

## Important Notes

1. You must be logged in as an active admin for these commands to work
2. The commands now work immediately - no need to refresh or wait
3. Both the `user_profiles.status` and `merchants.verification_status` must be updated
4. Use transactions (BEGIN/COMMIT) to ensure both updates succeed or both fail

## Rejecting a Merchant

```sql
BEGIN;

UPDATE user_profiles
SET status = 'suspended'
WHERE id = 'USER_ID_HERE' AND user_type = 'merchant';

UPDATE merchants
SET verification_status = 'rejected'
WHERE user_id = 'USER_ID_HERE';

COMMIT;
```

## Bulk Validation (Multiple Merchants)

```sql
-- Validate all pending merchants at once
BEGIN;

UPDATE user_profiles
SET status = 'active'
WHERE user_type = 'merchant'
AND status = 'pending'
AND id IN (
  SELECT user_id FROM merchants WHERE verification_status = 'pending'
);

UPDATE merchants
SET verification_status = 'verified'
WHERE verification_status = 'pending';

COMMIT;
```

## Security

- Only users with an active admin account can execute these commands
- Regular merchants cannot modify other merchants' records
- All actions are logged in the database for audit purposes
