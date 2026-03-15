# Account Validation & Management Commands

This document contains SQL commands to validate and manage merchant and driver accounts in the ORDERS App.

## VALIDATION PROCESS OVERVIEW

When users create merchant or driver accounts, they are automatically set to "pending" status and require manual validation by administrators before gaining full access to the platform.

### Validation Steps:
1. User submits registration with required information and documents
2. Account is created with `verification_status = 'pending'` and `status = 'pending'`
3. Administrator reviews submitted information and documents
4. Administrator validates or rejects the account using SQL commands below
5. User receives notification of validation status
6. Validated users gain full access to platform features

---

## MERCHANT VALIDATION

### 1. View All Pending Merchants

```sql
-- List all merchants waiting for validation
SELECT
  up.id,
  up.first_name,
  up.last_name,
  up.phone,
  up.whatsapp_number,
  m.shop_name,
  c.name_fr as category,
  m.address,
  m.neighborhood,
  m.shop_photo_url,
  m.verification_status,
  m.created_at
FROM merchants m
JOIN user_profiles up ON m.user_id = up.id
LEFT JOIN categories c ON m.category_id = c.id
WHERE m.verification_status = 'pending'
ORDER BY m.created_at DESC;
```

### 2. Validate a Merchant Account

```sql
-- Approve and activate a merchant
UPDATE merchants
SET verification_status = 'verified'
WHERE user_id = 'USER_ID_HERE';

UPDATE user_profiles
SET status = 'active'
WHERE id = 'USER_ID_HERE';
```

### 3. Validate Merchant by Phone Number

```sql
-- Validate merchant using their phone number
UPDATE merchants m
SET verification_status = 'verified'
FROM user_profiles up
WHERE m.user_id = up.id
  AND up.phone = '+226XXXXXXXXX';

UPDATE user_profiles
SET status = 'active'
WHERE phone = '+226XXXXXXXXX';
```

### 4. Reject a Merchant Account

```sql
-- Reject a merchant application
UPDATE merchants
SET verification_status = 'rejected'
WHERE user_id = 'USER_ID_HERE';

UPDATE user_profiles
SET status = 'rejected'
WHERE id = 'USER_ID_HERE';
```

### 5. View All Verified Merchants

```sql
-- List all active merchants
SELECT
  up.id,
  up.first_name,
  up.last_name,
  up.phone,
  m.shop_name,
  c.name_fr as category,
  m.neighborhood,
  m.is_open,
  m.created_at
FROM merchants m
JOIN user_profiles up ON m.user_id = up.id
LEFT JOIN categories c ON m.category_id = c.id
WHERE m.verification_status = 'verified'
  AND up.status = 'active'
ORDER BY m.shop_name;
```

### 6. Suspend a Merchant Account

```sql
-- Temporarily suspend a merchant
UPDATE merchants
SET is_open = false
WHERE user_id = 'USER_ID_HERE';

UPDATE user_profiles
SET status = 'suspended'
WHERE id = 'USER_ID_HERE';
```

---

## DRIVER VALIDATION

### 1. View All Pending Drivers

```sql
-- List all drivers waiting for validation
SELECT
  up.id,
  up.first_name,
  up.last_name,
  up.phone,
  up.whatsapp_number,
  up.neighborhood,
  d.vehicle_type,
  d.delivery_zones,
  d.verification_status,
  d.created_at
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
WHERE d.verification_status = 'pending'
ORDER BY d.created_at DESC;
```

### 2. Validate a Specific Driver

Approve and activate a driver to make them eligible to receive delivery requests:

```sql
-- Validate driver by user_id
UPDATE drivers
SET verification_status = 'verified',
    is_available = false
WHERE user_id = 'USER_ID_HERE';

-- Also update the user profile status
UPDATE user_profiles
SET status = 'active'
WHERE id = 'USER_ID_HERE';
```

### 3. Validate Driver by Phone Number

```sql
-- Validate driver using their phone number
UPDATE drivers d
SET verification_status = 'verified'
FROM user_profiles up
WHERE d.user_id = up.id
  AND up.phone = '+226XXXXXXXXX';

UPDATE user_profiles
SET status = 'active'
WHERE phone = '+226XXXXXXXXX';
```

### 4. Reject a Driver Account

```sql
-- Reject a driver application
UPDATE drivers
SET verification_status = 'rejected'
WHERE user_id = 'USER_ID_HERE';

UPDATE user_profiles
SET status = 'rejected'
WHERE id = 'USER_ID_HERE';
```

### 5. Validate Multiple Drivers at Once

```sql
-- Validate all pending drivers (use with caution)
UPDATE drivers
SET verification_status = 'verified'
WHERE verification_status = 'pending';

UPDATE user_profiles
SET status = 'active'
WHERE user_type = 'driver' AND status = 'pending';
```

---

## DRIVER MANAGEMENT

### View All Active Drivers

```sql
-- List all active and verified drivers
SELECT
  up.id,
  up.first_name,
  up.last_name,
  up.phone,
  up.neighborhood,
  d.vehicle_type,
  d.is_available,
  d.delivery_zones,
  d.total_deliveries,
  d.total_earnings,
  d.express_deliveries
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
WHERE d.verification_status = 'verified'
  AND up.status = 'active'
ORDER BY up.first_name;
```

### View Available Drivers by Zone

```sql
-- Find available drivers in a specific neighborhood
SELECT
  up.first_name,
  up.last_name,
  up.phone,
  d.vehicle_type,
  d.delivery_zones,
  up.latitude,
  up.longitude
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
WHERE d.is_available = true
  AND d.verification_status = 'verified'
  AND 'Akwa' = ANY(d.delivery_zones);
```

### Suspend a Driver

```sql
-- Suspend a driver account
UPDATE drivers
SET is_available = false
WHERE user_id = 'USER_ID_HERE';

UPDATE user_profiles
SET status = 'suspended'
WHERE id = 'USER_ID_HERE';
```

### View Driver Performance Stats

```sql
-- Get driver performance metrics
SELECT
  up.first_name || ' ' || up.last_name as driver_name,
  up.phone,
  d.total_deliveries,
  d.total_earnings,
  d.express_deliveries,
  d.total_bonuses,
  CASE
    WHEN d.total_deliveries > 0
    THEN ROUND((d.express_deliveries::numeric / d.total_deliveries * 100), 2)
    ELSE 0
  END as express_percentage
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
WHERE d.verification_status = 'verified'
ORDER BY d.total_earnings DESC;
```

### Bulk Validate Drivers with Specific Criteria

```sql
-- Validate drivers who have uploaded identity photos and vehicle photos
UPDATE drivers
SET verification_status = 'verified'
WHERE verification_status = 'pending'
  AND identity_photo_url IS NOT NULL
  AND vehicle_photo_url IS NOT NULL;
```

### Set Driver Availability

```sql
-- Make a driver available for deliveries
UPDATE drivers
SET is_available = true
WHERE user_id = 'USER_ID_HERE'
  AND verification_status = 'verified';

-- Make a driver unavailable
UPDATE drivers
SET is_available = false
WHERE user_id = 'USER_ID_HERE';
```

### Update Driver Delivery Zones

```sql
-- Add delivery zones for a driver
UPDATE drivers
SET delivery_zones = ARRAY['Akwa', 'Bonanjo', 'Bonapriso']
WHERE user_id = 'USER_ID_HERE';
```

### View Today's Driver Earnings

```sql
-- Get earnings for today
SELECT
  up.first_name || ' ' || up.last_name as driver_name,
  COUNT(o.id) as deliveries_today,
  COALESCE(SUM(o.delivery_fee), 0) as earnings_today,
  COALESCE(SUM(o.express_bonus), 0) as bonuses_today
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
LEFT JOIN orders o ON o.driver_id = d.id
  AND o.status = 'delivered'
  AND DATE(o.delivery_completed_at) = CURRENT_DATE
GROUP BY up.first_name, up.last_name, d.id
ORDER BY earnings_today DESC;
```

## Express Delivery Bonus System

The system automatically awards a **500 F CFA bonus** to drivers who complete express deliveries within 10 minutes.

### How It Works:
1. Client marks order as "Express Delivery" during checkout
2. Driver accepts the order and starts delivery (sets `delivery_started_at`)
3. Driver completes delivery (sets `delivery_completed_at`)
4. System automatically calculates delivery time
5. If delivery time ≤ 10 minutes, driver receives 500 F CFA bonus
6. Bonus is automatically added to `express_bonus` field in orders table

### View Express Delivery Performance:
```sql
SELECT
  up.first_name || ' ' || up.last_name as driver_name,
  d.express_deliveries,
  d.total_bonuses,
  ROUND(d.total_bonuses / NULLIF(d.express_deliveries, 0), 2) as avg_bonus_per_express
FROM drivers d
JOIN user_profiles up ON d.user_id = up.id
WHERE d.express_deliveries > 0
ORDER BY d.express_deliveries DESC;
```

## IMPORTANT VALIDATION GUIDELINES

### For Merchants:
1. **Identity Verification**: Verify the merchant's identity documents before approval
2. **Shop Photo**: Review the shop facade photo to ensure it's a legitimate business
3. **Category Check**: Ensure the selected category matches the business type
4. **Location Verification**: Verify GPS coordinates and address are accurate
5. **Contact Information**: Ensure WhatsApp number is valid for customer communication

### For Drivers:
1. **Identity Verification**: Verify driver's identity documents before approval
2. **Vehicle Verification**: Check vehicle photos and registration documents
3. **Background Check**: Consider implementing background checks for safety
4. **Delivery Zones**: Ensure drivers have appropriate delivery zones assigned
5. **Vehicle Type**: Verify vehicle type matches the actual vehicle owned
6. **GPS Location**: Driver's GPS location is tracked automatically when they log in

## VALIDATION TIMELINE

- **Standard Review Time**: 48 hours (2 business days)
- **Priority Review**: Available for urgent cases
- **Notification**: Users are automatically notified via in-app notifications
- **Appeal Process**: Rejected users can resubmit with corrected information

## SAFETY & COMPLIANCE

- Regularly review merchant and driver performance metrics
- Monitor customer complaints and feedback
- Investigate suspicious patterns or behavior
- Keep communication channels open with all users
- Maintain audit trail of all validation decisions
