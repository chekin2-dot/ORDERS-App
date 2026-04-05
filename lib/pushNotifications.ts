import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: false,
          allowProvisional: false,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Notifications de nouveaux messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 100, 400, 100, 400],
      lightColor: '#3b82f6',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('messages-urgent', {
      name: 'Messages urgents',
      description: 'Alertes de messages critiques',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
      lightColor: '#ef4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return token;
}

export async function scheduleNotification(title: string, body: string, data?: any) {
  try {
    if (Platform.OS === 'web') {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/assets/images/vespa_moto.png',
            requireInteraction: true,
            silent: false,
          });
        }
      }
      return;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 400, 100, 400, 100, 400],
        badge: 1,
        categoryIdentifier: 'message',
        ...(Platform.OS === 'android' && { channelId: 'messages' }),
      },
      trigger: null,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

export async function dismissAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error dismissing notifications:', error);
  }
}

export async function setBadgeCount(count: number) {
  try {
    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(count);
    }
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}
