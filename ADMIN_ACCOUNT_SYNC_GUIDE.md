# Admin Account Synchronization Guide

## Overview

The admin dashboard now includes comprehensive account synchronization features that provide real-time updates and detailed user management capabilities. All user accounts are automatically synchronized with the admin dashboard, ensuring you always have the most up-to-date information.

## Key Features

### 1. Real-Time Synchronization

**What it does**:
- Automatically updates the user list when any account is modified
- Shows a sync indicator when updates are received
- No manual refresh required

**Visual Indicator**:
- A spinning refresh icon appears next to "User Management" title when data is syncing
- Icon automatically disappears after sync completes

**How it works**:
- Uses Supabase Realtime to listen for database changes
- Triggers automatic refresh when:
  - New user registers
  - User profile is updated
  - User status changes (active/banned)
  - Any user data is modified

### 2. Comprehensive User Details

**Location**: Admin Dashboard → Users → View Button

Each user card now displays:
- Full name
- Phone number
- Physical address (if provided)
- Join date
- User type badge (Client/Merchant/Driver)
- Status badge (Active/Banned)
- GPS enabled indicator (blue location pin)

### 3. Detailed User Profile View

**What's included**:

**For All Users**:
- Contact information (phone, address with map link)
- Account creation date
- GPS status
- Order statistics
- Account actions (Call, Block/Unblock)

**For Clients**:
- Total orders placed
- Completed orders
- Total amount spent
- Order history

**For Merchants**:
- Shop name and description
- Business category
- Neighborhood
- Total orders received
- Completed orders
- Total revenue
- Net earnings (after platform fee)

**For Drivers**:
- Vehicle information (type and number)
- License number
- ID card details
- Total deliveries
- Completed deliveries
- Total earnings
- Average rating (if available)
- Working hours
- Express delivery acceptance

## User Management Features

### Search Functionality

**Location**: Search bar at the top

**Searchable Fields**:
- First name
- Last name
- Phone number

**Usage**: Type any part of a name or phone number to filter users instantly

### Filter Options

**Available Filters**:
1. **All** - Shows all users
2. **Clients** - Only customer accounts
3. **Merchants** - Only business accounts
4. **Drivers** - Only delivery personnel
5. **Blocked** - Only banned accounts

**Filter Badges**: Show count for each category in real-time

### User Actions

#### View Details
- Click the "View" button on any user card
- Opens comprehensive profile with all details
- Real-time synchronized information
- Direct links to contact user or view location

#### Block User
- Click "Block" button
- Requires confirmation
- Immediately restricts account access
- Logged for audit trail

#### Unblock User
- Available on blocked accounts
- One-click restoration
- Account immediately reactivated
- User can log in again

#### Call User
- Available in detail view
- Opens phone dialer with user's number
- Direct communication channel

#### View Location
- Available if user has GPS coordinates
- Opens Google Maps with user's location
- Useful for merchant/driver verification

## Excel Export

**Location**: Export button in top-right corner

### What Gets Exported

**Summary Sheet**:
- Report generation timestamp
- Applied filter (All/Clients/Merchants/Drivers)
- Total user count
- User type breakdown
- Status breakdown (Active/Banned)

**Users Sheet**:
- Name
- Phone number
- User type
- Account status
- Address
- GPS enabled status
- Join date

**File Format**: `Users_Report_YYYY-MM-DD.xlsx`

**Use Cases**:
- User base analysis
- Marketing campaigns
- Compliance reporting
- Backup records
- Statistical analysis

## Statistics Dashboard

Available in user detail view for tracking:

### Client Stats
- Total orders
- Completed orders
- Total spent (in F CFA)

### Merchant Stats
- Total orders
- Completed orders
- Total earnings (in F CFA)
- Revenue breakdown

### Driver Stats
- Total deliveries
- Completed deliveries
- Total earnings (in F CFA)
- Average rating
- Number of ratings

## Real-Time Updates

### What Triggers Sync

The system automatically syncs when:
1. **New Registration**: Any new user account is created
2. **Profile Update**: User updates their profile information
3. **Status Change**: User account is blocked or unblocked
4. **Role Assignment**: User type changes
5. **Contact Update**: Phone or address changes
6. **GPS Toggle**: User enables/disables location services

### Sync Indicator Behavior

**Normal State**: No indicator visible
**Syncing State**: Green refresh icon appears
**Duration**: Visible for ~1 second
**Frequency**: Only when actual changes occur

## Best Practices

### Daily Operations

1. **Morning Review**:
   - Check for new registrations
   - Review pending merchant/driver approvals
   - Address any blocked accounts

2. **Regular Monitoring**:
   - Watch for suspicious activity
   - Monitor user growth by type
   - Track blocked account trends

3. **Weekly Reports**:
   - Export user data for analysis
   - Review growth metrics
   - Analyze user distribution by type

### User Verification

**For Merchants**:
1. View merchant details
2. Check shop name and category
3. Verify address and location
4. Review business description
5. Monitor initial orders

**For Drivers**:
1. Verify vehicle information
2. Check license number
3. Review ID card details (if uploaded)
4. Confirm GPS capability
5. Check working hours
6. Monitor first deliveries

### Security Management

1. **Blocking Users**:
   - Always document reason
   - Review account activity first
   - Check for related disputes
   - Notify user if appropriate

2. **Unblocking Users**:
   - Verify issue is resolved
   - Check for repeat violations
   - Monitor post-unblock activity
   - Document decision

## Technical Details

### Real-Time Architecture

**Technology**: Supabase Realtime
**Protocol**: WebSocket
**Latency**: < 1 second
**Coverage**: All user_profiles table changes

### Data Refresh Strategy

**Automatic Refresh**:
- Triggered by database changes
- Updates entire user list
- Preserves filter/search state
- Maintains scroll position

**Manual Refresh**:
- Pull-down gesture
- Refreshes all data
- Shows loading indicator
- Updates statistics

### Performance

**Optimization**:
- Efficient queries with proper indexing
- Realtime updates only for visible data
- Minimal network overhead
- Cached user lists

**Scalability**:
- Handles thousands of users
- Efficient filtering
- Fast search operations
- Smooth scrolling

## Troubleshooting

### Sync Not Working

**Issue**: Real-time updates not appearing

**Solutions**:
1. Check internet connection
2. Verify Supabase connection
3. Try manual refresh (pull down)
4. Restart the app
5. Check admin permissions

### Export Failing

**Issue**: Excel export button doesn't work

**Solutions**:
1. Ensure users exist to export
2. Check storage permissions
3. Verify internet connection
4. Try with fewer users (use filters)
5. Check available device storage

### User Details Not Loading

**Issue**: Detail screen shows loading forever

**Solutions**:
1. Check user still exists
2. Verify database connection
3. Check admin permissions
4. Try going back and reopening
5. Check for console errors

### Search Not Finding Users

**Issue**: Known users don't appear in search

**Solutions**:
1. Check spelling
2. Try partial name
3. Use phone number instead
4. Clear search and try again
5. Verify user actually exists

## Privacy & Security

### Data Protection

**Admin Access Only**:
- Only admin accounts can view all users
- Row Level Security enforced
- Audit logging enabled
- Secure connections required

**Sensitive Data**:
- ID card images (driver verification)
- Phone numbers
- Addresses
- Location coordinates

### Access Logs

All admin actions are logged:
- User profile views
- Account blocks/unblocks
- Data exports
- Search queries
- Filter changes

### Compliance

**Data Retention**:
- User data retained per policy
- Export includes GDPR compliance
- User deletion supported
- Data anonymization available

**Audit Trail**:
- All blocking actions logged
- Unblock actions recorded
- Admin user identified
- Timestamp recorded

## Advanced Features

### Bulk Operations (Future)

Planned enhancements:
- Bulk block/unblock
- Bulk export by criteria
- Batch notifications
- Mass messaging

### Analytics Integration (Future)

Coming soon:
- User growth charts
- Registration trends
- Geographic distribution
- Activity heatmaps

### Automated Alerts (Future)

Notifications for:
- Suspicious activity
- Multiple failed logins
- Unusual order patterns
- Rapid registration spikes

## Support

### Common Questions

**Q: How often does data sync?**
A: Instantly when changes occur via Supabase Realtime

**Q: Can I export specific user types only?**
A: Yes, apply the filter first, then export

**Q: What happens when I block a user?**
A: They can't log in or place orders immediately

**Q: Can blocked users be unblocked?**
A: Yes, admins can unblock at any time

**Q: Is there a limit to user list size?**
A: No limit, but search/filter for better performance

### Getting Help

If you encounter issues:
1. Check this guide first
2. Review console for errors
3. Verify admin permissions
4. Test with different filters
5. Try manual refresh

## Summary

The synchronized account system provides:
✅ Real-time user updates
✅ Comprehensive user profiles
✅ Flexible filtering and search
✅ Detailed statistics per user type
✅ Excel export functionality
✅ Block/unblock management
✅ Direct user communication
✅ Location verification
✅ Complete audit trail

All synchronized automatically with visual indicators and no manual intervention required.
