# Message Notification System

## Overview

A comprehensive real-time notification system has been implemented to alert clients and drivers of new messages, helping prevent delivery delays.

## Features

### 1. Sound Alerts
- **Platform-specific sound playback**
  - Web: Uses Web Audio API with synthesized notification tone
  - iOS/Android: Uses expo-av with embedded WAV notification sound
- **Volume-controlled** (50% volume to avoid startling users)
- **Automatic cleanup** after playback

### 2. Visual Notifications
- **Prominent banner notifications** at the top of the screen
- **Animated entrance** (slide down with fade)
- **Auto-dismiss** after 8 seconds
- **Manual dismiss** with close button
- **Tap to open conversation** - clicking the notification opens the relevant message thread

### 3. Smart Notification Logic
- **Context-aware**: Only shows notifications when NOT on the conversation screen
- **User filtering**: Only shows messages relevant to the current user (client sees client messages, driver sees driver messages)
- **Sender filtering**: Doesn't show notifications for messages sent by the user themselves
- **Prevents duplicates**: Tracks processed messages to avoid showing the same notification twice

## Components

### `/lib/notificationSound.ts`
Sound playback utility with platform detection:
- `initializeAudio()` - Initializes audio system
- `playNotificationSound()` - Plays notification sound
- `cleanupSound()` - Cleans up sound resources

### `/components/MessageNotificationService.tsx`
Real-time notification service component:
- Subscribes to new messages via Supabase Realtime
- Displays animated notification banners
- Handles navigation to conversations
- Manages notification state

## Integration

The notification service is integrated in:
- **Client app**: `/app/(client)/(tabs)/_layout.tsx`
- **Driver app**: `/app/(driver)/(tabs)/_layout.tsx`

It runs continuously in the background while users navigate through the app.

## Notification Display

When a new message arrives:
1. **Sound plays** immediately
2. **Banner appears** at the top with:
   - Message icon (blue)
   - "Nouveau message" title
   - Sender name and order number
   - Message preview (2 lines max)
   - Close button
3. **User can**:
   - Tap banner to open conversation
   - Dismiss manually with X button
   - Wait 8 seconds for auto-dismiss

## Benefits

### For Clients
- Immediate awareness of driver updates
- Quick access to message threads
- Better communication about delivery status
- Reduced missed messages

### For Drivers
- Instant notification of client requests
- Quick response to delivery instructions
- Better customer service
- Fewer delivery delays

## Technical Details

### Real-time Subscriptions
```typescript
supabase
  .channel(`message_notifications_${profile.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'order_messages',
  }, handleNewMessage)
  .subscribe()
```

### Notification Filtering
- Checks if user is on conversation screen (skip notification)
- Validates message belongs to user's conversation
- Verifies user is not the sender
- Prevents duplicate processing

### Performance
- Lightweight subscription (only INSERT events)
- Minimal re-renders with processed message tracking
- Automatic cleanup on unmount
- Efficient animation with useNativeDriver

## Testing

To test the notification system:

1. **Open two browser tabs**
   - Tab 1: Login as a client
   - Tab 2: Login as the assigned driver

2. **Create an order** in Tab 1 (client)

3. **Have driver accept** the order in Tab 2

4. **Navigate away from messages** in both tabs (go to Home or Profile)

5. **Send a message** from one tab

6. **Observe in the other tab**:
   - Sound plays
   - Notification banner appears
   - Click banner to open conversation

## Future Enhancements

Possible improvements:
- Push notifications when app is in background
- Customizable sound/volume settings
- Do Not Disturb mode
- Notification history
- Different sounds for different event types
- Vibration on mobile devices
