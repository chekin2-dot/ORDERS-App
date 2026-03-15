# Push Notifications Setup Guide

## Overview

The app now supports **full push notifications** that work even when:
- The app is in the background
- The phone screen is locked
- The user is on a different screen
- The app is completely closed (on mobile devices)

## Features

### Notification Behavior

Every new message notification will:
1. **Play sound twice** at maximum volume
2. **Trigger phone vibration** (on mobile devices)
3. **Display a visual notification** both in-app and system-level
4. **Show notification badge** on app icon

### Platforms

- **iOS**: Full support with background notifications
- **Android**: Full support with notification channels
- **Web**: In-app notifications only (no system notifications)

## Technical Implementation

### Files Modified/Created

1. **lib/pushNotifications.ts** (NEW)
   - Handles notification permissions
   - Registers notification channels (Android)
   - Schedules local notifications
   - Manages notification badge counts

2. **components/MessageNotificationService.tsx** (UPDATED)
   - Added expo-notifications integration
   - Sends local notifications for all incoming messages
   - Handles notification tap/click to open conversations
   - Tracks app state (foreground/background)

3. **lib/notificationSound.ts** (UPDATED)
   - Increased volume to maximum (1.0)
   - Plays sound twice with delay
   - Added haptic feedback/vibration

4. **app.json** (UPDATED)
   - Added expo-notifications plugin
   - Configured notification permissions
   - Added background modes for iOS
   - Configured Android notification channels

### Notification Flow

1. **Message Arrives** → Database receives new message via realtime subscription
2. **Check App State** → Determine if app is foreground/background
3. **Send Local Notification** → System notification with sound & vibration
4. **Play In-App Sound** → Additional audio feedback (2x)
5. **Show Visual Banner** → In-app notification banner (if in foreground)
6. **User Taps Notification** → Opens the conversation screen

## Permissions Required

### Android
- `POST_NOTIFICATIONS` - Required for Android 13+ to show notifications

### iOS
- User will be prompted on first launch to allow notifications
- Notifications permission is requested automatically

## Testing

### How to Test Notifications

1. **Background Notifications**
   - Open the app and log in
   - Minimize the app or lock the screen
   - Have someone send you a message
   - You should hear sound (2x), feel vibration, and see system notification

2. **Locked Screen Notifications**
   - Lock your phone
   - Have someone send you a message
   - Phone should light up, vibrate, and show notification on lock screen

3. **In-App Notifications**
   - Stay in the app but navigate away from messages
   - Have someone send you a message
   - You should see in-app banner + system notification

### Troubleshooting

**Notifications not appearing:**
- Check that notification permissions are granted in device settings
- Verify app has been rebuilt after installing expo-notifications
- Check device "Do Not Disturb" mode is off
- Ensure notification channels are enabled (Android Settings → Apps → ORDERS App → Notifications)

**Sound not playing:**
- Check device volume is up
- Verify phone is not in silent mode
- Check notification sound settings in device settings

**Vibration not working:**
- Check device vibration settings
- Verify phone is not in silent mode that disables vibration

## Building for Production

After these changes, you **MUST rebuild** the app:

```bash
# For Android
npm run build:android

# For iOS
npm run build:ios

# For both
npm run build:all
```

**Note:** These changes require native code compilation. Development builds and production builds need to be regenerated.

## Notification Channels (Android)

The app creates a "Messages" notification channel with:
- **Priority**: MAX (most urgent)
- **Sound**: Default system sound
- **Vibration**: Custom pattern [0ms, 250ms, 250ms, 250ms]
- **Light Color**: Blue (#3b82f6)
- **Badge**: Enabled

Users can customize these settings in:
**Settings → Apps → ORDERS App → Notifications → Messages**

## Future Enhancements

Potential improvements:
1. Add notification sounds customization
2. Implement notification grouping for multiple messages
3. Add quick reply from notification (iOS/Android)
4. Implement notification summary/digest mode
5. Add user preferences for notification types
6. Implement notification quiet hours

## Security & Privacy

- Notifications are only sent for authenticated users
- Message content is transmitted securely
- No sensitive data is stored in notification payload
- Users can disable notifications in device settings
- Notifications respect RLS policies from database

## Support

If notifications aren't working properly:
1. Check notification permissions in device settings
2. Verify the app has been rebuilt after changes
3. Test on a physical device (notifications don't work in simulator/emulator for some features)
4. Check device logs for notification errors
5. Verify Supabase realtime connection is active
