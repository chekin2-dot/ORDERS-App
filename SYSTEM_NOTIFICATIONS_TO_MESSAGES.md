# System Notifications to Messages Feature

## Overview
This feature allows users (Clients and Drivers) to view dismissed admin notifications in their Messages page.

## How It Works

### 1. Database Table
- Created `user_notifications` table to track when users dismiss notifications
- Links users to system notifications with dismissal timestamps
- Enables Row Level Security (RLS) for user privacy

### 2. Dismissing Notifications on Home Page
When a user clicks the "X" (close) button on a system notification:
1. The notification is saved to `user_notifications` table with `dismissed_at` timestamp
2. User is automatically navigated to their Messages page
3. The notification appears in the Messages page under "Notifications du système"

### 3. Messages Page Display
Both Client and Driver Messages pages now show:
- **System Notifications Section** (at the top)
  - Displays all dismissed admin notifications
  - Shows title, message, and dismissal date
  - Limited to last 10 notifications
  - Real-time updates when new notifications are dismissed

- **Conversations Section** (below notifications)
  - Existing order conversations with drivers/clients

### 4. User Experience Flow

**For Clients:**
1. See admin notification on home page (Accueil)
2. Click X to dismiss
3. Automatically navigate to Messages tab
4. See the notification saved in Messages

**For Drivers:**
1. See admin notification on home page (Accueil)
2. Click X to dismiss
3. Automatically navigate to Messages tab
4. See the notification saved in Messages

**For Merchants:**
- Notifications can be dismissed on home page
- No Messages tab, so notifications are only dismissed locally
- No navigation occurs

## Technical Implementation

### Files Modified
1. `supabase/migrations/create_user_notifications_table.sql` - New table
2. `components/SystemNotificationBanner.tsx` - Save dismissed notifications
3. `app/(client)/(tabs)/index.tsx` - Navigate to Messages on dismiss
4. `app/(driver)/(tabs)/index.tsx` - Navigate to Messages on dismiss
5. `app/(client)/(tabs)/messages.tsx` - Display system notifications
6. `app/(driver)/(tabs)/messages.tsx` - Display system notifications

### Real-time Subscriptions
- Both Messages pages subscribe to `user_notifications` table changes
- Automatically reload when notifications are dismissed
- Uses Supabase real-time functionality

## Benefits
- Users can review important admin announcements anytime
- Notifications are preserved even after dismissal
- Clear separation between system notifications and order conversations
- Automatic synchronization across devices
