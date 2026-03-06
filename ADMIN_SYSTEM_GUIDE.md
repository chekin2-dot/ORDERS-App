# Admin System Guide

## Overview

A comprehensive admin dashboard system has been created to manage the entire ORDERS platform. This system provides powerful tools for monitoring, managing users, tracking transactions, analyzing performance, and resolving disputes.

## Features

### 1. Dashboard Home
- **Real-time Platform Statistics**
  - Total users, clients, merchants, drivers
  - Active and completed orders
  - Total revenue
  - Pending verifications and blocked users
- **Recent Activity Feed**
  - Latest orders and transactions
  - Quick status overview
- **Alert System**
  - Notifications for pending driver verifications
  - Blocked user alerts

### 2. User Management
- **View All Users**
  - Searchable user database
  - Filter by user type (Client, Merchant, Driver)
  - Filter by status (Active, Blocked)
- **User Actions**
  - View detailed user profiles
  - Block/Unblock users
  - Track user activity
- **Smart Filtering**
  - Quick filters for all user categories
  - Real-time search functionality

### 3. Orders & Transactions
- **Complete Order Tracking**
  - View all platform orders
  - Search by order number
  - Filter by status (Pending, Accepted, Delivered, Cancelled)
- **Transaction Details**
  - Client, Merchant, and Driver information
  - Payment status and method
  - Revenue tracking
- **Order Timeline**
  - Track order lifecycle from creation to delivery

### 4. Analytics & Performance
- **Revenue Metrics**
  - Daily, Weekly, and Monthly revenue
  - Average order value
  - Revenue trends
- **User Base Analysis**
  - Client, Merchant, and Driver statistics
  - Growth tracking
- **Performance Indicators**
  - Order completion rates
  - User engagement metrics

### 5. Disputes & Reports
- **Report Management**
  - View all user reports
  - Filter by status (Pending, Investigating, Resolved, Dismissed)
  - Categorize by report type
- **Dispute Resolution**
  - View detailed dispute information
  - Track reporter and reported user
  - Link to related orders
- **Action Tracking**
  - Monitor resolution status
  - View investigation progress

### 6. Admin Settings
- **Account Management**
  - View admin profile
  - Role identification (Super Admin, Admin, Moderator)
- **System Tools**
  - Admin user management
  - Notification configuration
  - Secure logout

## Database Schema

### Tables Created

1. **admin_users**
   - Stores admin user information
   - Roles: super_admin, admin, moderator
   - Tracks active/inactive status

2. **admin_action_logs**
   - Logs all admin actions
   - Tracks which admin performed which action
   - Includes target users, orders, and reasons
   - Full audit trail for accountability

### Security Features

- **Row Level Security (RLS)** enabled on all admin tables
- **Admin-only access** - Only authenticated admins can view/modify data
- **Role-based permissions** - Super admins have elevated privileges
- **Action logging** - Every admin action is automatically logged
- **Secure functions** - Database functions use SECURITY DEFINER

## How to Access Admin Panel

### Step 1: Create First Super Admin

Run this SQL command in Supabase to create your first super admin:

```sql
-- Replace 'USER_ID_HERE' with the actual user ID from user_profiles table
INSERT INTO admin_users (user_id, role, is_active)
VALUES ('USER_ID_HERE', 'super_admin', true);
```

### Step 2: Login to App

1. Open the app
2. Login with the phone number associated with the admin user
3. The app will automatically detect admin status
4. You'll be redirected to the admin dashboard

### Step 3: Navigate Admin Panel

The admin panel has 6 main sections accessible via bottom tabs:
- **Dashboard** - Overview and metrics
- **Users** - User management
- **Orders** - Transaction tracking
- **Analytics** - Performance metrics
- **Disputes** - Report management
- **Settings** - Admin configuration

## Admin Functions

### Block a User

```typescript
// Automatically called when using the UI
// Can also be called directly:
SELECT block_user_account(
  'target_user_id',  -- UUID of user to block
  'admin_user_id',   -- UUID of admin performing action
  'reason'           -- Reason for blocking
);
```

### Unblock a User

```typescript
// Automatically called when using the UI
// Can also be called directly:
SELECT unblock_user_account(
  'target_user_id',  -- UUID of user to unblock
  'admin_user_id'    -- UUID of admin performing action
);
```

### Get Platform Statistics

```typescript
// Get stats for last 30 days (default)
SELECT get_platform_stats();

// Get stats for custom date range
SELECT get_platform_stats('2026-01-01'::timestamptz, '2026-01-31'::timestamptz);
```

## Role Hierarchy

### Super Admin
- Full access to all features
- Can create/modify other admins
- Can delete users
- Can access all reports and logs
- Can modify system settings

### Admin
- Can view all data
- Can block/unblock users
- Can resolve disputes
- Can view analytics
- **Cannot** create other admins

### Moderator
- Can view most data
- Can view and moderate reports
- Limited user management
- **Cannot** block users or create admins

## Best Practices

1. **Always log actions** - The system automatically logs, but document complex decisions
2. **Review disputes regularly** - Check the Disputes tab daily
3. **Monitor pending verifications** - Approve/reject driver applications promptly
4. **Track blocked users** - Regularly review blocked user list
5. **Analyze trends** - Use Analytics tab to identify platform growth patterns
6. **Secure admin accounts** - Only grant admin access to trusted individuals
7. **Document decisions** - When blocking users, always provide clear reasons

## Tracking System

### What Gets Tracked?

1. **User Actions**
   - All block/unblock operations
   - User status changes
   - Account deletions

2. **Order Flow**
   - Order creation through delivery
   - Payment processing
   - Driver assignments
   - Status changes

3. **Financial Transactions**
   - All order payments
   - Revenue by period
   - Merchant payouts
   - Driver earnings

4. **Disputes**
   - Report submissions
   - Investigation progress
   - Resolution outcomes

### Accessing Logs

```sql
-- View all admin actions
SELECT * FROM admin_action_logs
ORDER BY created_at DESC
LIMIT 100;

-- View actions by specific admin
SELECT * FROM admin_action_logs
WHERE admin_user_id = 'ADMIN_ID'
ORDER BY created_at DESC;

-- View actions on specific user
SELECT * FROM admin_action_logs
WHERE target_user_id = 'USER_ID'
ORDER BY created_at DESC;
```

## Dispute Resolution Workflow

1. **New Report Arrives** - Shows in Disputes tab with "pending" status
2. **Admin Reviews** - Click to view full details
3. **Investigation** - Change status to "investigating"
4. **Decision** - Mark as "resolved" or "dismissed"
5. **Action** - Block user if necessary, document reason
6. **Follow-up** - Monitor user behavior after resolution

## Key Metrics to Monitor

### Daily Checks
- Active orders count
- Pending driver verifications
- Unresolved disputes
- Blocked users

### Weekly Reviews
- Revenue trends
- User growth rates
- Order completion rates
- Average order value

### Monthly Analysis
- Platform performance
- User retention
- Merchant/Driver satisfaction
- Revenue vs. targets

## Security Considerations

1. **Admin accounts** are separate from regular user accounts
2. **All actions are logged** and cannot be deleted
3. **RLS policies** prevent unauthorized access
4. **Role-based access** limits what each admin can do
5. **Audit trail** maintains accountability

## Troubleshooting

### Cannot Access Admin Panel
- Verify user is in `admin_users` table
- Check `is_active` is true
- Ensure user is logged in correctly

### Cannot Block User
- Verify admin has proper role (not just moderator)
- Check user ID is correct
- Review RLS policies

### Stats Not Loading
- Check database connection
- Verify `get_platform_stats()` function exists
- Review function permissions

## Support

For issues or questions about the admin system:
1. Check this guide first
2. Review database logs
3. Check admin action logs for recent changes
4. Verify RLS policies are correctly configured

## Future Enhancements

Potential additions to the admin system:
- Bulk user operations
- Advanced reporting tools
- Email notification system
- Automated fraud detection
- Custom report generation
- Mobile app for admins
- Real-time chat support integration

---

**Important**: This admin system has complete control over the platform. Use responsibly and always follow established guidelines when taking action against users.
